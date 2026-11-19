"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, t } from "@/lib/db";
import { echo, fdString, zodFields, type ActionState } from "@/lib/action-state";
import { registerSchema, emailField } from "@/lib/validation";
import { sendEmail } from "@/lib/email/send";
import { absolute, notifyStaff } from "@/lib/notify";
import { audit } from "@/lib/settings";
import {
  LOCKOUT_MS,
  LOCKOUT_THRESHOLD,
  assignRole,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  createSession,
  findUserByEmail,
  invalidateSession,
  invalidateUserSessions,
  loadAccess,
  peekPasswordResetToken,
  rateLimit,
} from "./core";
import { hashPassword, passwordProblem, verifyPassword } from "./password";
import { clearSessionCookie, getViewer, homePath, requestMeta, requireViewer, safeNext, setSessionCookie } from "./session";

const GENERIC_LOGIN_ERROR = "That email and password combination is incorrect.";

/* ── Sign in ───────────────────────────────────────────────────────────── */

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = fdString(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const persistent = fd.get("remember") === "on";
  const next = safeNext(fd.get("next"));
  const values = { email, next };
  if (!email || !password) return { error: "Enter your email and password.", values };

  const db = await getDb();
  const { ip, userAgent } = await requestMeta();
  const byIp = await rateLimit(db, `login:ip:${ip ?? "unknown"}`, 30, 15 * 60);
  const byEmail = await rateLimit(db, `login:email:${email}`, 10, 15 * 60);
  if (!byIp.ok || !byEmail.ok) {
    return { error: `Too many sign-in attempts. Please wait ${Math.ceil(Math.max(byIp.retryAfterSec, byEmail.retryAfterSec) / 60)} minutes or reset your password.`, values };
  }

  const user = await findUserByEmail(db, email);
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    await verifyPassword(null, password); // equal timing
    return { error: "This account is temporarily locked after several failed attempts. Try again in 15 minutes or reset your password.", values };
  }
  const valid = await verifyPassword(user?.passwordHash, password);
  if (!user || !valid) {
    if (user) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= LOCKOUT_THRESHOLD;
      await db
        .update(t.users)
        .set({ failedLoginCount: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCKOUT_MS) : user.lockedUntil })
        .where(eq(t.users.id, user.id));
      if (lock) await audit(db, { actorId: user.id, action: "auth.locked", entityType: "user", entityId: user.id, summary: `Account locked after ${LOCKOUT_THRESHOLD} failed sign-ins`, ip });
    }
    return { error: GENERIC_LOGIN_ERROR, values };
  }
  if (user.status !== "active") {
    return { error: "This account is not active. Please contact us at (310) 462-1700 for help.", values };
  }

  await db.update(t.users).set({ failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(t.users.id, user.id));
  const session = await createSession(db, user.id, { persistent, ip, userAgent });
  await setSessionCookie(session.token, session.expiresAt, persistent);
  await audit(db, { actorId: user.id, action: "auth.login", entityType: "user", entityId: user.id, summary: "Signed in", ip });

  const access = await loadAccess(db, user.id);
  const area = access.isStaff ? "admin" : access.roles.includes("employee") ? "employee" : access.roles.includes("customer") ? "customer" : null;
  const home = homePath({ area });
  const allowed = next && (next.startsWith(home) || (area === "admin" && next.startsWith("/admin/")) || !/^\/(admin|customer|employee)\//.test(next));
  redirect(allowed ? next : home);
}

/* ── Registration (customer & employee) ────────────────────────────────── */

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const values = echo(fd);
  const parsed = registerSchema.safeParse({
    accountType: fd.get("accountType"),
    firstName: fd.get("firstName"),
    lastName: fd.get("lastName"),
    email: fd.get("email"),
    phone: fd.get("phone"),
    password: fd.get("password"),
    confirmPassword: fd.get("confirmPassword"),
    city: fd.get("city") ?? "",
    terms: fd.get("terms") === "on",
  });
  if (!parsed.success) return { error: "Please correct the highlighted fields.", fields: zodFields(parsed.error), values };
  const d = parsed.data;
  const weak = passwordProblem(d.password, { email: d.email, name: d.firstName });
  if (weak) return { error: "Please choose a stronger password.", fields: { password: weak }, values };

  const db = await getDb();
  const { ip, userAgent } = await requestMeta();
  const limit = await rateLimit(db, `register:ip:${ip ?? "unknown"}`, 8, 60 * 60);
  if (!limit.ok) return { error: "Too many accounts were created from this connection. Please try again later or call us.", values };

  if (await findUserByEmail(db, d.email)) {
    return {
      error: "An account with this email already exists.",
      fields: { email: "This email is already registered — sign in or reset your password instead." },
      values,
    };
  }

  const passwordHash = await hashPassword(d.password);
  let userId: string;
  try {
    userId = await db.transaction(async (tx) => {
      const [u] = await tx.insert(t.users).values({ email: d.email, passwordHash, passwordChangedAt: new Date() }).returning({ id: t.users.id });
      await tx.insert(t.userProfiles).values({ userId: u.id, firstName: d.firstName, lastName: d.lastName, phone: d.phone });
      if (d.accountType === "customer") {
        await tx.insert(t.customerProfiles).values({ userId: u.id });
      } else {
        await tx.insert(t.employeeProfiles).values({ userId: u.id, city: d.city });
        // Link earlier job applications made with the same email.
        await tx
          .update(t.jobApplications)
          .set({ userId: u.id })
          .where(and(sql`lower(${t.jobApplications.email}) = ${d.email}`, isNull(t.jobApplications.userId)));
      }
      await assignRole(tx, u.id, d.accountType);
      return u.id;
    });
  } catch (err) {
    if (String((err as { cause?: { code?: string } }).cause?.code) === "23505") {
      return { error: "An account with this email already exists.", fields: { email: "This email is already registered." }, values };
    }
    throw err;
  }

  const token = await createEmailVerificationToken(db, userId, d.email);
  await sendEmail(db, { to: d.email, userId, template: "auth.verify_email", vars: { firstName: d.firstName, url: absolute(`/verify-email/?token=${token}`) } });
  await audit(db, { actorId: userId, action: "auth.register", entityType: "user", entityId: userId, summary: `Registered as ${d.accountType}`, ip });
  if (d.accountType === "employee") {
    await notifyStaff(db, "employees.verify", {
      title: "New care professional registration",
      body: `${d.firstName} ${d.lastName} created an employee account and is awaiting verification.`,
      href: `/admin/employees/${userId}/`,
    });
  }

  const session = await createSession(db, userId, { persistent: false, ip, userAgent });
  await setSessionCookie(session.token, session.expiresAt, false);
  redirect(d.accountType === "customer" ? "/customer/dashboard/?welcome=1" : "/employee/dashboard/?welcome=1");
}

/* ── Sign out ──────────────────────────────────────────────────────────── */

export async function logoutAction() {
  const v = await getViewer();
  if (v) {
    const db = await getDb();
    await invalidateSession(db, v.sessionId);
    await audit(db, { actorId: v.id, action: "auth.logout", entityType: "user", entityId: v.id, summary: "Signed out" });
  }
  await clearSessionCookie();
  redirect("/sign-in/?signed_out=1");
}

/* ── Forgot / reset password ───────────────────────────────────────────── */

const RESET_SENT = "If an account exists for that email, we’ve sent a link to reset the password. It expires in 1 hour.";

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = emailField.safeParse(fd.get("email"));
  if (!parsed.success) return { fields: { email: "Enter a valid email address." }, values: echo(fd) };
  const email = parsed.data;
  const db = await getDb();
  const { ip } = await requestMeta();
  const a = await rateLimit(db, `reset:ip:${ip ?? "unknown"}`, 10, 60 * 60);
  const b = await rateLimit(db, `reset:email:${email}`, 3, 60 * 60);
  if (a.ok && b.ok) {
    const user = await findUserByEmail(db, email);
    if (user && user.status === "active") {
      const token = await createPasswordResetToken(db, user.id);
      const [p] = await db.select({ firstName: t.userProfiles.firstName }).from(t.userProfiles).where(eq(t.userProfiles.userId, user.id));
      await sendEmail(db, { to: user.email, userId: user.id, template: "auth.password_reset", vars: { firstName: p?.firstName ?? "there", url: absolute(`/reset-password/?token=${token}`) } });
      await audit(db, { actorId: user.id, action: "auth.reset_requested", entityType: "user", entityId: user.id, summary: "Password reset requested", ip });
    }
  }
  // Same answer whether or not the account exists (no account enumeration).
  return { ok: true, message: RESET_SENT };
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password !== String(fd.get("confirmPassword") ?? "")) return { fields: { confirmPassword: "Passwords don’t match." } };
  const db = await getDb();
  const { ip } = await requestMeta();
  if (!(await rateLimit(db, `reset-submit:ip:${ip ?? "unknown"}`, 20, 60 * 60)).ok) return { error: "Too many attempts. Please try again later." };

  const peekId = await peekPasswordResetToken(db, token);
  if (!peekId) return { error: "This reset link is invalid, expired or already used. Request a new one." };
  const [u] = await db.select().from(t.users).where(eq(t.users.id, peekId));
  const weak = passwordProblem(password, { email: u.email });
  if (weak) return { fields: { password: weak } };
  const passwordHash = await hashPassword(password);
  const userId = await db.transaction(async (tx) => {
    const id = await consumePasswordResetToken(tx, token); // atomic single use
    if (!id) return null;
    await tx
      .update(t.users)
      .set({ passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null, emailVerifiedAt: u.emailVerifiedAt ?? new Date() })
      .where(eq(t.users.id, id));
    await invalidateUserSessions(tx, id);
    return id;
  });
  if (!userId) return { error: "This reset link is invalid, expired or already used. Request a new one." };
  await audit(db, { actorId: userId, action: "auth.password_reset", entityType: "user", entityId: userId, summary: "Password reset via email link; all sessions revoked", ip });
  redirect("/sign-in/?reset=1");
}

/* ── Email verification ────────────────────────────────────────────────── */

export async function resendVerificationAction(): Promise<ActionState> {
  const v = await requireViewer();
  if (v.emailVerifiedAt) return { ok: true, message: "Your email is already confirmed." };
  const db = await getDb();
  if (!(await rateLimit(db, `verify-resend:${v.id}`, 3, 60 * 60)).ok) return { error: "We’ve sent several emails already — please check your inbox and spam folder, or try again in an hour." };
  const token = await createEmailVerificationToken(db, v.id, v.email);
  await sendEmail(db, { to: v.email, userId: v.id, template: "auth.verify_email", vars: { firstName: v.firstName, url: absolute(`/verify-email/?token=${token}`) } });
  return { ok: true, message: `We’ve sent a new confirmation link to ${v.email}.` };
}

/* ── Account security (signed in) ──────────────────────────────────────── */

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireViewer();
  const current = String(fd.get("currentPassword") ?? "");
  const next = String(fd.get("newPassword") ?? "");
  if (next !== String(fd.get("confirmPassword") ?? "")) return { fields: { confirmPassword: "Passwords don’t match." } };
  const db = await getDb();
  if (!(await rateLimit(db, `pwchange:${v.id}`, 10, 60 * 60)).ok) return { error: "Too many attempts. Please try again later." };
  const [u] = await db.select().from(t.users).where(eq(t.users.id, v.id));
  if (!(await verifyPassword(u.passwordHash, current))) return { fields: { currentPassword: "Your current password is incorrect." } };
  const weak = passwordProblem(next, { email: u.email });
  if (weak) return { fields: { newPassword: weak } };
  await db.update(t.users).set({ passwordHash: await hashPassword(next), passwordChangedAt: new Date() }).where(eq(t.users.id, v.id));
  await invalidateUserSessions(db, v.id, v.sessionId);
  const { ip } = await requestMeta();
  await audit(db, { actorId: v.id, action: "auth.password_changed", entityType: "user", entityId: v.id, summary: "Password changed; other sessions revoked", ip });
  await sendEmail(db, { to: u.email, userId: v.id, template: "auth.password_changed", vars: { firstName: v.firstName } });
  return { ok: true, message: "Password updated. You’ve been signed out everywhere else." };
}

export async function revokeSessionAction(sessionId: string) {
  const v = await requireViewer();
  const db = await getDb();
  await db.delete(t.userSessions).where(and(eq(t.userSessions.id, sessionId), eq(t.userSessions.userId, v.id)));
  if (sessionId === v.sessionId) {
    await clearSessionCookie();
    redirect("/sign-in/");
  }
}

export async function revokeOtherSessionsAction() {
  const v = await requireViewer();
  const db = await getDb();
  await invalidateUserSessions(db, v.id, v.sessionId);
}
