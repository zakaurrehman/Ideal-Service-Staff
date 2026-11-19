/**
 * In-app notifications + matching emails, honouring each user's preferences.
 * Account/security messages are always emailed regardless of preferences.
 */
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { Queryable } from "./db/client";
import { notificationPreferences, notifications, rolePermissions, roles, userProfiles, userRoles, users } from "./db/schema";
import { sendEmail } from "./email/send";
import type { TemplateKey } from "./email/templates";
import type { Permission } from "./auth/permissions";
import { SITE_URL } from "../content/site";

export const NOTIFICATION_CATEGORIES = [
  { key: "bookings", label: "Bookings & assignments", description: "Booking requests, confirmations, changes and assignments." },
  { key: "applications", label: "Applications & verification", description: "Job application and verification updates." },
  { key: "support", label: "Support", description: "Replies to your support conversations." },
  { key: "announcements", label: "Announcements", description: "Occasional updates from the Ideal Service Staff team." },
  { key: "staff", label: "Staff alerts", description: "New bookings, applications and messages (staff only)." },
] as const;
const ALWAYS_EMAIL = new Set(["account"]);

export const absolute = (path: string) => (path.startsWith("http") ? path : `${SITE_URL}${path}`);

type NotifyInput = {
  userIds: string[];
  category: string;
  title: string;
  body?: string;
  href?: string;
  email?: { template: TemplateKey; vars?: Record<string, string> };
};

export async function notify(db: Queryable, input: NotifyInput) {
  const ids = [...new Set(input.userIds)].filter(Boolean);
  if (!ids.length) return;
  const recipients = await db
    .select({ id: users.id, email: users.email, status: users.status, firstName: userProfiles.firstName })
    .from(users)
    .leftJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(inArray(users.id, ids));
  const prefs = await db
    .select()
    .from(notificationPreferences)
    .where(and(inArray(notificationPreferences.userId, ids), eq(notificationPreferences.category, input.category)));
  const pref = new Map(prefs.map((p) => [p.userId, p]));

  for (const r of recipients) {
    if (r.status !== "active") continue;
    const p = pref.get(r.id);
    if (p?.inAppEnabled !== false) {
      await db.insert(notifications).values({ userId: r.id, category: input.category, title: input.title, body: input.body ?? "", href: input.href ?? null });
    }
    if (input.email && (ALWAYS_EMAIL.has(input.category) || p?.emailEnabled !== false)) {
      await sendEmail(db, {
        to: r.email,
        userId: r.id,
        template: input.email.template,
        vars: { firstName: r.firstName || "there", url: input.href ? absolute(input.href) : SITE_URL, ...input.email.vars },
      });
    }
  }
}

/** Staff members holding a permission (Super Admins always included). */
export async function staffWith(db: Queryable, permission: Permission) {
  const rows = await db
    .selectDistinct({ id: users.id })
    .from(users)
    .innerJoin(userRoles, eq(userRoles.userId, users.id))
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .where(and(eq(users.status, "active"), or(eq(roles.key, "super_admin"), eq(rolePermissions.permissionKey, permission))));
  return rows.map((r) => r.id);
}

export async function notifyStaff(db: Queryable, permission: Permission, n: { title: string; body: string; href: string }) {
  const ids = await staffWith(db, permission);
  await notify(db, { userIds: ids, category: "staff", title: n.title, body: n.body, href: n.href, email: { template: "staff.alert", vars: { title: n.title, body: n.body } } });
}

export async function unreadCount(db: Queryable, userId: string) {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r?.n ?? 0;
}
