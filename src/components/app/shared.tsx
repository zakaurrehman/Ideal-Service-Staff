import Link from "next/link";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { Bell, BellOff, Inbox, LifeBuoy, MessageSquare, Monitor, ShieldCheck } from "lucide-react";
import { getDb, t } from "@/lib/db";
import type { Viewer } from "@/lib/auth/session";
import { changePasswordAction, revokeOtherSessionsAction, revokeSessionAction } from "@/lib/auth/actions";
import {
  clearReadNotificationsAction,
  createSupportThreadAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  removeAvatarAction,
  replySupportAction,
  savePreferencesAction,
  setSupportStatusAction,
  updateProfileAction,
  uploadAvatarAction,
} from "@/lib/actions/account";
import { NOTIFICATION_CATEGORIES } from "@/lib/notify";
import { SUPPORT_CATEGORIES } from "@/lib/labels";
import { fmtDateTime, timeAgo } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ActionButton, ActionForm, Checkbox, Field, FormMessage, PasswordField, Select, Submit, TextArea } from "./forms";
import { Avatar } from "./AppShell";
import { Card, EmptyState, PageHeader, Pagination, StatusBadge, pageOf, type Search } from "./ui";

const TZ = "America/Los_Angeles";

/* ── Notifications ─────────────────────────────────────────────────────── */

export async function NotificationsView({ viewer, base, search }: { viewer: Viewer; base: string; search: Search }) {
  const db = await getDb();
  const page = pageOf(search);
  const size = 20;
  const where = eq(t.notifications.userId, viewer.id);
  const [rows, [{ n }], [{ unread }]] = await Promise.all([
    db.select().from(t.notifications).where(where).orderBy(desc(t.notifications.createdAt)).limit(size).offset((page - 1) * size),
    db.select({ n: count() }).from(t.notifications).where(where),
    db.select({ unread: count() }).from(t.notifications).where(and(where, isNull(t.notifications.readAt))),
  ]);
  return (
    <>
      <PageHeader
        title="Notifications"
        description={unread ? `${unread} unread` : "You’re all caught up."}
        actions={
          <>
            {unread > 0 && <ActionButton action={markAllNotificationsReadAction}>Mark all as read</ActionButton>}
            {n > unread && <ActionButton action={clearReadNotificationsAction} variant="ghost" confirm={{ title: "Clear read notifications?", body: "Read notifications will be removed from this list.", cta: "Clear" }}>Clear read</ActionButton>}
          </>
        }
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState icon={<BellOff className="size-6" />} title="No notifications yet" description="Updates about your bookings, account and messages will appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r, i) => (
              <li key={r.id} className={cn("enter flex items-start gap-4 px-6 py-4", !r.readAt && "bg-teal-50/40")} style={{ ["--d" as string]: `${Math.min(i, 10) * 0.03}s` }}>
                <span className={cn("mt-1 grid size-9 shrink-0 place-items-center rounded-xl", r.readAt ? "bg-canvas text-muted" : "bg-teal-100 text-teal-800")}>
                  <Bell aria-hidden className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm text-navy-950", !r.readAt && "font-semibold")}>
                    {r.href ? (
                      <Link href={r.href} className="hover:underline">
                        {r.title}
                      </Link>
                    ) : (
                      r.title
                    )}
                  </p>
                  {r.body && <p className="mt-0.5 text-sm text-muted">{r.body}</p>}
                  <p className="mt-1 text-xs text-muted">{timeAgo(r.createdAt)}</p>
                </div>
                {!r.readAt && (
                  <ActionButton action={markNotificationReadAction.bind(null, r.id)} variant="ghost">
                    Mark read
                  </ActionButton>
                )}
              </li>
            ))}
          </ul>
        )}
        <Pagination base={base} search={search} page={page} pageSize={size} total={n} />
      </Card>
    </>
  );
}

/* ── Profile basics + photo ────────────────────────────────────────────── */

export async function ProfileBasics({ viewer, phone }: { viewer: Viewer; phone: string | null }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card title="Personal details" description="Used on your bookings and by our team to contact you.">
        <ActionForm action={updateProfileAction} className="grid gap-5 sm:grid-cols-2">
          <FormMessage className="sm:col-span-2" />
          <Field name="firstName" label="First name" defaultValue={viewer.firstName} autoComplete="given-name" required />
          <Field name="lastName" label="Last name" defaultValue={viewer.lastName} autoComplete="family-name" required />
          <Field name="email" label="Email" defaultValue={viewer.email} disabled hint="Contact us to change the email on your account." />
          <Field name="phone" type="tel" label="Phone" defaultValue={phone} autoComplete="tel" />
          <div className="sm:col-span-2">
            <Submit>Save details</Submit>
          </div>
        </ActionForm>
      </Card>
      <Card title="Profile photo">
        <div className="flex flex-col items-center text-center">
          <Avatar name={`${viewer.firstName} ${viewer.lastName}`} fileId={viewer.avatarFileId} size={96} />
          <ActionForm action={uploadAvatarAction} className="mt-5 w-full space-y-3">
            <FormMessage />
            <Field name="photo" type="file" label="Upload a new photo" accept=".jpg,.jpeg,.png,.webp" hint="JPG, PNG or WebP, up to 2 MB." />
            <Submit variant="secondary" className="w-full">
              Upload photo
            </Submit>
          </ActionForm>
          {viewer.avatarFileId && (
            <div className="mt-3">
              <ActionButton action={removeAvatarAction} variant="ghost">
                Remove photo
              </ActionButton>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ── Settings: password, notification preferences, sessions ────────────── */

export async function SettingsView({ viewer }: { viewer: Viewer }) {
  const db = await getDb();
  const [prefs, sessions] = await Promise.all([
    db.select().from(t.notificationPreferences).where(eq(t.notificationPreferences.userId, viewer.id)),
    db.select().from(t.userSessions).where(eq(t.userSessions.userId, viewer.id)).orderBy(desc(t.userSessions.lastSeenAt)),
  ]);
  const pref = new Map(prefs.map((p) => [p.category, p]));
  const cats = NOTIFICATION_CATEGORIES.filter((c) => c.key !== "staff" || viewer.isStaff);
  return (
    <>
      <PageHeader title="Settings" description="Security, sign-in sessions and notification preferences." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Change password" description="Changing your password signs you out on every other device.">
          <ActionForm action={changePasswordAction} className="space-y-5">
            <FormMessage />
            <PasswordField name="currentPassword" label="Current password" autoComplete="current-password" required />
            <PasswordField name="newPassword" label="New password" autoComplete="new-password" meter required />
            <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" required />
            <Submit>Update password</Submit>
          </ActionForm>
        </Card>
        <Card title="Notifications" description="Choose how we contact you. Account security emails are always sent.">
          <ActionForm action={savePreferencesAction} className="space-y-4">
            <FormMessage />
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-6 gap-y-4 text-sm">
              <span />
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Email</span>
              <span className="text-xs font-bold uppercase tracking-wider text-muted">In app</span>
              {cats.map((c) => (
                <div key={c.key} className="contents">
                  <div>
                    <p className="font-semibold text-navy-950">{c.label}</p>
                    <p className="text-xs text-muted">{c.description}</p>
                  </div>
                  <Checkbox name={`email:${c.key}`} label={<span className="sr-only">Email for {c.label}</span>} defaultChecked={pref.get(c.key)?.emailEnabled ?? true} />
                  <Checkbox name={`inapp:${c.key}`} label={<span className="sr-only">In-app for {c.label}</span>} defaultChecked={pref.get(c.key)?.inAppEnabled ?? true} />
                </div>
              ))}
            </div>
            <Submit variant="secondary">Save preferences</Submit>
          </ActionForm>
        </Card>
        <Card
          className="xl:col-span-2"
          title="Signed-in sessions"
          description="Devices currently signed in to your account."
          actions={sessions.length > 1 ? <ActionButton action={revokeOtherSessionsAction} confirm={{ title: "Sign out other sessions?", cta: "Sign out others" }}>Sign out everywhere else</ActionButton> : null}
          padded={false}
        >
          <ul className="divide-y divide-line">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                <span className="grid size-10 place-items-center rounded-xl bg-canvas text-navy-700">
                  <Monitor aria-hidden className="size-5" />
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-semibold text-navy-950">
                    {describeAgent(s.userAgent)} {s.id === viewer.sessionId && <span className="ml-1 rounded-full bg-teal-50 px-2 py-0.5 text-xs text-teal-800">This device</span>}
                  </p>
                  <p className="text-xs text-muted">
                    Last active {timeAgo(s.lastSeenAt)} · Signed in {fmtDateTime(s.createdAt, TZ)}
                  </p>
                </div>
                <ActionButton action={revokeSessionAction.bind(null, s.id)} variant="danger">
                  Sign out
                </ActionButton>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <p className="mt-6 flex items-center gap-2 text-xs text-muted">
        <ShieldCheck aria-hidden className="size-4 text-teal-700" /> Passwords are stored as Argon2id hashes; sessions expire automatically.
      </p>
    </>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return `${browser}${os ? ` on ${os}` : ""}`;
}

/* ── Support ───────────────────────────────────────────────────────────── */

export async function SupportListView({ viewer, base }: { viewer: Viewer; base: string }) {
  const db = await getDb();
  const threads = await db
    .select()
    .from(t.supportMessages)
    .where(and(eq(t.supportMessages.userId, viewer.id), isNull(t.supportMessages.parentId)))
    .orderBy(desc(t.supportMessages.lastActivityAt));
  return (
    <>
      <PageHeader title="Help & Support" description="Message our team — we reply here and by email." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Card title="Your conversations" padded={false}>
          {threads.length === 0 ? (
            <EmptyState icon={<Inbox className="size-6" />} title="No conversations yet" description="Start one with the form — we’re here to help." />
          ) : (
            <ul className="divide-y divide-line">
              {threads.map((th) => (
                <li key={th.id}>
                  <Link href={`${base}${th.id}/`} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-canvas">
                    <MessageSquare aria-hidden className="size-5 shrink-0 text-teal-700" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-950">{th.subject}</p>
                      <p className="text-xs text-muted">
                        {th.reference} · {th.category} · updated {timeAgo(th.lastActivityAt)}
                      </p>
                    </div>
                    <StatusBadge status={th.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="New message">
          <ActionForm action={createSupportThreadAction} className="space-y-4">
            <FormMessage />
            <Select name="category" label="Topic" options={SUPPORT_CATEGORIES.map((c) => ({ value: c, label: c }))} placeholder="Choose a topic" required />
            <Field name="subject" label="Subject" maxLength={150} required />
            <TextArea name="body" label="Message" rows={5} maxLength={5000} required hint="Please don’t include medical records or ID numbers." />
            <Submit variant="teal" className="w-full">
              Send message
            </Submit>
          </ActionForm>
          <p className="mt-4 flex items-start gap-2 text-xs text-muted">
            <LifeBuoy aria-hidden className="mt-0.5 size-4 shrink-0" /> Urgent? Call (310) 462-1700.
          </p>
        </Card>
      </div>
    </>
  );
}

export async function SupportThreadView({ viewer, threadId, base, staffView = false }: { viewer: Viewer; threadId: string; base: string; staffView?: boolean }) {
  const db = await getDb();
  const [thread] = await db.select().from(t.supportMessages).where(and(eq(t.supportMessages.id, threadId), isNull(t.supportMessages.parentId)));
  if (!thread || (!staffView && thread.userId !== viewer.id)) return null;
  const replies = await db
    .select({ m: t.supportMessages, firstName: t.userProfiles.firstName, lastName: t.userProfiles.lastName, avatar: t.userProfiles.avatarFileId })
    .from(t.supportMessages)
    .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.supportMessages.authorId))
    .where(eq(t.supportMessages.parentId, thread.id))
    .orderBy(asc(t.supportMessages.createdAt));
  const messages = [{ m: thread, firstName: thread.name?.split(" ")[0] ?? "", lastName: thread.name?.split(" ").slice(1).join(" ") ?? "", avatar: null as string | null }, ...replies];
  return (
    <>
      <PageHeader
        title={thread.subject ?? "Conversation"}
        crumbs={[{ label: "Help & Support", href: base }, { label: thread.reference ?? "Conversation" }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {thread.category} · opened {fmtDateTime(thread.createdAt, TZ)} <StatusBadge status={thread.status} />
          </span>
        }
        actions={
          staffView ? (
            <>
              {(["in_progress", "resolved", "closed"] as const).filter((s) => s !== thread.status).map((s) => (
                <ActionButton key={s} action={setSupportStatusAction.bind(null, thread.id, s)}>
                  Mark {s.replace("_", " ")}
                </ActionButton>
              ))}
            </>
          ) : thread.status !== "resolved" && thread.status !== "closed" ? (
            <ActionButton action={setSupportStatusAction.bind(null, thread.id, "resolved")}>Mark as resolved</ActionButton>
          ) : null
        }
      />
      <div className="space-y-4">
        {messages.map(({ m, firstName, lastName, avatar }, i) => {
          const fromStaff = m.isStaff;
          return (
            <div key={m.id} className={cn("enter flex gap-3", fromStaff ? "flex-row-reverse text-right" : "")} style={{ ["--d" as string]: `${Math.min(i, 8) * 0.04}s` }}>
              <Avatar name={`${firstName} ${lastName}`} fileId={avatar} />
              <div className={cn("max-w-2xl rounded-3xl border px-5 py-4 text-left", fromStaff ? "border-teal-200 bg-teal-50" : "border-line bg-white")}>
                <p className="text-xs font-semibold text-muted">
                  {fromStaff ? "Ideal Service Staff team" : `${firstName} ${lastName}`} · {fmtDateTime(m.createdAt, TZ)}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-navy-950">{m.body}</p>
              </div>
            </div>
          );
        })}
      </div>
      {thread.status !== "closed" || staffView ? (
        <Card className="mt-6" title="Reply">
          <ActionForm action={replySupportAction} className="space-y-4">
            <input type="hidden" name="threadId" value={thread.id} />
            <FormMessage />
            <TextArea name="body" label="Your message" rows={4} maxLength={5000} required />
            <Submit variant="teal">Send reply</Submit>
          </ActionForm>
        </Card>
      ) : (
        <p className="mt-6 text-sm text-muted">This conversation is closed.</p>
      )}
    </>
  );
}
