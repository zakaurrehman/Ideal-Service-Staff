import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import { Download } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { REPORTS } from "@/lib/reports";
import { BOOKING_STATUSES, statusLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { addDays, isIsoDate, todayIn, zonedToUtc } from "@/lib/time";
import { Card, DL, EmptyState, LinkButton, PageHeader, sp, type Search } from "@/components/app/ui";
import { BarList } from "@/components/app/Charts";

export const metadata = { title: "Reports & Analytics" };

export default async function Reports({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireStaff("reports.view");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const today = todayIn(tz);
  const from = isIsoDate(sp(search, "from")) ? sp(search, "from") : addDays(today, -29);
  const to = isIsoDate(sp(search, "to")) ? sp(search, "to") : today;
  const start = zonedToUtc(from, 0, tz);
  const end = zonedToUtc(addDays(to, 1), 0, tz);
  const inRange = and(gte(t.bookings.startsAt, start), lt(t.bookings.startsAt, end));

  const [byStatus, byService, byPro, [people], [apps]] = await Promise.all([
    db.select({ status: t.bookings.status, n: count() }).from(t.bookings).where(inRange).groupBy(t.bookings.status),
    db.select({ name: t.bookingServices.serviceName, n: count() }).from(t.bookingServices).innerJoin(t.bookings, eq(t.bookings.id, t.bookingServices.bookingId)).where(inRange).groupBy(t.bookingServices.serviceName).orderBy(sql`count(*) desc`).limit(10),
    db
      .select({ name: sql<string>`${t.userProfiles.firstName} || ' ' || ${t.userProfiles.lastName}`, n: count(), hours: sql<number>`round(sum(extract(epoch FROM (${t.bookings.endsAt} - ${t.bookings.startsAt})) / 3600)::numeric, 1)::float` })
      .from(t.bookingAssignments)
      .innerJoin(t.bookings, eq(t.bookings.id, t.bookingAssignments.bookingId))
      .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.bookingAssignments.employeeId))
      .where(and(inRange, eq(t.bookingAssignments.status, "accepted"), eq(t.bookings.status, "completed")))
      .groupBy(t.userProfiles.firstName, t.userProfiles.lastName)
      .orderBy(sql`count(*) desc`)
      .limit(10),
    db
      .select({
        customers: sql<number>`(SELECT count(*)::int FROM customer_profiles WHERE created_at >= ${start} AND created_at < ${end})`,
        employees: sql<number>`(SELECT count(*)::int FROM employee_profiles WHERE created_at >= ${start} AND created_at < ${end})`,
        approved: sql<number>`(SELECT count(*)::int FROM employee_profiles WHERE approved_at >= ${start} AND approved_at < ${end})`,
      })
      .from(sql`(SELECT 1) x`),
    db
      .select({ total: count(), approved: sql<number>`count(*) FILTER (WHERE status = 'approved')::int`, rejected: sql<number>`count(*) FILTER (WHERE status = 'rejected')::int` })
      .from(t.jobApplications)
      .where(and(gte(t.jobApplications.createdAt, start), lt(t.jobApplications.createdAt, end))),
  ]);
  const total = byStatus.reduce((a, b) => a + b.n, 0);
  const completed = byStatus.find((b) => b.status === "completed")?.n ?? 0;
  const cancelled = byStatus.find((b) => b.status === "cancelled")?.n ?? 0;
  const q = `from=${from}&to=${to}`;
  return (
    <>
      <PageHeader title="Reports & Analytics" description="All figures are calculated live from the database for the selected period. Revenue reporting is not shown because payments are not processed on the platform." />
      <form className="mb-6 flex flex-wrap items-end gap-3 rounded-3xl border border-line bg-white p-5 shadow-soft" method="get">
        <label className="text-sm font-semibold text-navy-900">
          From <input type="date" name="from" defaultValue={from} className="mt-1 block h-11 rounded-2xl border border-line px-3" />
        </label>
        <label className="text-sm font-semibold text-navy-900">
          To <input type="date" name="to" defaultValue={to} className="mt-1 block h-11 rounded-2xl border border-line px-3" />
        </label>
        <button className="h-11 rounded-full bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800">Update</button>
      </form>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Bookings in period">
          <DL
            cols={1}
            items={[
              { label: "Appointments scheduled", value: total },
              { label: "Completed", value: `${completed}${total ? ` (${Math.round((completed / total) * 100)}%)` : ""}` },
              { label: "Cancelled", value: `${cancelled}${total ? ` (${Math.round((cancelled / total) * 100)}%)` : ""}` },
            ]}
          />
        </Card>
        <Card title="People">
          <DL cols={1} items={[{ label: "New customers", value: people.customers }, { label: "New employee accounts", value: people.employees }, { label: "Employees approved", value: people.approved }]} />
        </Card>
        <Card title="Recruitment">
          <DL cols={1} items={[{ label: "Applications received", value: apps.total }, { label: "Approved", value: apps.approved }, { label: "Not progressed", value: apps.rejected }]} />
        </Card>
        <Card title="Bookings by status">{total ? <BarList title="Bookings by status" rows={BOOKING_STATUSES.map((s) => ({ label: statusLabel(s), value: byStatus.find((b) => b.status === s)?.n ?? 0 })).filter((r) => r.value)} /> : <EmptyState compact title="No bookings in this period" />}</Card>
        <Card title="Top services">{byService.length ? <BarList title="Bookings by service" rows={byService.map((s) => ({ label: s.name, value: s.n }))} /> : <EmptyState compact title="No bookings in this period" />}</Card>
        <Card title="Completed visits by professional">{byPro.length ? <BarList title="Completed visits by professional" rows={byPro.map((p) => ({ label: `${p.name} (${p.hours} h)`, value: p.n }))} /> : <EmptyState compact title="No completed visits in this period" />}</Card>
      </div>
      {can(v, "reports.export") && (
        <Card className="mt-6" title="CSV exports" description="Exports contain personal data — every download is recorded in the audit log. Date filters apply where relevant.">
          <div className="flex flex-wrap gap-2">
            {Object.entries(REPORTS)
              .filter(([, r]) => v.permissions.has(r.permission))
              .map(([key, r]) => (
                <LinkButton key={key} href={`/api/admin/export/${key}/?${q}`} variant="secondary" external>
                  <Download aria-hidden className="size-4" /> {r.label}
                </LinkButton>
              ))}
          </div>
        </Card>
      )}
    </>
  );
}
