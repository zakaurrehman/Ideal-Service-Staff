import Link from "next/link";
import { and, asc, count, desc, eq, gt, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { CalendarPlus, CalendarX2 } from "lucide-react";
import { getDb, t } from "@/lib/db";
import type { Viewer } from "@/lib/auth/session";
import { BOOKING_STATUSES, statusLabel, type BookingStatus } from "@/lib/labels";
import { FINAL_STATUSES, UPCOMING_STATUSES } from "@/lib/booking/status";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtTime } from "@/lib/time";
import { Card, EmptyState, FilterBar, LinkButton, Pagination, SortTh, StatusBadge, Table, Td, Th, pageOf, sp, type Search } from "../ui";

export const serviceNameSql = sql<string>`(SELECT bs.service_name FROM booking_services bs WHERE bs.booking_id = ${t.bookings.id} LIMIT 1)`;
/** Customers see the professional's name once they have accepted. */
export const acceptedProSql = sql<string | null>`(SELECT up.first_name || ' ' || left(up.last_name, 1) || '.' FROM booking_assignments ba JOIN user_profiles up ON up.user_id = ba.employee_id WHERE ba.booking_id = ${t.bookings.id} AND ba.status = 'accepted' LIMIT 1)`;

export async function CustomerBookingsTable({ viewer, scope, search, base }: { viewer: Viewer; scope: "all" | "upcoming" | "history"; search: Search; base: string }) {
  const db = await getDb();
  const settings = await getSettings(db);
  const page = pageOf(search);
  const size = 10;
  const now = new Date();
  const conds: SQL[] = [eq(t.bookings.customerId, viewer.id)];
  if (scope === "upcoming") conds.push(inArray(t.bookings.status, UPCOMING_STATUSES), gt(t.bookings.endsAt, now));
  if (scope === "history") conds.push(or(inArray(t.bookings.status, FINAL_STATUSES), lte(t.bookings.endsAt, now))!);
  const status = sp(search, "status");
  if ((BOOKING_STATUSES as readonly string[]).includes(status)) conds.push(eq(t.bookings.status, status as BookingStatus));
  const q = sp(search, "q").trim().slice(0, 80);
  if (q) conds.push(or(ilike(t.bookings.reference, `%${q}%`), ilike(t.bookings.recipientName, `%${q}%`), sql`${serviceNameSql} ILIKE ${`%${q}%`}`)!);
  const where = and(...conds);

  const sortField = sp(search, "sort");
  const dir = sp(search, "dir") === "asc" ? asc : desc;
  const orderBy =
    sortField === "reference" ? dir(t.bookings.reference) : sortField === "status" ? dir(t.bookings.status) : sortField === "service" ? dir(serviceNameSql) : scope === "upcoming" && !sortField ? asc(t.bookings.startsAt) : dir(t.bookings.startsAt);

  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ id: t.bookings.id, reference: t.bookings.reference, startsAt: t.bookings.startsAt, endsAt: t.bookings.endsAt, status: t.bookings.status, recipient: t.bookings.recipientName, service: serviceNameSql, pro: acceptedProSql })
      .from(t.bookings)
      .where(where)
      .orderBy(orderBy)
      .limit(size)
      .offset((page - 1) * size),
    db.select({ n: count() }).from(t.bookings).where(where),
  ]);

  const statusOptions = (scope === "upcoming" ? UPCOMING_STATUSES : scope === "history" ? [...FINAL_STATUSES, "confirmed", "in_progress"] : BOOKING_STATUSES.filter((s) => s !== "draft")).map((s) => ({ value: s, label: statusLabel(s) }));

  return (
    <Card padded={false}>
      <FilterBar base={base} search={search} placeholder="Search reference, service or person" filters={[{ name: "status", label: "Status", options: statusOptions }]} />
      {rows.length === 0 ? (
        <EmptyState
          icon={<CalendarX2 className="size-6" />}
          title={q || status ? "No bookings match your filters" : scope === "upcoming" ? "No upcoming appointments" : scope === "history" ? "No past bookings yet" : "No bookings yet"}
          description={q || status ? "Try a different search or clear the filters." : "When you book a service it will appear here with its status."}
          action={
            !q && !status && scope !== "history" ? (
              <LinkButton href="/customer/book/" variant="teal">
                <CalendarPlus aria-hidden className="size-4" /> Book a service
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <SortTh label="Reference" field="reference" base={base} search={search} />
              <SortTh label="Service" field="service" base={base} search={search} />
              <SortTh label="Date" field="date" base={base} search={search} />
              <Th>Time</Th>
              <Th>Professional</Th>
              <SortTh label="Status" field="status" base={base} search={search} />
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-canvas/60">
                <Td>
                  <Link href={`/customer/bookings/${r.reference}/`} className="font-mono text-xs font-semibold text-navy-900 hover:underline">
                    {r.reference}
                  </Link>
                </Td>
                <Td>
                  <p className="font-semibold text-navy-950">{r.service}</p>
                  <p className="text-xs text-muted">For {r.recipient}</p>
                </Td>
                <Td className="whitespace-nowrap">{fmtDate(r.startsAt, settings.timezone)}</Td>
                <Td className="whitespace-nowrap">
                  {fmtTime(r.startsAt, settings.timezone)} – {fmtTime(r.endsAt, settings.timezone)}
                </Td>
                <Td>{r.pro ?? <span className="text-muted">{["completed", "cancelled", "rejected"].includes(r.status) ? "—" : "Being arranged"}</span>}</Td>
                <Td>
                  <StatusBadge status={r.status} />
                </Td>
                <Td className="text-right">
                  <LinkButton href={`/customer/bookings/${r.reference}/`} variant="secondary" size="sm">
                    View
                  </LinkButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination base={base} search={search} page={page} pageSize={size} total={n} />
    </Card>
  );
}
