import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { adminCreateBookingAction } from "@/lib/actions/admin";
import { DURATION_OPTIONS, durationLabel } from "@/lib/booking/slots";
import { CARE_TYPES } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { todayIn, tzAbbr } from "@/lib/time";
import { Card, PageHeader } from "@/components/app/ui";
import { ActionForm, Field, FormMessage, Select, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "New booking" };

export default async function NewBooking() {
  await requireStaff("bookings.manage");
  const db = await getDb();
  const settings = await getSettings(db);
  const services = await db.select({ id: t.services.id, name: t.services.name }).from(t.services).where(and(eq(t.services.isActive, true), isNull(t.services.archivedAt))).orderBy(asc(t.services.sortOrder));
  return (
    <>
      <PageHeader title="New booking" crumbs={[{ label: "Bookings", href: "/admin/bookings/" }, { label: "New" }]} description="Book on behalf of a registered customer (e.g. after a phone call)." />
      <Card>
        <ActionForm action={adminCreateBookingAction} className="grid gap-5 md:grid-cols-6">
          <FormMessage className="md:col-span-6" />
          <Field name="customerEmail" type="email" label="Customer’s account email" required className="md:col-span-3" hint="The customer must already have an account." />
          <Select name="serviceId" label="Service" options={services.map((s) => ({ value: s.id, label: s.name }))} placeholder="Choose…" required className="md:col-span-3" />
          <Select name="careType" label="Care type" options={CARE_TYPES.map((c) => ({ value: c.value, label: c.label }))} placeholder="Choose…" required className="md:col-span-2" />
          <Field name="date" type="date" label="Date" min={todayIn(settings.timezone)} required className="md:col-span-2" />
          <Field name="time" type="time" label={`Start (${tzAbbr(settings.timezone)})`} step={settings.slotIntervalMinutes * 60} required className="md:col-span-1" />
          <Select name="durationMinutes" label="Length" defaultValue="240" options={DURATION_OPTIONS.map((d) => ({ value: String(d), label: durationLabel(d) }))} className="md:col-span-1" />
          <p className="text-sm font-semibold text-navy-900 md:col-span-6">Visit address</p>
          <Field name="line1" label="Street address" required className="md:col-span-4" />
          <Field name="line2" label="Apt / suite" className="md:col-span-2" />
          <Field name="city" label="City" required className="md:col-span-3" />
          <Field name="region" label="State" defaultValue="CA" maxLength={2} required className="md:col-span-1" />
          <Field name="postalCode" label="ZIP" required className="md:col-span-2" />
          <Field name="accessNotes" label="Access notes" className="md:col-span-6" />
          <TextArea name="instructions" label="Instructions" rows={3} maxLength={2000} className="md:col-span-6" />
          <Select
            name="status"
            label="Create as"
            defaultValue="pending_assignment"
            options={[
              { value: "pending_assignment", label: "Approved — ready to assign (customer is notified)" },
              { value: "draft", label: "Draft — not visible to staff queues yet" },
            ]}
            className="md:col-span-4"
          />
          <input type="hidden" name="addressId" value="" />
          <div className="md:col-span-6">
            <Submit variant="teal">Create booking</Submit>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
