import { eq } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { saveProfessionalProfileAction } from "@/lib/actions/employee";
import { Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { ProfileBasics } from "@/components/app/shared";
import { ActionForm, Checkbox, Field, FormMessage, Select, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "My Profile" };

export default async function EmployeeProfile() {
  const v = await requireEmployee();
  const db = await getDb();
  const [[profile], [emp], areas] = await Promise.all([
    db.select().from(t.userProfiles).where(eq(t.userProfiles.userId, v.id)),
    db.select().from(t.employeeProfiles).where(eq(t.employeeProfiles.userId, v.id)),
    db.select().from(t.employeeServiceAreas).where(eq(t.employeeServiceAreas.employeeId, v.id)),
  ]);
  return (
    <>
      <PageHeader title="My Profile" description={<span className="flex items-center gap-2">Verification: <StatusBadge status={emp?.verificationStatus} /></span>} />
      <div className="space-y-6">
        <ProfileBasics viewer={v} phone={profile?.phone ?? null} />
        <Card title="Professional profile" description="Clients see your first name, photo, headline, summary and skills once you’re assigned to them.">
          <ActionForm action={saveProfessionalProfileAction} className="grid gap-5 sm:grid-cols-2">
            <FormMessage className="sm:col-span-2" />
            <Field name="headline" label="Headline" defaultValue={emp?.headline} maxLength={120} placeholder="e.g. Certified Home Health Aide" className="sm:col-span-2" />
            <TextArea name="bio" label="About you" defaultValue={emp?.bio} rows={4} maxLength={2000} className="sm:col-span-2" />
            <Field name="yearsExperience" type="number" label="Years of caregiving experience" defaultValue={emp?.yearsExperience} min={0} max={60} />
            <Select
              name="employmentType"
              label="Preferred employment"
              defaultValue={emp?.employmentType ?? ""}
              placeholder="Choose…"
              options={[
                { value: "full-time", label: "Full-time" },
                { value: "part-time", label: "Part-time" },
                { value: "per-diem", label: "Per diem / on-call" },
                { value: "live-in", label: "Live-in" },
              ]}
            />
            <Field name="city" label="Home city" defaultValue={emp?.city} />
            <Field name="areas" label="Areas you can work in" defaultValue={areas.map((a) => a.area).join(", ")} hint="Cities or ZIP codes, separated by commas." />
            <Checkbox name="hasTransportation" label="I have reliable transportation" defaultChecked={emp?.hasTransportation ?? false} />
            <Checkbox name="workAuthorized" label="I’m authorized to work in the U.S." defaultChecked={emp?.workAuthorized ?? false} />
            <div className="sm:col-span-2">
              <Submit>Save professional profile</Submit>
            </div>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
