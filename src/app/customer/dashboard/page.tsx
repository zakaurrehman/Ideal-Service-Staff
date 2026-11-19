import Link from "next/link";
import { and, count, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { Activity, CalendarCheck, CalendarClock, CalendarPlus, CheckCircle2, Clock, MailWarning, MapPin, Sparkles } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/session";
import { resendVerificationAction } from "@/lib/auth/actions";
import { UPCOMING_STATUSES } from "@/lib/booking/status";
import { getSettings } from "@/lib/settings";
import { statusLabel } from "@/lib/labels";
import { fmtDate, fmtTime, timeAgo } from "@/lib/time";
import { Alert, Card, DL, EmptyState, LinkButton, MoreLink, StatCard, StatusBadge, sp, type Search } from "@/components/app/ui";
import { ActionForm, FormMessage, Submit } from "@/components/app/forms";
import { Avatar } from "@/components/app/AppShell";
import { acceptedProSql, serviceNameSql } from "@/components/app/customer/Bookings";

export default async function CustomerDashboard({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireCustomer();
  const db = await getDb();
  const settings = await getSettings(db);
  const tz = settings.timezone;
  const now = new Date();
  const mine = eq(t.bookings.customerId, v.id);

  const [[total], [upcoming], [completed], [pending], next, activity, notes, [profile], [addresses]] = await Promise.all([
    db.select({ n: count() }).from(t.bookings).where(mine),
    db.select({ n: count() }).from(t.bookings).where(and(mine, inArray(t.bookings.status, UPCOMING_STATUSES), gt(t.bookings.endsAt, now))),
    db.select({ n: count() }).from(t.bookings).where(and(mine, eq(t.bookings.status, "completed"))),
    db.select({ n: count() }).from(t.bookings).where(and(mine, inArray(t.bookings.status, ["pending_review", "pending_assignment", "assigned", "accepted", "cancellation_requested"]))),
    db
      .select({ id: t.bookings.id, reference: t.bookings.reference, startsAt: t.bookings.startsAt, endsAt: t.bookings.endsAt, status: t.bookings.status, recipient: t.bookings.recipientName, city: t.bookings.city, service: serviceNameSql, pro: acceptedProSql })
      .from(t.bookings)
      .where(and(mine, inArray(t.bookings.status, UPCOMING_STATUSES), gt(t.bookings.endsAt, now)))
      .orderBy(t.bookings.startsAt)
      .limit(3),
    db
      .select({ id: t.bookingStatusHistory.id, to: t.bookingStatusHistory.toStatus, at: t.bookingStatusHistory.createdAt, reference: t.bookings.reference, note: t.bookingStatusHistory.note })
      .from(t.bookingStatusHistory)
      .innerJoin(t.bookings, eq(t.bookings.id, t.bookingStatusHistory.bookingId))
      .where(mine)
      .orderBy(desc(t.bookingStatusHistory.createdAt))
      .limit(6),
    db.select().from(t.notifications).where(and(eq(t.notifications.userId, v.id), isNull(t.notifications.readAt))).orderBy(desc(t.notifications.createdAt)).limit(4),
    db.select().from(t.userProfiles).where(eq(t.userProfiles.userId, v.id)),
    db.select({ n: count() }).from(t.customerAddresses).where(and(eq(t.customerAddresses.customerId, v.id), isNull(t.customerAddresses.archivedAt))),
  ]);
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", hourCycle: "h23" }).format(now));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <section className="enter grain relative isolate overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white sm:p-10">
        <div aria-hidden className="absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-teal-500/30 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 left-1/3 -z-10 size-72 rounded-full bg-navy-600/40 blur-3xl" />
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={`${v.firstName} ${v.lastName}`} fileId={v.avatarFileId} size={56} />
            <div>
              <p className="text-sm text-teal-300">{greeting},</p>
              <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">{v.firstName}</h1>
            </div>
          </div>
          <LinkButton href="/customer/book/" variant="teal" className="shadow-glow">
            <CalendarPlus aria-hidden className="size-4" /> Book a service
          </LinkButton>
        </div>
      </section>

      {sp(search, "welcome") && <Alert tone="teal" title="Welcome to Ideal Service Staff!">Your account is ready. Add an address and your family members, then book your first service.</Alert>}
      {!v.emailVerifiedAt && (
        <Alert
          tone="amber"
          title={
            <span className="flex items-center gap-2">
              <MailWarning aria-hidden className="size-4" /> Please confirm your email address
            </span>
          }
          action={
            <ActionForm action={resendVerificationAction} className="flex flex-col items-end gap-2">
              <FormMessage className="max-w-xs" />
              <Submit variant="secondary" className="h-10">
                Resend confirmation email
              </Submit>
            </ActionForm>
          }
        >
          We sent a link to {v.email}. {settings.requireVerifiedEmailToBook && "You’ll need to confirm it before booking."}
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total bookings" value={total.n} icon={<CalendarCheck className="size-5" />} href="/customer/bookings/" />
        <StatCard label="Upcoming appointments" value={upcoming.n} icon={<CalendarClock className="size-5" />} href="/customer/appointments/" tone="teal" />
        <StatCard label="Completed" value={completed.n} icon={<CheckCircle2 className="size-5" />} href="/customer/history/" />
        <StatCard label="Pending requests" value={pending.n} hint="Awaiting review, assignment or a decision" icon={<Clock className="size-5" />} tone="amber" href="/customer/bookings/" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Upcoming appointments" actions={<MoreLink href="/customer/appointments/">View all</MoreLink>} padded={false}>
          {next.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="size-6" />}
              title="No upcoming appointments"
              description="Book a service and it will appear here with its live status."
              action={<LinkButton href="/customer/book/" variant="teal">Book a service</LinkButton>}
            />
          ) : (
            <ul className="divide-y divide-line">
              {next.map((b) => (
                <li key={b.id}>
                  <Link href={`/customer/bookings/${b.reference}/`} className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-canvas/70">
                    <div className="grid w-16 shrink-0 place-items-center rounded-2xl bg-teal-50 py-2 text-center text-teal-900">
                      <span className="text-[11px] font-bold uppercase">{fmtDate(b.startsAt, tz, { month: "short" })}</span>
                      <span className="font-display text-2xl font-semibold leading-none">{fmtDate(b.startsAt, tz, { day: "numeric" })}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy-950">{b.service}</p>
                      <p className="text-sm text-muted">
                        {fmtDate(b.startsAt, tz, { weekday: "long" })} · {fmtTime(b.startsAt, tz)} – {fmtTime(b.endsAt, tz)} · For {b.recipient}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                        <MapPin aria-hidden className="size-3" /> {b.city} · {b.pro ? `With ${b.pro}` : "Professional being arranged"}
                      </p>
                    </div>
                    <StatusBadge status={b.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Account">
          <DL
            cols={1}
            items={[
              { label: "Name", value: `${v.firstName} ${v.lastName}` },
              { label: "Email", value: <span className="flex items-center gap-2">{v.email} {v.emailVerifiedAt ? <StatusBadge status="approved" className="!py-0.5" /> : null}</span> },
              { label: "Phone", value: profile?.phone ?? "—" },
              { label: "Saved addresses", value: addresses.n },
            ]}
          />
          <div className="mt-5 flex flex-wrap gap-2">
            <LinkButton href="/customer/profile/" variant="secondary" size="sm">
              Edit profile
            </LinkButton>
            <LinkButton href="/customer/addresses/" variant="ghost" size="sm">
              Manage addresses
            </LinkButton>
          </div>
        </Card>

        <Card className="xl:col-span-2" title="Recent activity" padded={false}>
          {activity.length === 0 ? (
            <EmptyState compact icon={<Activity className="size-6" />} title="No activity yet" description="Status changes on your bookings will show here." />
          ) : (
            <ol className="relative space-y-0 px-6 py-4">
              {activity.map((a) => (
                <li key={a.id} className="relative flex gap-4 pb-5 last:pb-0">
                  <span aria-hidden className="absolute left-[7px] top-5 h-full w-px bg-line last:hidden" />
                  <span aria-hidden className="relative mt-1.5 size-3.5 shrink-0 rounded-full border-2 border-teal-500 bg-white" />
                  <div className="min-w-0 text-sm">
                    <p className="text-navy-950">
                      <Link href={`/customer/bookings/${a.reference}/`} className="font-mono text-xs font-semibold hover:underline">
                        {a.reference}
                      </Link>{" "}
                      → <span className="font-semibold">{statusLabel(a.to)}</span>
                    </p>
                    {a.note && <p className="text-muted">{a.note}</p>}
                    <p className="text-xs text-muted">{timeAgo(a.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Notifications" actions={<MoreLink href="/customer/notifications/">All</MoreLink>} padded={false}>
          {notes.length === 0 ? (
            <EmptyState compact icon={<Sparkles className="size-6" />} title="You’re all caught up" />
          ) : (
            <ul className="divide-y divide-line">
              {notes.map((n) => (
                <li key={n.id} className="px-6 py-3.5 text-sm">
                  <Link href={n.href ?? "/customer/notifications/"} className="font-semibold text-navy-950 hover:underline">
                    {n.title}
                  </Link>
                  <p className="text-xs text-muted">{timeAgo(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
