import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { CalendarClock, MapPin, UserRound } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/session";
import { cancelBookingAction, requestRescheduleAction } from "@/lib/actions/customer";
import { customerCanCancelDirectly, customerCanRequestChange } from "@/lib/booking/status";
import { durationLabel } from "@/lib/booking/slots";
import { CARE_TYPES, statusLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { bookingWindow } from "@/lib/booking/slots";
import { fmtDateTime, fmtRange, tzAbbr } from "@/lib/time";
import { Alert, Card, DL, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionForm, Field, FormMessage, Submit, TextArea } from "@/components/app/forms";
import { Avatar } from "@/components/app/AppShell";

export default async function BookingDetail({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params;
  const v = await requireCustomer();
  const db = await getDb();
  // Ownership enforced in the query itself.
  const [b] = await db.select().from(t.bookings).where(and(eq(t.bookings.reference, reference.toUpperCase()), eq(t.bookings.customerId, v.id)));
  if (!b) notFound();
  const settings = await getSettings(db);
  const tz = b.timezone;
  const [svc, history, [pro]] = await Promise.all([
    db.select().from(t.bookingServices).where(eq(t.bookingServices.bookingId, b.id)),
    db.select().from(t.bookingStatusHistory).where(eq(t.bookingStatusHistory.bookingId, b.id)).orderBy(asc(t.bookingStatusHistory.createdAt)),
    db
      .select({ firstName: t.userProfiles.firstName, lastName: t.userProfiles.lastName, avatar: t.userProfiles.avatarFileId, headline: t.employeeProfiles.headline, years: t.employeeProfiles.yearsExperience })
      .from(t.bookingAssignments)
      .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.bookingAssignments.employeeId))
      .innerJoin(t.employeeProfiles, eq(t.employeeProfiles.userId, t.bookingAssignments.employeeId))
      .where(and(eq(t.bookingAssignments.bookingId, b.id), eq(t.bookingAssignments.status, "accepted"))),
  ]);
  const duration = Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000);
  const canCancel = customerCanCancelDirectly(b.status) || customerCanRequestChange(b.status);
  const canReschedule = (customerCanRequestChange(b.status) || b.status === "pending_review") && !b.rescheduleRequestedAt;
  const win = bookingWindow(settings);

  return (
    <>
      <PageHeader
        title={svc.map((s) => s.serviceName).join(", ")}
        crumbs={[{ label: "My Bookings", href: "/customer/bookings/" }, { label: b.reference }]}
        description={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{b.reference}</span> <StatusBadge status={b.status} /></span>}
      />
      <div className="space-y-4">
        {b.status === "cancellation_requested" && <Alert tone="amber" title="Cancellation requested">Our team will confirm the cancellation shortly.</Alert>}
        {b.rescheduleRequestedAt && b.rescheduleStartsAt && (
          <Alert tone="amber" title="Reschedule requested">
            You asked to move this visit to {fmtRange(b.rescheduleStartsAt, b.rescheduleEndsAt!, tz)}. We’ll confirm the new time.
          </Alert>
        )}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Appointment details">
            <DL
              items={[
                { label: "Date & time", value: `${fmtRange(b.startsAt, b.endsAt, tz)} (${tzAbbr(tz, b.startsAt)})` },
                { label: "Visit length", value: durationLabel(duration) },
                { label: "Care type", value: CARE_TYPES.find((c) => c.value === b.careType)?.label ?? b.careType },
                { label: "Care for", value: b.recipientName },
                {
                  label: "Location",
                  value: (
                    <span className="flex items-start gap-1.5">
                      <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-700" />
                      <span>
                        {b.addressLine1}
                        {b.addressLine2 ? `, ${b.addressLine2}` : ""}, {b.city}, {b.region} {b.postalCode}
                      </span>
                    </span>
                  ),
                },
                { label: "Requested", value: fmtDateTime(b.createdAt, tz) },
                { label: "Instructions for the team", value: b.instructions ? <span className="whitespace-pre-wrap">{b.instructions}</span> : "—" },
              ]}
            />
          </Card>

          <Card title="Status timeline">
            <ol className="space-y-5">
              {history.map((h, i) => (
                <li key={h.id} className="enter flex gap-4" style={{ ["--d" as string]: `${i * 0.05}s` }}>
                  <span aria-hidden className={`mt-1 size-3.5 shrink-0 rounded-full ${i === history.length - 1 ? "bg-teal-500 ring-4 ring-teal-100" : "border-2 border-navy-200 bg-white"}`} />
                  <div className="text-sm">
                    <p className="font-semibold text-navy-950">{statusLabel(h.toStatus)}</p>
                    {h.note && h.actor !== "admin" && <p className="text-muted">{h.note}</p>}
                    <p className="text-xs text-muted">{fmtDateTime(h.createdAt, tz)}</p>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Your care professional">
            {pro ? (
              <div className="flex items-center gap-4">
                <Avatar name={`${pro.firstName} ${pro.lastName}`} fileId={pro.avatar} size={56} />
                <div>
                  <p className="font-semibold text-navy-950">
                    {pro.firstName} {pro.lastName.charAt(0)}.
                  </p>
                  {pro.headline && <p className="text-sm text-muted">{pro.headline}</p>}
                  {pro.years ? <p className="text-xs text-muted">{pro.years}+ years’ experience</p> : null}
                </div>
              </div>
            ) : (
              <p className="flex items-start gap-3 text-sm text-muted">
                <UserRound aria-hidden className="size-5 shrink-0 text-teal-700" />
                {["cancelled", "rejected"].includes(b.status) ? "No professional is assigned." : "We’re arranging the right professional for this visit. You’ll be notified as soon as someone is confirmed."}
              </p>
            )}
          </Card>

          {canReschedule && (
            <Card title="Request a new time" description={`Times are ${tzAbbr(tz)}. Our team confirms every change.`}>
              <ActionForm action={requestRescheduleAction} className="space-y-4">
                <input type="hidden" name="bookingId" value={b.id} />
                <FormMessage />
                <div className="grid gap-3">
                  <Field name="date" type="date" label="Date" min={win.first} max={win.last} required />
                  <Field name="time" type="time" label="Start time" step={settings.slotIntervalMinutes * 60} required />
                </div>
                <TextArea name="reason" label="Reason (optional)" rows={2} maxLength={1000} />
                <Submit variant="secondary" className="w-full">
                  <CalendarClock aria-hidden className="size-4" /> Request new time
                </Submit>
              </ActionForm>
            </Card>
          )}

          {canCancel && (
            <Card title={customerCanCancelDirectly(b.status) ? "Cancel this request" : "Request cancellation"} description={customerCanCancelDirectly(b.status) ? "This request hasn’t been processed yet, so it will be cancelled immediately." : `Please give at least ${settings.cancellationNoticeHours} hours’ notice where possible.`}>
              <ActionForm action={cancelBookingAction} className="space-y-4">
                <input type="hidden" name="bookingId" value={b.id} />
                <FormMessage />
                <TextArea name="reason" label="Reason (optional)" rows={2} maxLength={1000} />
                <Submit variant="danger" className="w-full">
                  {customerCanCancelDirectly(b.status) ? "Cancel request" : "Request cancellation"}
                </Submit>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
