import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Lock, MapPin } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { progressVisitAction, respondAssignmentAction } from "@/lib/actions/employee";
import { durationLabel } from "@/lib/booking/slots";
import { CARE_TYPES } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { fmtRange, tzAbbr } from "@/lib/time";
import { Alert, Card, DL, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionForm, FormMessage, Submit, TextArea } from "@/components/app/forms";

export default async function AssignmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await requireEmployee();
  const db = await getDb();
  // Authorisation in the query: the assignment must belong to this employee.
  const [row] = await db
    .select({ a: t.bookingAssignments, b: t.bookings })
    .from(t.bookingAssignments)
    .innerJoin(t.bookings, eq(t.bookings.id, t.bookingAssignments.bookingId))
    .where(and(eq(t.bookingAssignments.id, id), eq(t.bookingAssignments.employeeId, v.id)));
  if (!row) notFound();
  const { a, b } = row;
  const settings = await getSettings(db);
  const tz = b.timezone;
  const svc = await db.select().from(t.bookingServices).where(eq(t.bookingServices.bookingId, b.id));
  const accepted = a.status === "accepted";
  // Full address, access notes and instructions are only released after acceptance.
  const showPrivate = accepted && !["cancelled", "rejected"].includes(b.status);
  const duration = Math.round((b.endsAt.getTime() - b.startsAt.getTime()) / 60_000);
  const canStart = accepted && b.status === "confirmed";
  const canComplete = accepted && b.status === "in_progress";

  return (
    <>
      <PageHeader
        title={svc.map((s) => s.serviceName).join(", ")}
        crumbs={[{ label: "Assigned Bookings", href: "/employee/assignments/" }, { label: b.reference }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs">{b.reference}</span> <StatusBadge status={a.status === "offered" ? "offered" : a.status === "accepted" ? b.status : a.status} />
          </span>
        }
      />
      {a.status === "declined" || a.status === "withdrawn" ? (
        <Alert tone="navy" title={a.status === "declined" ? "You declined this assignment" : "This assignment was withdrawn by the office"}>It no longer appears on your schedule.</Alert>
      ) : null}
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Visit details">
          <DL
            items={[
              { label: "When", value: `${fmtRange(b.startsAt, b.endsAt, tz)} (${tzAbbr(tz, b.startsAt)})` },
              { label: "Visit length", value: durationLabel(duration) },
              { label: "Care type", value: CARE_TYPES.find((c) => c.value === b.careType)?.label ?? b.careType },
              { label: "Client", value: showPrivate ? b.recipientName : `${b.recipientName.split(" ")[0]} (full details after you accept)` },
              {
                label: "Location",
                value: (
                  <span className="flex items-start gap-1.5">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-700" />
                    {showPrivate ? `${b.addressLine1}${b.addressLine2 ? `, ${b.addressLine2}` : ""}, ${b.city}, ${b.region} ${b.postalCode}` : `${b.city}, ${b.region} ${b.postalCode}`}
                  </span>
                ),
              },
              { label: "Access notes", value: showPrivate ? (b.accessNotes ?? "—") : <Hidden /> },
              { label: "Client instructions", value: showPrivate ? (b.instructions ? <span className="whitespace-pre-wrap">{b.instructions}</span> : "—") : <Hidden /> },
            ]}
          />
        </Card>
        <div className="space-y-6">
          {a.status === "offered" && b.status === "assigned" && (
            <Card title="Your response" description="Please respond as soon as you can so we can confirm with the client.">
              <ActionForm action={respondAssignmentAction} className="space-y-4">
                <input type="hidden" name="assignmentId" value={a.id} />
                <FormMessage />
                <TextArea name="note" label="Note for the office (optional)" rows={2} maxLength={500} />
                <div className="grid grid-cols-2 gap-2">
                  <Submit variant="danger" name="decision" value="decline">
                    Decline
                  </Submit>
                  <Submit variant="teal" name="decision" value="accept">
                    Accept
                  </Submit>
                </div>
              </ActionForm>
            </Card>
          )}
          {(canStart || canComplete) && (
            <Card title="Visit progress" description={canStart ? `You can start from ${settings.employeeStartWindowMinutes} minutes before the scheduled time.` : "Mark the visit complete when you finish."}>
              <ActionForm action={progressVisitAction} className="space-y-4">
                <input type="hidden" name="bookingId" value={b.id} />
                <input type="hidden" name="to" value={canStart ? "in_progress" : "completed"} />
                <FormMessage />
                <Submit variant="teal" className="w-full">
                  {canStart ? "Start visit" : "Mark as completed"}
                </Submit>
              </ActionForm>
            </Card>
          )}
          {accepted && b.status === "accepted" && <Alert tone="teal" title="Accepted">The office will confirm this visit with the client.</Alert>}
        </div>
      </div>
    </>
  );
}

const Hidden = () => (
  <span className="inline-flex items-center gap-1.5 text-muted">
    <Lock aria-hidden className="size-3.5" /> Shown after you accept
  </span>
);
