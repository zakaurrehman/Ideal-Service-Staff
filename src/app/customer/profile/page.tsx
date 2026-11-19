import { eq } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/session";
import { saveCarePreferencesAction } from "@/lib/actions/customer";
import { Card, PageHeader } from "@/components/app/ui";
import { ProfileBasics } from "@/components/app/shared";
import { ActionForm, Checkbox, Field, FormMessage, Select, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "My Profile" };

export default async function Page() {
  const v = await requireCustomer();
  const db = await getDb();
  const [[profile], [customer], [prefs]] = await Promise.all([
    db.select().from(t.userProfiles).where(eq(t.userProfiles.userId, v.id)),
    db.select().from(t.customerProfiles).where(eq(t.customerProfiles.userId, v.id)),
    db.select().from(t.customerPreferences).where(eq(t.customerPreferences.customerId, v.id)),
  ]);
  return (
    <>
      <PageHeader title="My Profile" description="Your contact details and care preferences." />
      <div className="space-y-6">
        <ProfileBasics viewer={v} phone={profile?.phone ?? null} />
        <Card title="Care preferences" description="Helps us match the right professional. Optional.">
          <ActionForm action={saveCarePreferencesAction} className="grid gap-5 sm:grid-cols-2">
            <FormMessage className="sm:col-span-2" />
            <Select
              name="preferredContact"
              label="Preferred contact method"
              defaultValue={customer?.preferredContact ?? "phone"}
              options={[
                { value: "phone", label: "Phone call" },
                { value: "email", label: "Email" },
                { value: "whatsapp", label: "WhatsApp" },
              ]}
            />
            <Field name="preferredLanguage" label="Preferred language" defaultValue={prefs?.preferredLanguage} placeholder="e.g. English, Spanish" />
            <Select
              name="caregiverGenderPreference"
              label="Caregiver preference"
              defaultValue={prefs?.caregiverGenderPreference ?? "no_preference"}
              options={[
                { value: "no_preference", label: "No preference" },
                { value: "female", label: "Female caregiver" },
                { value: "male", label: "Male caregiver" },
              ]}
            />
            <Checkbox name="hasPets" label="There are pets in the home" defaultChecked={prefs?.hasPets} className="self-end pb-3" />
            <TextArea name="notes" label="Anything else we should know?" defaultValue={prefs?.notes} rows={3} maxLength={1000} className="sm:col-span-2" hint="Please don’t include medical records here." />
            <div className="sm:col-span-2">
              <Submit variant="secondary">Save preferences</Submit>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
