import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { CalendarClock, MapPin, UserCheck } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { adminRescheduleAction, adminTransitionAction, approveRescheduleRequestAction, assignAction, declineRescheduleRequestAction, saveInternalNotesAction } from "@/lib/actions/admin";
import { findCandidates, liveAssignment } from "@/lib/booking/service";
import { nextStatuses } from "@/lib/booking/status";
import { durationLabel } from "@/lib/booking/slots";
import { CARE_TYPES, statusLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { fmtDateTime, fmtRange, minuteOfDayIn, toHHMM, tzAbbr, zonedParts } from "@/lib/time";
import { Alert, Badge, Card, DL, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionButton, ActionForm, Field, FormMessage, Select, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "Booking" };

export default async function AdminBooking({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await requireStaff("bookings.view");
  const db = await getDb();
  const [b] = await db.select().from(t.bookings).where(eq(t.bookings.id, id));
  if (!b) notFound();
  const settings = await getSettings(db);
  const tz = b.timezone;
  const [[customer], services, history, live, assignments] = await Promise.all([
    db.select({ first: t.userProfiles.firstName, last: t.userProfiles.lastName, phone: t.userProfiles.phone, email: t.users.email, id: t.users.id }).from(t.users).leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id)).where(eq(t.users.id, b.customerId)),
    db.select().from(t.bookingServices).where(eq(t.bookingServices.bookingId, b.id)),
    db
      .select({ h: t.bookingStatusHistory, first: t.userProfiles.firstName, last: t.userProfiles.lastName })
      .from(t.bookingStatusHistory)
      .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.bookingStatusHistory.changedBy))
      .where(eq(t.bookingStatusHistory.bookingId, b.id))
      .orderBy(asc(t.bookingStatusHistory.createdAt)),
    liveAssignment(db, b.id),
    db
      .select({ a: t.bookingAssignments, first: t.userProfiles.firstName, last: t.userProfiles.lastName })
      .from(t.bookingAssignments)
      .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.bookingAssignments.employeeId))
      .where(eq(t.bookingAssignments.bookingId, b.id))
      .orderBy(desc(t.bookingAssignments.createdAt)),
  ]);
  const serviceId = services[0]?.serviceId;
  const canAssign = can(v, "bookings.assign") && ["pending_assignment", "assigned", "accepted", "confirmed"].includes(b.status);
  const candidates = canAssign && serviceId ? await findCandidates(db, { serviceId, interval: { start: b.startsAt, end: b.endsAt }, tz, postalCode: b.postalCode, city: b.city, excludeBookingId: b.id, preferredId: b.preferredEmployeeId }) : [];
  const [preferred] = b.preferredEmployeeId ? await db.select().from(t.userProfiles).where(eq(t.userProfiles.userId, b.preferredEmployeeId)) : [];
  const manage = can(v, "bookings.manage");
  const options = manage ? nextStatuses(b.status, "admin").filter((s) => s !== "assigned" && (b.status !== "cancellation_requested" || s === "cancelled" || s === b.statusBeforeRequest)) : [];
  const duration = Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000);

  return (
    <>
      <PageHeader
        title={services.map((s) => s.serviceName).join(", ")}
        crumbs={[{ label: "Bookings", href: "/admin/bookings/" }, { label: b.reference }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{b.reference}</span> <StatusBadge status={b.status} /> <span className="text-xs">via {b.source} · created {fmtDateTime(b.createdAt, tz)}</span>
          </span>
        }
      />
      <div className="space-y-3">
        {b.status === "cancellation_requested" && (
          <Alert tone="amber" title="The customer asked to cancel">
            {b.cancellationReason ?? "No reason given."} Choose “Cancelled” to approve, or “{statusLabel(b.statusBeforeRequest)}” to decline.
          </Alert>
        )}
        {b.rescheduleRequestedAt && b.rescheduleStartsAt && manage && (
          <Alert
            tone="amber"
            title={`Reschedule requested → ${fmtRange(b.rescheduleStartsAt, b.rescheduleEndsAt!, tz)}`}
            action={
              <div className="flex gap-2">
                <ActionButton action={approveRescheduleRequestAction.bind(null, b.id)} variant="teal" confirm={{ title: "Approve the new time?", body: "The assigned professional is kept only if they’re still available.", cta: "Approve" }}>
                  Approve
                </ActionButton>
                <ActionButton action={declineRescheduleRequestAction.bind(null, b.id)} variant="secondary">
                  Decline
                </ActionButton>
              </div>
            }
          >
            {b.rescheduleReason ?? "No reason given."}
          </Alert>
        )}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Booking details">
            <DL
              items={[
                { label: "Appointment", value: `${fmtRange(b.startsAt, b.endsAt, tz)} (${tzAbbr(tz, b.startsAt)})` },
                { label: "Visit length", value: durationLabel(duration) },
                { label: "Customer", value: customer ? <Link className="font-semibold text-teal-700 hover:underline" href={`/admin/customers/${customer.id}/`}>{customer.first} {customer.last}</Link> : "—" },
                { label: "Contact", value: customer ? `${customer.email}${customer.phone ? ` · ${customer.phone}` : ""}` : "—" },
                { label: "Care for", value: b.recipientName },
                { label: "Care type", value: CARE_TYPES.find((c) => c.value === b.careType)?.label ?? b.careType },
                { label: "Location", value: <span className="flex items-start gap-1.5"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-700" />{b.addressLine1}{b.addressLine2 ? `, ${b.addressLine2}` : ""}, {b.city}, {b.region} {b.postalCode}</span> },
                { label: "Access notes", value: b.accessNotes ?? "—" },
                { label: "Customer’s preferred professional", value: preferred ? `${preferred.firstName} ${preferred.lastName}` : "No preference" },
                { label: "Instructions", value: b.instructions ? <span className="whitespace-pre-wrap">{b.instructions}</span> : "—" },
              ]}
            />
          </Card>

          {canAssign && (
            <Card title="Assign a professional" description="Eligible = approved, approved for this service, within working hours, no time off, no overlapping visit. Ranked: customer preference → serves this area → fewest upcoming visits.">
              {live && (
                <p className="mb-4 flex items-center gap-2 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-950">
                  <UserCheck aria-hidden className="size-4" /> Currently: <strong>{live.firstName} {live.lastName}</strong> <StatusBadge status={live.status} />
                </p>
              )}
              {candidates.length === 0 ? (
                <p className="text-sm text-muted">No approved professionals yet. Approve employees in Employee Verification first.</p>
              ) : (
                <ActionForm action={assignAction} className="space-y-3">
                  <input type="hidden" name="bookingId" value={b.id} />
                  <FormMessage />
                  <fieldset className="max-h-96 space-y-2 overflow-y-auto pr-1">
                    <legend className="sr-only">Professional</legend>
                    {candidates.map((c) => (
                      <label key={c.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 text-sm ${c.eligible ? "border-line hover:border-teal-300" : "cursor-not-allowed border-line/60 bg-canvas/60 opacity-70"}`}>
                        <input type="radio" name="employeeId" value={c.id} disabled={!c.eligible || c.id === live?.employeeId} className="mt-1 accent-teal-700" />
                        <span className="flex-1">
                          <span className="flex flex-wrap items-center gap-2 font-semibold text-navy-950">
                            {c.name}
                            {c.preferred && <Badge tone="teal">Customer’s choice</Badge>}
                            {c.areaMatch && <Badge tone="navy">Serves this area</Badge>}
                            {c.id === live?.employeeId && <Badge tone="gray">Current</Badge>}
                          </span>
                          <span className="text-xs text-muted">{c.eligible ? `Available · ${c.upcomingCount} upcoming visit(s)` : c.reasons.join(" · ")}</span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <Submit variant="teal">{live ? "Reassign" : "Assign & notify"}</Submit>
                </ActionForm>
              )}
            </Card>
          )}

          <Card title="History">
            <ol className="space-y-4">
              {history.map(({ h, first, last }) => (
                <li key={h.id} className="flex gap-4 text-sm">
                  <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-teal-500" />
                  <div>
                    <p className="text-navy-950">
                      {h.fromStatus ? `${statusLabel(h.fromStatus)} → ` : ""}
                      <span className="font-semibold">{statusLabel(h.toStatus)}</span>
                    </p>
                    {h.note && <p className="text-muted">{h.note}</p>}
                    <p className="text-xs text-muted">
                      {first ? `${first} ${last}` : h.actor} · {fmtDateTime(h.createdAt, tz)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {assignments.length > 0 && (
              <div className="mt-6 border-t border-line pt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">Assignments</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {assignments.map(({ a, first, last }) => (
                    <li key={a.id} className="flex flex-wrap items-center gap-2">
                      {first} {last} <StatusBadge status={a.status} /> <span className="text-xs text-muted">{fmtDateTime(a.createdAt, tz)}{a.responseNote ? ` · “${a.responseNote}”` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {options.length > 0 && (
            <Card title="Change status">
              <ActionForm action={adminTransitionAction} className="space-y-4">
                <input type="hidden" name="bookingId" value={b.id} />
                <FormMessage />
                <Select name="to" label="New status" options={options.map((s) => ({ value: s, label: statusLabel(s) }))} placeholder="Choose…" required />
                <TextArea name="note" label="Note (shared with the customer for cancellations/declines)" rows={2} maxLength={1000} />
                <Submit>Update status</Submit>
              </ActionForm>
            </Card>
          )}
          {manage && !["completed", "cancelled", "rejected", "in_progress"].includes(b.status) && (
            <Card title={<span className="flex items-center gap-2"><CalendarClock aria-hidden className="size-4 text-teal-700" /> Reschedule</span>} description={`Times in ${tzAbbr(tz)}.`}>
              <ActionForm action={adminRescheduleAction} className="space-y-3">
                <input type="hidden" name="bookingId" value={b.id} />
                <FormMessage />
                <div className="grid gap-3">
                  <Field name="date" type="date" label="Date" defaultValue={zonedParts(b.startsAt, tz).date} required />
                  <Field name="time" type="time" label="Start" defaultValue={toHHMM(minuteOfDayIn(b.startsAt, tz))} step={settings.slotIntervalMinutes * 60} required />
                </div>
                <Field name="duration" type="number" label="Length (minutes)" defaultValue={duration} min={30} max={1440} step={30} required />
                <Submit variant="secondary" className="w-full">
                  Save new time
                </Submit>
              </ActionForm>
            </Card>
          )}
          {manage && (
            <Card title="Internal notes" description="Staff only — never shown to customers or employees.">
              <ActionForm action={saveInternalNotesAction} className="space-y-3">
                <input type="hidden" name="bookingId" value={b.id} />
                <FormMessage />
                <TextArea name="internalNotes" label={<span className="sr-only">Internal notes</span>} defaultValue={b.internalNotes} rows={5} maxLength={4000} />
                <Submit variant="secondary">Save notes</Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
