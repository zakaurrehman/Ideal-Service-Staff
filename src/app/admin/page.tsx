import Link from "next/link";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { AlertCircle, CalendarCheck, CalendarClock, CheckCircle2, ClipboardCheck, ShieldCheck, UserPlus, Users, UserSquare2, XCircle } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { BOOKING_STATUSES, statusLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { addDays, timeAgo, todayIn, zonedToUtc } from "@/lib/time";
import { Alert, Card, EmptyState, MoreLink, PageHeader, StatCard, sp, type Search } from "@/components/app/ui";
import { BarList, ColumnChart } from "@/components/app/Charts";

export const metadata = { title: "Dashboard" };

const roleCount = (key: string) => sql<number>`(SELECT count(*)::int FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE r.key = ${key})`;

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireStaff();
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const today = todayIn(tz);
  const dayStart = zonedToUtc(today, 0, tz);
  const dayEnd = zonedToUtc(addDays(today, 1), 0, tz);
  const since30 = new Date(Date.now() - 30 * 86400_000);
  const weeks = 8;
  const weekStart = zonedToUtc(addDays(today, -7 * weeks + 1), 0, tz);
  const weekIdx = sql<number>`floor(extract(epoch FROM (${t.bookings.createdAt} - ${weekStart}::timestamptz)) / 604800)::int`;

  const [[people], [bk], [apps], byStatus, perWeek, regs, attention, recent] = await Promise.all([
    db
      .select({
        customers: roleCount("customer"),
        employees: roleCount("employee"),
        approved: sql<number>`(SELECT count(*)::int FROM employee_profiles WHERE verification_status = 'approved')`,
        pendingVerif: sql<number>`(SELECT count(*)::int FROM employee_profiles WHERE verification_status IN ('application_received','under_review','documents_required','verification_pending'))`,
        newCustomers: sql<number>`(SELECT count(*)::int FROM customer_profiles WHERE created_at >= ${since30})`,
      })
      .from(sql`(SELECT 1) x`),
    db
      .select({
        total: count(),
        today: sql<number>`count(*) FILTER (WHERE ${t.bookings.startsAt} >= ${dayStart} AND ${t.bookings.startsAt} < ${dayEnd} AND ${t.bookings.status} NOT IN ('cancelled','rejected','draft'))::int`,
        pending: sql<number>`count(*) FILTER (WHERE ${t.bookings.status} IN ('pending_review','pending_assignment','assigned','accepted','cancellation_requested'))::int`,
        completed: sql<number>`count(*) FILTER (WHERE ${t.bookings.status} = 'completed')::int`,
        cancelled: sql<number>`count(*) FILTER (WHERE ${t.bookings.status} = 'cancelled')::int`,
      })
      .from(t.bookings),
    db.select({ newApps: count() }).from(t.jobApplications).where(gte(t.jobApplications.createdAt, since30)),
    db.select({ status: t.bookings.status, n: count() }).from(t.bookings).groupBy(t.bookings.status),
    db.select({ w: weekIdx, n: count() }).from(t.bookings).where(gte(t.bookings.createdAt, weekStart)).groupBy(sql`1`),
    db
      .select({
        w: sql<number>`floor(extract(epoch FROM (${t.users.createdAt} - ${weekStart}::timestamptz)) / 604800)::int`,
        role: t.roles.key,
        n: count(),
      })
      .from(t.users)
      .innerJoin(t.userRoles, eq(t.userRoles.userId, t.users.id))
      .innerJoin(t.roles, eq(t.roles.id, t.userRoles.roleId))
      .where(and(gte(t.users.createdAt, weekStart), inArray(t.roles.key, ["customer", "employee"])))
      .groupBy(sql`1`, t.roles.key),
    Promise.all([
      db.select({ n: count() }).from(t.bookings).where(eq(t.bookings.status, "pending_review")),
      db.select({ n: count() }).from(t.bookings).where(eq(t.bookings.status, "pending_assignment")),
      db.select({ n: count() }).from(t.bookings).where(eq(t.bookings.status, "cancellation_requested")),
      db.select({ n: count() }).from(t.bookings).where(isNotNull(t.bookings.rescheduleRequestedAt)),
      db.select({ n: count() }).from(t.bookings).where(eq(t.bookings.status, "accepted")),
      db.select({ n: count() }).from(t.employeeDocuments).where(eq(t.employeeDocuments.status, "pending_review")),
      db.select({ n: count() }).from(t.supportMessages).where(and(isNull(t.supportMessages.parentId), eq(t.supportMessages.status, "open"))),
    ]),
    can(v, "audit.view")
      ? db
          .select({ id: t.auditLogs.id, summary: t.auditLogs.summary, action: t.auditLogs.action, at: t.auditLogs.createdAt, first: t.userProfiles.firstName, last: t.userProfiles.lastName })
          .from(t.auditLogs)
          .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.auditLogs.actorId))
          .orderBy(desc(t.auditLogs.createdAt))
          .limit(8)
      : Promise.resolve([]),
  ]);

  const weekLabels = Array.from({ length: weeks }, (_, i) => {
    const d = addDays(today, -7 * weeks + 1 + i * 7);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`));
  });
  const series = (rows: { w: number; n: number }[]) => Array.from({ length: weeks }, (_, i) => rows.filter((r) => r.w === i).reduce((a, r) => a + r.n, 0));
  const [pReview, pAssign, pCancel, pResched, pConfirm, pDocs, pSupport] = attention.map((a) => a[0].n);
  const denied = sp(search, "denied");
  const deniedName = PERMISSIONS.find((p) => p.key === denied)?.name;

  return (
    <>
      <PageHeader title={`Hello, ${v.firstName}`} description="Live figures from the platform database." />
      {deniedName && (
        <div className="mb-6">
          <Alert tone="amber" title="Access restricted">
            Your role doesn’t include “{deniedName}”. Ask a Super Admin if you need it.
          </Alert>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Customers" value={people.customers} hint={`${people.newCustomers} new in 30 days`} icon={<Users className="size-5" />} href={can(v, "customers.view") ? "/admin/customers/" : undefined} />
        <StatCard label="Employees" value={people.employees} hint={`${people.approved} approved`} icon={<UserSquare2 className="size-5" />} tone="teal" href={can(v, "employees.view") ? "/admin/employees/" : undefined} />
        <StatCard label="Pending verification" value={people.pendingVerif} icon={<ShieldCheck className="size-5" />} tone="amber" href={can(v, "employees.verify") ? "/admin/verification/" : undefined} />
        <StatCard label="New applications" value={apps.newApps} hint="Last 30 days" icon={<ClipboardCheck className="size-5" />} href={can(v, "applications.view") ? "/admin/applications/" : undefined} />
        <StatCard label="Total bookings" value={bk.total} icon={<CalendarCheck className="size-5" />} href={can(v, "bookings.view") ? "/admin/bookings/" : undefined} />
        <StatCard label="Today’s bookings" value={bk.today} icon={<CalendarClock className="size-5" />} tone="teal" href={can(v, "bookings.view") ? "/admin/calendar/" : undefined} />
        <StatCard label="Open / pending" value={bk.pending} icon={<AlertCircle className="size-5" />} tone="amber" href={can(v, "bookings.view") ? "/admin/bookings/?status=pending_review" : undefined} />
        <StatCard label="Completed · Cancelled" value={`${bk.completed} · ${bk.cancelled}`} icon={<CheckCircle2 className="size-5" />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Booking requests per week" description="By date the request was created · last 8 weeks">
          {bk.total === 0 ? <EmptyState compact icon={<CalendarCheck className="size-6" />} title="No bookings yet" description="The chart fills in as customers book." /> : <ColumnChart title="Booking requests per week" labels={weekLabels} series={[{ name: "Bookings", values: series(perWeek) }]} />}
        </Card>
        <Card title="Needs attention">
          <ul className="space-y-2 text-sm">
            {[
              { n: pReview, label: "Bookings to review", href: "/admin/bookings/?status=pending_review" },
              { n: pAssign, label: "Bookings to assign", href: "/admin/bookings/?status=pending_assignment" },
              { n: pConfirm, label: "Accepted, awaiting confirmation", href: "/admin/bookings/?status=accepted" },
              { n: pCancel, label: "Cancellation requests", href: "/admin/bookings/?status=cancellation_requested" },
              { n: pResched, label: "Reschedule requests", href: "/admin/bookings/?reschedule=1" },
              { n: pDocs, label: "Documents to review", href: "/admin/verification/" },
              { n: pSupport, label: "Open support messages", href: "/admin/support/" },
            ].map((x) => (
              <li key={x.label}>
                <Link href={x.href} className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 transition-colors hover:border-teal-300">
                  <span className="text-navy-900">{x.label}</span>
                  <span className={`min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold tabular-nums ${x.n ? "bg-amber-100 text-amber-900" : "bg-canvas text-muted"}`}>{x.n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Bookings by status">
          {bk.total === 0 ? (
            <EmptyState compact icon={<XCircle className="size-6" />} title="No data yet" />
          ) : (
            <BarList title="Bookings by status" rows={BOOKING_STATUSES.map((s) => ({ label: statusLabel(s), value: byStatus.find((b) => b.status === s)?.n ?? 0 })).filter((r) => r.value > 0)} />
          )}
        </Card>
        <Card className="xl:col-span-2" title="New registrations per week" description="Customer and employee accounts · last 8 weeks">
          <ColumnChart
            title="New registrations per week"
            labels={weekLabels}
            series={[
              { name: "Customers", values: series(regs.filter((r) => r.role === "customer")) },
              { name: "Employees", values: series(regs.filter((r) => r.role === "employee")) },
            ]}
          />
        </Card>
      </div>

      {can(v, "audit.view") && (
        <Card className="mt-6" title="Recent activity" actions={<MoreLink href="/admin/audit/">Audit log</MoreLink>} padded={false}>
          {recent.length === 0 ? (
            <EmptyState compact icon={<UserPlus className="size-6" />} title="No activity yet" />
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3 text-sm">
                  <span className="text-navy-950">
                    <span className="font-semibold">{r.first ? `${r.first} ${r.last}` : "System"}</span> · {r.summary}
                  </span>
                  <span className="text-xs text-muted">{timeAgo(r.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </>
  );
}
