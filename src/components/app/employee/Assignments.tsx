import Link from "next/link";
import { and, asc, desc, eq, gt, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { CalendarX2, MapPin } from "lucide-react";
import { getDb, t } from "@/lib/db";
import type { Viewer } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtTime } from "@/lib/time";
import { Card, EmptyState, StatusBadge } from "../ui";

export const svcName = sql<string>`(SELECT bs.service_name FROM booking_services bs WHERE bs.booking_id = ${t.bookings.id} LIMIT 1)`;

export type Scope = "offered" | "active" | "upcoming" | "history" | "today";

/** The employee's own assignments only — the query is always scoped to employee_id = viewer. */
export async function employeeAssignments(viewer: Viewer, scope: Scope, limit = 50) {
  const db = await getDb();
  const settings = await getSettings(db);
  const now = new Date();
  const conds: SQL[] = [eq(t.bookingAssignments.employeeId, viewer.id)];
  if (scope === "offered") conds.push(eq(t.bookingAssignments.status, "offered"));
  if (scope === "active") conds.push(inArray(t.bookingAssignments.status, ["offered", "accepted"]), gt(t.bookings.endsAt, now));
  if (scope === "upcoming") conds.push(eq(t.bookingAssignments.status, "accepted"), gt(t.bookings.endsAt, now), inArray(t.bookings.status, ["accepted", "confirmed", "in_progress"]));
  if (scope === "history") conds.push(eq(t.bookingAssignments.status, "accepted"), or(lte(t.bookings.endsAt, now), inArray(t.bookings.status, ["completed", "cancelled"]))!);
  if (scope === "today") {
    const day = new Intl.DateTimeFormat("en-CA", { timeZone: settings.timezone }).format(now);
    conds.push(eq(t.bookingAssignments.status, "accepted"), sql`(${t.bookings.startsAt} AT TIME ZONE ${settings.timezone})::date = ${day}::date`);
  }
  const rows = await db
    .select({
      assignmentId: t.bookingAssignments.id,
      assignmentStatus: t.bookingAssignments.status,
      bookingId: t.bookings.id,
      reference: t.bookings.reference,
      status: t.bookings.status,
      startsAt: t.bookings.startsAt,
      endsAt: t.bookings.endsAt,
      city: t.bookings.city,
      postalCode: t.bookings.postalCode,
      service: svcName,
    })
    .from(t.bookingAssignments)
    .innerJoin(t.bookings, eq(t.bookings.id, t.bookingAssignments.bookingId))
    .where(and(...conds))
    .orderBy(scope === "history" ? desc(t.bookings.startsAt) : asc(t.bookings.startsAt))
    .limit(limit);
  return { rows, tz: settings.timezone };
}

export async function AssignmentList({ viewer, scope, empty }: { viewer: Viewer; scope: Scope; empty: { title: string; description: string } }) {
  const { rows, tz } = await employeeAssignments(viewer, scope);
  return (
    <Card padded={false}>
      {rows.length === 0 ? (
        <EmptyState icon={<CalendarX2 className="size-6" />} title={empty.title} description={empty.description} />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map((r, i) => (
            <li key={r.assignmentId} className="enter" style={{ ["--d" as string]: `${Math.min(i, 10) * 0.03}s` }}>
              <Link href={`/employee/assignments/${r.assignmentId}/`} className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-canvas/70">
                <div className="grid w-16 shrink-0 place-items-center rounded-2xl bg-navy-50 py-2 text-center text-navy-900">
                  <span className="text-[11px] font-bold uppercase">{fmtDate(r.startsAt, tz, { month: "short" })}</span>
                  <span className="font-display text-2xl font-semibold leading-none">{fmtDate(r.startsAt, tz, { day: "numeric" })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-950">{r.service}</p>
                  <p className="text-sm text-muted">
                    {fmtDate(r.startsAt, tz, { weekday: "long" })} · {fmtTime(r.startsAt, tz)} – {fmtTime(r.endsAt, tz)}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <MapPin aria-hidden className="size-3" /> {r.city} {r.postalCode} · <span className="font-mono">{r.reference}</span>
                  </p>
                </div>
                <StatusBadge status={r.assignmentStatus === "offered" ? "offered" : r.status} />
                <span className={`inline-flex h-9 items-center rounded-full px-4 text-sm font-semibold ${r.assignmentStatus === "offered" ? "bg-teal-700 text-white" : "border border-line bg-white text-navy-900"}`}>
                  {r.assignmentStatus === "offered" ? "Respond" : "Open"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
