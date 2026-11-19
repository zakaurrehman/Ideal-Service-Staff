import { and, asc, eq, gt } from "drizzle-orm";
import { CalendarOff } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { addTimeOffAction, deleteTimeOffAction, saveWeeklyHoursAction } from "@/lib/actions/employee";
import { getSettings } from "@/lib/settings";
import { fmtDate, todayIn, toHHMM, tzAbbr } from "@/lib/time";
import { Card, EmptyState, PageHeader } from "@/components/app/ui";
import { ActionButton, ActionForm, Checkbox, Field, FormMessage, Submit } from "@/components/app/forms";

export const metadata = { title: "Availability" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function AvailabilityPage() {
  const v = await requireEmployee();
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const [hours, blocks] = await Promise.all([
    db.select().from(t.employeeAvailability).where(eq(t.employeeAvailability.employeeId, v.id)),
    db.select().from(t.availabilityBlocks).where(and(eq(t.availabilityBlocks.employeeId, v.id), gt(t.availabilityBlocks.endsAt, new Date()))).orderBy(asc(t.availabilityBlocks.startsAt)),
  ]);
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const today = todayIn(tz);

  return (
    <>
      <PageHeader title="Availability" description={`Set the days and hours you can work (${tzAbbr(tz)}) and block dates you’re unavailable. You’ll only be offered visits that fit.`} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card title="Weekly working hours">
          <ActionForm action={saveWeeklyHoursAction} className="space-y-3">
            <FormMessage />
            {DAYS.map((name, d) => {
              const h = byDay.get(d);
              return (
                <div key={name} className="grid grid-cols-[8rem_1fr_1fr] items-end gap-3 rounded-2xl border border-line p-3 sm:grid-cols-[10rem_1fr_1fr]">
                  <Checkbox name={`on-${d}`} label={<span className="font-semibold">{name}</span>} defaultChecked={Boolean(h)} className="self-center" />
                  <Field name={`start-${d}`} type="time" label={<span className="text-xs">From</span>} defaultValue={h ? toHHMM(h.startMinute) : "08:00"} step={900} />
                  <Field name={`end-${d}`} type="time" label={<span className="text-xs">Until</span>} defaultValue={h ? toHHMM(h.endMinute) : "17:00"} step={900} />
                </div>
              );
            })}
            <Submit>Save working hours</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-6">
          <Card title="Add time off">
            <ActionForm action={addTimeOffAction} className="space-y-4">
              <FormMessage />
              <div className="grid grid-cols-2 gap-3">
                <Field name="from" type="date" label="From" min={today} required />
                <Field name="to" type="date" label="Until" min={today} />
              </div>
              <Field name="reason" label="Reason (optional)" maxLength={200} placeholder="Vacation, appointment…" />
              <Submit variant="secondary" className="w-full">
                Block these dates
              </Submit>
            </ActionForm>
          </Card>
          <Card title="Upcoming time off" padded={false}>
            {blocks.length === 0 ? (
              <EmptyState compact icon={<CalendarOff className="size-6" />} title="No time off planned" />
            ) : (
              <ul className="divide-y divide-line">
                {blocks.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 px-6 py-3.5 text-sm">
                    <div className="flex-1">
                      <p className="font-semibold text-navy-950">
                        {fmtDate(b.startsAt, tz)} – {fmtDate(new Date(b.endsAt.getTime() - 1), tz)}
                      </p>
                      {b.reason && <p className="text-muted">{b.reason}</p>}
                    </div>
                    <ActionButton action={deleteTimeOffAction.bind(null, b.id)} variant="ghost">
                      Remove
                    </ActionButton>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
