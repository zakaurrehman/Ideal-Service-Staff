import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { saveSettingsAction } from "@/lib/actions/admin";
import { getSettings } from "@/lib/settings";
import { toHHMM } from "@/lib/time";
import { Card, PageHeader } from "@/components/app/ui";
import { ActionForm, Checkbox, Field, FormMessage, Select, Submit } from "@/components/app/forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaff("settings.manage");
  const s = await getSettings(await getDb());
  return (
    <>
      <PageHeader title="Settings" description="Booking rules for the whole platform. Changes apply immediately and are recorded in the audit log." />
      <Card>
        <ActionForm action={saveSettingsAction} className="grid gap-5 md:grid-cols-3">
          <FormMessage className="md:col-span-3" />
          <Select
            name="timezone"
            label="Business time zone"
            defaultValue={s.timezone}
            options={["America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York", "America/Phoenix", "Pacific/Honolulu", "America/Anchorage"].map((z) => ({ value: z, label: z.replace("_", " ") }))}
          />
          <Field name="bookingDayStart" type="time" label="Bookable from (daily)" defaultValue={toHHMM(s.bookingDayStartMinute)} step={900} />
          <Field name="bookingDayEnd" type="time" label="Visits must end by" defaultValue={toHHMM(s.bookingDayEndMinute)} step={900} />
          <Field name="bookingLeadHours" type="number" label="Minimum notice (hours)" defaultValue={s.bookingLeadHours} min={0} hint="How far ahead customers must book." />
          <Field name="bookingWindowDays" type="number" label="Booking window (days)" defaultValue={s.bookingWindowDays} min={1} hint="How far into the future customers can book." />
          <Select name="slotIntervalMinutes" label="Start-time interval" defaultValue={String(s.slotIntervalMinutes)} options={["15", "30", "60"].map((v) => ({ value: v, label: `${v} minutes` }))} />
          <Field name="cancellationNoticeHours" type="number" label="Requested cancellation notice (hours)" defaultValue={s.cancellationNoticeHours} min={0} hint="Shown to customers when they ask to cancel." />
          <Field name="maxActiveBookingsPerCustomer" type="number" label="Max upcoming bookings per customer" defaultValue={s.maxActiveBookingsPerCustomer} min={1} />
          <Field name="employeeStartWindowMinutes" type="number" label="Employees can start a visit (minutes early)" defaultValue={s.employeeStartWindowMinutes} min={0} />
          <Checkbox name="allowProfessionalSelection" label="Customers may choose a preferred professional" defaultChecked={s.allowProfessionalSelection} className="md:col-span-3" />
          <Checkbox name="requireVerifiedEmailToBook" label="Customers must confirm their email before booking" defaultChecked={s.requireVerifiedEmailToBook} className="md:col-span-3" />
          <div className="md:col-span-3">
            <Submit variant="teal">Save settings</Submit>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
