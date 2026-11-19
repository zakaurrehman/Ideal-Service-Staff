/**
 * Authentication core (database-injected, framework-free → unit-testable).
 * Session tokens: 256-bit random, sent to the browser once, stored only as
 * SHA-256 hashes. One-time tokens (reset / verification) work the same way.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import type { Queryable } from "../db/client";
import { emailVerificationTokens, passwordResetTokens, rolePermissions, roles, userProfiles, userRoles, userSessions, users } from "../db/schema";
import { PERMISSIONS, type Permission } from "./permissions";

export const SESSION_TTL_PERSISTENT_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_TTL_BROWSER_MS = 12 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;
export const INVITE_TTL_MS = 72 * 60 * 60 * 1000;
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export const generateToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/* ── Users ──────────────────────────────────────────────────────────────── */

export async function findUserByEmail(db: Queryable, email: string) {
  const [u] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalizeEmail(email)}`)
    .limit(1);
  return u ?? null;
}

/* ── Sessions ───────────────────────────────────────────────────────────── */

export async function createSession(db: Queryable, userId: string, opts: { persistent: boolean; ip?: string | null; userAgent?: string | null }) {
  const token = generateToken();
  const ttl = opts.persistent ? SESSION_TTL_PERSISTENT_MS : SESSION_TTL_BROWSER_MS;
  const expiresAt = new Date(Date.now() + ttl);
  await db.insert(userSessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    persistent: opts.persistent,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent?.slice(0, 300) ?? null,
  });
  return { token, expiresAt };
}

export type SessionUser = {
  sessionId: string;
  id: string;
  email: string;
  status: "active" | "suspended" | "disabled";
  emailVerifiedAt: Date | null;
  firstName: string;
  lastName: string;
  avatarFileId: string | null;
};

/** Validates a raw cookie token. Expired, revoked or suspended → null. Extends sliding expiry. */
export async function validateSessionToken(db: Queryable, token: string): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  const id = hashToken(token);
  const [row] = await db
    .select({
      sessionId: userSessions.id,
      expiresAt: userSessions.expiresAt,
      persistent: userSessions.persistent,
      lastSeenAt: userSessions.lastSeenAt,
      id: users.id,
      email: users.email,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      firstName: userProfiles.firstName,
      lastName: userProfiles.lastName,
      avatarFileId: userProfiles.avatarFileId,
    })
    .from(userSessions)
    .innerJoin(users, eq(users.id, userSessions.userId))
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(eq(userSessions.id, id))
    .limit(1);
  if (!row) return null;
  const now = Date.now();
  if (row.expiresAt.getTime() <= now) {
    await db.delete(userSessions).where(eq(userSessions.id, id));
    return null;
  }
  if (row.status !== "active") return null;

  const ttl = row.persistent ? SESSION_TTL_PERSISTENT_MS : SESSION_TTL_BROWSER_MS;
  const renew = row.expiresAt.getTime() - now < ttl / 2;
  if (renew || now - row.lastSeenAt.getTime() > 5 * 60 * 1000) {
    await db
      .update(userSessions)
      .set({ lastSeenAt: new Date(), ...(renew ? { expiresAt: new Date(now + ttl) } : {}) })
      .where(eq(userSessions.id, id));
  }
  return {
    sessionId: row.sessionId,
    id: row.id,
    email: row.email,
    status: row.status,
    emailVerifiedAt: row.emailVerifiedAt,
    firstName: row.firstName ?? "",
    lastName: row.lastName ?? "",
    avatarFileId: row.avatarFileId ?? null,
  };
}

export async function invalidateSession(db: Queryable, sessionId: string) {
  await db.delete(userSessions).where(eq(userSessions.id, sessionId));
}

/** Revoke every session for a user (optionally keeping the current one). */
export async function invalidateUserSessions(db: Queryable, userId: string, exceptSessionId?: string) {
  await db
    .delete(userSessions)
    .where(exceptSessionId ? and(eq(userSessions.userId, userId), sql`${userSessions.id} <> ${exceptSessionId}`) : eq(userSessions.userId, userId));
}

export async function purgeExpiredSessions(db: Queryable) {
  await db.delete(userSessions).where(lt(userSessions.expiresAt, new Date()));
}

/* ── Roles & permissions ────────────────────────────────────────────────── */

export type Access = { roles: string[]; permissions: Set<Permission>; isSuperAdmin: boolean; isStaff: boolean };

export async function loadAccess(db: Queryable, userId: string): Promise<Access> {
  const rows = await db
    .select({ key: roles.key, isStaff: roles.isStaff, permission: rolePermissions.permissionKey })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  const roleKeys = [...new Set(rows.map((r) => r.key))];
  const isSuperAdmin = roleKeys.includes("super_admin");
  const permissions = new Set<Permission>(
    isSuperAdmin ? PERMISSIONS.map((p) => p.key) : (rows.map((r) => r.permission).filter(Boolean) as Permission[]),
  );
  return { roles: roleKeys, permissions, isSuperAdmin, isStaff: rows.some((r) => r.isStaff) };
}

export async function assignRole(db: Queryable, userId: string, roleKey: string, assignedBy?: string | null) {
  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, roleKey));
  if (!role) throw new Error(`Unknown role ${roleKey}`);
  await db.insert(userRoles).values({ userId, roleId: role.id, assignedBy: assignedBy ?? null }).onConflictDoNothing();
}

/* ── One-time tokens ────────────────────────────────────────────────────── */

export async function createPasswordResetToken(db: Queryable, userId: string, ttlMs = RESET_TTL_MS) {
  // Only the newest link works.
  await db.delete(passwordResetTokens).where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  const token = generateToken();
  await db.insert(passwordResetTokens).values({ id: hashToken(token), userId, expiresAt: new Date(Date.now() + ttlMs) });
  return token;
}

/** Atomically marks the token used; returns the user id or null when invalid / expired / reused. */
export async function consumePasswordResetToken(db: Queryable, token: string) {
  const [row] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.id, hashToken(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())))
    .returning({ userId: passwordResetTokens.userId });
  return row?.userId ?? null;
}

export async function peekPasswordResetToken(db: Queryable, token: string) {
  const [row] = await db
    .select({ userId: passwordResetTokens.userId })
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.id, hashToken(token)), isNull(passwordResetTokens.usedAt), gt(passwordResetTokens.expiresAt, new Date())));
  return row?.userId ?? null;
}

export async function createEmailVerificationToken(db: Queryable, userId: string, email: string) {
  await db.delete(emailVerificationTokens).where(and(eq(emailVerificationTokens.userId, userId), isNull(emailVerificationTokens.usedAt)));
  const token = generateToken();
  await db.insert(emailVerificationTokens).values({ id: hashToken(token), userId, email: normalizeEmail(email), expiresAt: new Date(Date.now() + VERIFY_TTL_MS) });
  return token;
}

export async function consumeEmailVerificationToken(db: Queryable, token: string) {
  const [row] = await db
    .update(emailVerificationTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(emailVerificationTokens.id, hashToken(token)), isNull(emailVerificationTokens.usedAt), gt(emailVerificationTokens.expiresAt, new Date())))
    .returning({ userId: emailVerificationTokens.userId, email: emailVerificationTokens.email });
  if (!row) return null;
  // Only verify if the account still has the email the link was sent to.
  const [u] = await db
    .update(users)
    .set({ emailVerifiedAt: new Date() })
    .where(and(eq(users.id, row.userId), sql`lower(${users.email}) = ${row.email}`))
    .returning({ id: users.id });
  return u?.id ?? null;
}

/* ── Rate limiting (fixed window, shared via the database) ──────────────── */

export async function rateLimit(db: Queryable, key: string, limit: number, windowSec: number) {
  const res = await db.execute<{ count: number; retry: number }>(sql`
    INSERT INTO rate_limits (key, count, window_start) VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN 1 ELSE rate_limits.count + 1 END,
      window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => ${windowSec}) THEN now() ELSE rate_limits.window_start END
    RETURNING count, GREATEST(1, ceil(extract(epoch FROM (window_start + make_interval(secs => ${windowSec}) - now()))))::int AS retry`);
  const row = (res as unknown as { rows: { count: number; retry: number }[] }).rows[0];
  return { ok: row.count <= limit, count: row.count, retryAfterSec: row.retry };
}
