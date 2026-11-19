import { and, gt, lt, notInArray, sql } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { statusTone } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { addDays, fmtTime, todayIn, zonedParts, zonedToUtc } from "@/lib/time";
import { PageHeader, sp, type Search } from "@/components/app/ui";
import { MonthCalendar, monthOf, monthRange, type CalEvent } from "@/components/app/Calendar";

export const metadata = { title: "Calendar" };

export default async function AdminCalendar({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  await requireStaff("bookings.view");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const today = todayIn(tz);
  const month = monthOf(sp(search, "month"), today);
  const { first, last } = monthRange(month);
  const showCancelled = sp(search, "cancelled") === "1";
  const rows = await db
    .select({
      id: t.bookings.id,
      startsAt: t.bookings.startsAt,
      status: t.bookings.status,
      reference: t.bookings.reference,
      service: sql<string>`(SELECT bs.service_name FROM booking_services bs WHERE bs.booking_id = ${t.bookings.id} LIMIT 1)`,
      pro: sql<string | null>`(SELECT up.first_name FROM booking_assignments ba JOIN user_profiles up ON up.user_id = ba.employee_id WHERE ba.booking_id = ${t.bookings.id} AND ba.status IN ('offered','accepted') LIMIT 1)`,
    })
    .from(t.bookings)
    .where(and(lt(t.bookings.startsAt, zonedToUtc(addDays(last, 1), 0, tz)), gt(t.bookings.endsAt, zonedToUtc(first, 0, tz)), ...(showCancelled ? [] : [notInArray(t.bookings.status, ["cancelled", "rejected", "draft"])])));
  const events: CalEvent[] = rows
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .map((r) => ({ id: r.id, date: zonedParts(r.startsAt, tz).date, time: fmtTime(r.startsAt, tz), label: `${r.service}${r.pro ? ` · ${r.pro}` : " · unassigned"}`, href: `/admin/bookings/${r.id}/`, tone: statusTone(r.status) }));
  return (
    <>
      <PageHeader
        title="Calendar"
        description={
          <>
            {rows.length} booking{rows.length === 1 ? "" : "s"} this month. Colour = status (amber needs action, teal confirmed).{" "}
            <a className="font-semibold text-teal-700 underline" href={`/admin/calendar/?month=${month}${showCancelled ? "" : "&cancelled=1"}`}>
              {showCancelled ? "Hide" : "Show"} cancelled
            </a>
          </>
        }
      />
      <MonthCalendar month={month} today={today} events={events} base="/admin/calendar/" extraQuery={showCancelled ? "&cancelled=1" : ""} />
    </>
  );
}
