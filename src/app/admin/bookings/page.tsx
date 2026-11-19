import Link from "next/link";
import { and, asc, count, desc, eq, gte, ilike, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { CalendarX2, Download, Plus } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { BOOKING_STATUSES, statusLabel, type BookingStatus } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { addDays, fmtDate, fmtTime, isIsoDate, zonedToUtc } from "@/lib/time";
import { Card, EmptyState, FilterBar, LinkButton, PageHeader, Pagination, SortTh, StatusBadge, Table, Td, Th, pageOf, sp, withParams, type Search } from "@/components/app/ui";

export const metadata = { title: "Bookings" };

const svc = sql<string>`(SELECT bs.service_name FROM booking_services bs WHERE bs.booking_id = ${t.bookings.id} LIMIT 1)`;
const svcId = sql<string>`(SELECT bs.service_id FROM booking_services bs WHERE bs.booking_id = ${t.bookings.id} LIMIT 1)`;
const pro = sql<string | null>`(SELECT up.first_name || ' ' || up.last_name || CASE WHEN ba.status = 'offered' THEN ' (offered)' ELSE '' END FROM booking_assignments ba JOIN user_profiles up ON up.user_id = ba.employee_id WHERE ba.booking_id = ${t.bookings.id} AND ba.status IN ('offered','accepted') LIMIT 1)`;
const proId = sql<string | null>`(SELECT ba.employee_id FROM booking_assignments ba WHERE ba.booking_id = ${t.bookings.id} AND ba.status IN ('offered','accepted') LIMIT 1)`;

export default async function AdminBookings({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireStaff("bookings.view");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const base = "/admin/bookings/";
  const page = pageOf(search);
  const size = 15;

  const conds: SQL[] = [];
  const status = sp(search, "status");
  if ((BOOKING_STATUSES as readonly string[]).includes(status)) conds.push(eq(t.bookings.status, status as BookingStatus));
  const q = sp(search, "q").trim().slice(0, 80);
  if (q) conds.push(or(ilike(t.bookings.reference, `%${q}%`), ilike(t.bookings.recipientName, `%${q}%`), ilike(t.users.email, `%${q}%`), ilike(sql`${t.userProfiles.firstName} || ' ' || ${t.userProfiles.lastName}`, `%${q}%`))!);
  const service = sp(search, "service");
  if (/^[0-9a-f-]{36}$/.test(service)) conds.push(sql`${svcId} = ${service}`);
  const employee = sp(search, "employee");
  if (/^[0-9a-f-]{36}$/.test(employee)) conds.push(sql`${proId} = ${employee}`);
  const from = sp(search, "from");
  const to = sp(search, "to");
  if (isIsoDate(from)) conds.push(gte(t.bookings.startsAt, zonedToUtc(from, 0, tz)));
  if (isIsoDate(to)) conds.push(lt(t.bookings.startsAt, zonedToUtc(addDays(to, 1), 0, tz)));
  if (sp(search, "reschedule")) conds.push(isNotNull(t.bookings.rescheduleRequestedAt));
  const where = conds.length ? and(...conds) : undefined;

  const dir = sp(search, "dir") === "asc" ? asc : desc;
  const sort = sp(search, "sort");
  const orderBy = sort === "reference" ? dir(t.bookings.reference) : sort === "status" ? dir(t.bookings.status) : sort === "created" ? dir(t.bookings.createdAt) : sort === "customer" ? dir(t.userProfiles.lastName) : dir(t.bookings.startsAt);

  const [rows, [{ n }], services, employees] = await Promise.all([
    db
      .select({ id: t.bookings.id, reference: t.bookings.reference, startsAt: t.bookings.startsAt, endsAt: t.bookings.endsAt, status: t.bookings.status, resched: t.bookings.rescheduleRequestedAt, first: t.userProfiles.firstName, last: t.userProfiles.lastName, email: t.users.email, service: svc, pro })
      .from(t.bookings)
      .innerJoin(t.users, eq(t.users.id, t.bookings.customerId))
      .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.bookings.customerId))
      .where(where)
      .orderBy(orderBy)
      .limit(size)
      .offset((page - 1) * size),
    db.select({ n: count() }).from(t.bookings).innerJoin(t.users, eq(t.users.id, t.bookings.customerId)).leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.bookings.customerId)).where(where),
    db.select({ id: t.services.id, name: t.services.name }).from(t.services).orderBy(asc(t.services.sortOrder)),
    db
      .select({ id: t.employeeProfiles.userId, first: t.userProfiles.firstName, last: t.userProfiles.lastName })
      .from(t.employeeProfiles)
      .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.employeeProfiles.userId))
      .where(eq(t.employeeProfiles.verificationStatus, "approved")),
  ]);

  return (
    <>
      <PageHeader
        title="Bookings"
        description={`${n} booking${n === 1 ? "" : "s"} match. Times in ${tz.replace("_", " ")}.`}
        actions={
          <>
            {can(v, "reports.export") && (
              <LinkButton href={withParams("/api/admin/export/bookings/", search, { page: null })} variant="secondary" external>
                <Download aria-hidden className="size-4" /> Export CSV
              </LinkButton>
            )}
            {can(v, "bookings.manage") && (
              <LinkButton href="/admin/bookings/new/">
                <Plus aria-hidden className="size-4" /> New booking
              </LinkButton>
            )}
          </>
        }
      />
      <Card padded={false}>
        <FilterBar
          base={base}
          search={search}
          placeholder="Reference, customer, email or recipient"
          filters={[
            { name: "status", label: "Status", options: BOOKING_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) },
            { name: "service", label: "Service", options: services.map((s) => ({ value: s.id, label: s.name })) },
            { name: "employee", label: "Professional", options: employees.map((e) => ({ value: e.id, label: `${e.first} ${e.last}` })) },
          ]}
        >
          <label className="flex items-center gap-1 text-sm text-muted">
            From <input type="date" name="from" defaultValue={from} className="h-10 rounded-full border border-line px-3 text-sm text-navy-950" />
          </label>
          <label className="flex items-center gap-1 text-sm text-muted">
            to <input type="date" name="to" defaultValue={to} className="h-10 rounded-full border border-line px-3 text-sm text-navy-950" />
          </label>
        </FilterBar>
        {rows.length === 0 ? (
          <EmptyState icon={<CalendarX2 className="size-6" />} title="No bookings found" description={where ? "Try different filters." : "Customer bookings will appear here."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <SortTh label="Reference" field="reference" base={base} search={search} />
                <SortTh label="Customer" field="customer" base={base} search={search} />
                <Th>Service</Th>
                <SortTh label="Appointment" field="date" base={base} search={search} />
                <Th>Professional</Th>
                <SortTh label="Status" field="status" base={base} search={search} />
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/60">
                  <Td>
                    <Link href={`/admin/bookings/${r.id}/`} className="font-mono text-xs font-semibold text-navy-900 hover:underline">
                      {r.reference}
                    </Link>
                  </Td>
                  <Td>
                    <p className="font-semibold text-navy-950">
                      {r.first} {r.last}
                    </p>
                    <p className="text-xs text-muted">{r.email}</p>
                  </Td>
                  <Td>{r.service}</Td>
                  <Td className="whitespace-nowrap">
                    {fmtDate(r.startsAt, tz)}
                    <span className="block text-xs text-muted">
                      {fmtTime(r.startsAt, tz)} – {fmtTime(r.endsAt, tz)}
                    </span>
                  </Td>
                  <Td>{r.pro ?? <span className="text-muted">Unassigned</span>}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                    {r.resched && <span className="mt-1 block text-xs font-semibold text-amber-800">Reschedule requested</span>}
                  </Td>
                  <Td className="text-right">
                    <LinkButton href={`/admin/bookings/${r.id}/`} variant="secondary" size="sm">
                      Manage
                    </LinkButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination base={base} search={search} page={page} pageSize={size} total={n} />
      </Card>
    </>
  );
}
