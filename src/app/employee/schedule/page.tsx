import { and, eq, gt, lt } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { statusTone } from "@/lib/labels";
import { addDays, fmtTime, todayIn, zonedParts, zonedToUtc } from "@/lib/time";
import { PageHeader, sp, type Search } from "@/components/app/ui";
import { MonthCalendar, monthOf, monthRange, type CalEvent } from "@/components/app/Calendar";
import { svcName } from "@/components/app/employee/Assignments";

export const metadata = { title: "My Schedule" };

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Search> }) {
  const v = await requireEmployee();
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const today = todayIn(tz);
  const month = monthOf(sp(await searchParams, "month"), today);
  const { first, last } = monthRange(month);
  const from = zonedToUtc(first, 0, tz);
  const to = zonedToUtc(addDays(last, 1), 0, tz);

  const [visits, timeOff] = await Promise.all([
    db
      .select({ id: t.bookingAssignments.id, aStatus: t.bookingAssignments.status, status: t.bookings.status, startsAt: t.bookings.startsAt, city: t.bookings.city, service: svcName })
      .from(t.bookingAssignments)
      .innerJoin(t.bookings, eq(t.bookings.id, t.bookingAssignments.bookingId))
      .where(and(eq(t.bookingAssignments.employeeId, v.id), lt(t.bookings.startsAt, to), gt(t.bookings.endsAt, from))),
    db.select().from(t.availabilityBlocks).where(and(eq(t.availabilityBlocks.employeeId, v.id), lt(t.availabilityBlocks.startsAt, to), gt(t.availabilityBlocks.endsAt, from))),
  ]);

  const events: CalEvent[] = visits
    .filter((x) => x.aStatus === "offered" || x.aStatus === "accepted")
    .map((x) => ({
      id: x.id,
      date: zonedParts(x.startsAt, tz).date,
      time: fmtTime(x.startsAt, tz),
      label: `${x.service} · ${x.city}`,
      href: `/employee/assignments/${x.id}/`,
      tone: x.aStatus === "offered" ? "amber" : statusTone(x.status),
    }));
  for (const b of timeOff) {
    for (let d = zonedParts(b.startsAt, tz).date; d <= zonedParts(new Date(b.endsAt.getTime() - 1), tz).date; d = addDays(d, 1)) {
      if (d >= first && d <= last) events.push({ id: `${b.id}-${d}`, date: d, time: "", label: `Time off${b.reason ? ` — ${b.reason}` : ""}`, href: "/employee/availability/", tone: "gray" });
    }
  }

  return (
    <>
      <PageHeader title="My Schedule" description="Your offered and accepted visits, and time off. Amber = awaiting your response." />
      <MonthCalendar month={month} today={today} events={events} base="/employee/schedule/" />
    </>
  );
}
