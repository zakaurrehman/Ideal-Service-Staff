"use server";

/** Account actions shared by every signed-in role (profile, photo, notifications, support). */
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb, t } from "@/lib/db";
import { echo, fdString, zodFields, type ActionState } from "@/lib/action-state";
import { requireViewer } from "@/lib/auth/session";
import { SUPPORT_CATEGORIES } from "@/lib/labels";
import { makeReference } from "@/lib/booking/service";
import { NOTIFICATION_CATEGORIES, notify, notifyStaff } from "@/lib/notify";
import { sendEmail } from "@/lib/email/send";
import { audit } from "@/lib/settings";
import { UploadError, deleteStoredFile, storeFile } from "@/lib/storage";
import { profileSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/auth/core";

const areaBase = (area: string | null) => (area === "admin" ? "/admin" : area === "employee" ? "/employee" : "/customer");

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireViewer();
  const parsed = profileSchema.safeParse({ firstName: fd.get("firstName"), lastName: fd.get("lastName"), phone: fd.get("phone") ?? "" });
  if (!parsed.success) return { error: "Please check the highlighted fields.", fields: zodFields(parsed.error), values: echo(fd) };
  const db = await getDb();
  await db.update(t.userProfiles).set(parsed.data).where(eq(t.userProfiles.userId, v.id));
  revalidatePath(areaBase(v.area), "layout");
  return { ok: true, message: "Profile saved." };
}

export async function uploadAvatarAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireViewer();
  const db = await getDb();
  if (!(await rateLimit(db, `upload:${v.id}`, 30, 3600)).ok) return { error: "Too many uploads — please try again later." };
  try {
    const file = await storeFile(db, fd.get("photo") as File, { purpose: "avatar", ownerUserId: v.id, rule: "image" });
    const [old] = await db.select({ id: t.userProfiles.avatarFileId }).from(t.userProfiles).where(eq(t.userProfiles.userId, v.id));
    await db.update(t.userProfiles).set({ avatarFileId: file.id }).where(eq(t.userProfiles.userId, v.id));
    if (old?.id) await deleteStoredFile(db, old.id);
  } catch (err) {
    if (err instanceof UploadError) return { fields: { photo: err.message } };
    throw err;
  }
  revalidatePath(areaBase(v.area), "layout");
  return { ok: true, message: "Photo updated." };
}

export async function removeAvatarAction() {
  const v = await requireViewer();
  const db = await getDb();
  const [old] = await db.select({ id: t.userProfiles.avatarFileId }).from(t.userProfiles).where(eq(t.userProfiles.userId, v.id));
  await db.update(t.userProfiles).set({ avatarFileId: null }).where(eq(t.userProfiles.userId, v.id));
  if (old?.id) await deleteStoredFile(db, old.id);
  revalidatePath(areaBase(v.area), "layout");
}

/* ── Notifications ─────────────────────────────────────────────────────── */

export async function markNotificationReadAction(id: string) {
  const v = await requireViewer();
  const db = await getDb();
  await db.update(t.notifications).set({ readAt: new Date() }).where(and(eq(t.notifications.id, id), eq(t.notifications.userId, v.id)));
  revalidatePath(areaBase(v.area), "layout");
}

export async function markAllNotificationsReadAction() {
  const v = await requireViewer();
  const db = await getDb();
  await db.update(t.notifications).set({ readAt: new Date() }).where(and(eq(t.notifications.userId, v.id), isNull(t.notifications.readAt)));
  revalidatePath(areaBase(v.area), "layout");
}

export async function savePreferencesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireViewer();
  const db = await getDb();
  const cats = NOTIFICATION_CATEGORIES.filter((c) => c.key !== "staff" || v.isStaff);
  for (const c of cats) {
    const values = { userId: v.id, category: c.key, emailEnabled: fd.get(`email:${c.key}`) === "on", inAppEnabled: fd.get(`inapp:${c.key}`) === "on" };
    await db
      .insert(t.notificationPreferences)
      .values(values)
      .onConflictDoUpdate({ target: [t.notificationPreferences.userId, t.notificationPreferences.category], set: { emailEnabled: values.emailEnabled, inAppEnabled: values.inAppEnabled } });
  }
  return { ok: true, message: "Notification preferences saved. Security emails (sign-in, password) are always sent." };
}

/* ── Support conversations ─────────────────────────────────────────────── */

const CATEGORIES: string[] = SUPPORT_CATEGORIES;

export async function createSupportThreadAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireViewer();
  const subject = fdString(fd, "subject");
  const body = fdString(fd, "body");
  const category = fdString(fd, "category");
  const fields: Record<string, string> = {};
  if (subject.length < 3 || subject.length > 150) fields.subject = "Add a short subject (3–150 characters).";
  if (body.length < 10 || body.length > 5000) fields.body = "Describe how we can help (10–5,000 characters).";
  if (!CATEGORIES.includes(category)) fields.category = "Choose a topic.";
  if (Object.keys(fields).length) return { error: "Please complete the form.", fields, values: echo(fd) };
  const db = await getDb();
  if (!(await rateLimit(db, `support:${v.id}`, 10, 3600)).ok) return { error: "You’ve sent several messages recently — please wait a little or call us." };
  const reference = makeReference("SUP");
  const [thread] = await db
    .insert(t.supportMessages)
    .values({ reference, userId: v.id, authorId: v.id, name: `${v.firstName} ${v.lastName}`, email: v.email, subject, category, body, status: "open" })
    .returning();
  await sendEmail(db, { to: v.email, userId: v.id, template: "support.received", vars: { firstName: v.firstName, reference, subject } });
  await notifyStaff(db, "support.manage", { title: `New support message ${reference}`, body: `${v.firstName} ${v.lastName}: ${subject}`, href: `/admin/support/${thread.id}/` });
  revalidatePath(`${areaBase(v.area)}/support/`);
  return { ok: true, message: `Message sent (reference ${reference}). We’ll reply here and by email.`, data: { id: thread.id } };
}

export async function replySupportAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireViewer();
  const threadId = fdString(fd, "threadId");
  const body = fdString(fd, "body");
  if (body.length < 2 || body.length > 5000) return { fields: { body: "Write a reply (up to 5,000 characters)." } };
  const db = await getDb();
  const [thread] = await db.select().from(t.supportMessages).where(and(eq(t.supportMessages.id, threadId), isNull(t.supportMessages.parentId)));
  const staff = v.permissions.has("support.manage");
  if (!thread || (!staff && thread.userId !== v.id)) return { error: "Conversation not found." };
  if (thread.status === "closed" && !staff) return { error: "This conversation is closed. Start a new one if you need more help." };
  await db.insert(t.supportMessages).values({ parentId: thread.id, userId: thread.userId, authorId: v.id, isStaff: staff && thread.userId !== v.id, body });
  await db
    .update(t.supportMessages)
    .set({ lastActivityAt: new Date(), status: staff && thread.userId !== v.id ? "in_progress" : thread.status === "resolved" ? "open" : thread.status })
    .where(eq(t.supportMessages.id, thread.id));
  if (staff && thread.userId && thread.userId !== v.id) {
    const roles = await db
      .select({ key: t.roles.key })
      .from(t.userRoles)
      .innerJoin(t.roles, eq(t.roles.id, t.userRoles.roleId))
      .where(eq(t.userRoles.userId, thread.userId));
    const base = roles.some((r) => r.key === "employee") ? "/employee" : "/customer";
    {
      await notify(db, {
        userIds: [thread.userId],
        category: "support",
        title: `Reply from our team: ${thread.subject}`,
        body: body.slice(0, 140),
        href: `${base}/support/${thread.id}/`,
        email: { template: "support.reply", vars: { reference: thread.reference ?? "", subject: thread.subject ?? "" } },
      });
    }
  } else if (!staff) {
    await notifyStaff(db, "support.manage", { title: `Reply on ${thread.reference}`, body: `${v.firstName}: ${body.slice(0, 120)}`, href: `/admin/support/${thread.id}/` });
  }
  revalidatePath(`${areaBase(v.area)}/support/${thread.id}/`);
  return { ok: true, message: "Reply sent." };
}

export async function setSupportStatusAction(threadId: string, status: "open" | "in_progress" | "resolved" | "closed") {
  const v = await requireViewer();
  const db = await getDb();
  const [thread] = await db.select().from(t.supportMessages).where(and(eq(t.supportMessages.id, threadId), isNull(t.supportMessages.parentId)));
  const staff = v.permissions.has("support.manage");
  if (!thread || (!staff && thread.userId !== v.id)) return;
  if (!staff && !["resolved", "open"].includes(status)) return;
  await db.update(t.supportMessages).set({ status, lastActivityAt: new Date() }).where(eq(t.supportMessages.id, thread.id));
  if (staff) await audit(db, { actorId: v.id, action: "support.status", entityType: "support", entityId: thread.id, summary: `${thread.reference} → ${status}` });
  revalidatePath(`${areaBase(v.area)}/support/`, "layout");
}

export async function clearReadNotificationsAction() {
  const v = await requireViewer();
  const db = await getDb();
  await db.delete(t.notifications).where(and(eq(t.notifications.userId, v.id), isNotNull(t.notifications.readAt)));
  revalidatePath(areaBase(v.area), "layout");
}
