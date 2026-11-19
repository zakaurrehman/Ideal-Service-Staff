import { desc, eq } from "drizzle-orm";
import { Briefcase } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { addExperienceAction, deleteExperienceAction, saveSkillsAction } from "@/lib/actions/employee";
import { SKILL_SUGGESTIONS } from "@/lib/labels";
import { Card, EmptyState, PageHeader } from "@/components/app/ui";
import { ActionButton, ActionForm, Checkbox, Field, FormMessage, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "Skills & Qualifications" };

export default async function SkillsPage() {
  const v = await requireEmployee();
  const db = await getDb();
  const [skills, exp] = await Promise.all([
    db.select().from(t.employeeSkills).where(eq(t.employeeSkills.employeeId, v.id)),
    db.select().from(t.employeeExperience).where(eq(t.employeeExperience.employeeId, v.id)).orderBy(desc(t.employeeExperience.startDate)),
  ]);
  const mine = new Set(skills.map((s) => s.skill));
  const custom = [...mine].filter((s) => !SKILL_SUGGESTIONS.includes(s));
  const fmt = (d: string | null) => (d ? new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`)) : "Present");

  return (
    <>
      <PageHeader title="Skills & Qualifications" description="Your skills and work history help us match you with the right clients." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Skills">
          <ActionForm action={saveSkillsAction} className="space-y-4">
            <FormMessage />
            <div className="grid gap-2 sm:grid-cols-2">
              {SKILL_SUGGESTIONS.map((s) => (
                <Checkbox key={s} name="skill" value={s} label={s} defaultChecked={mine.has(s)} className="rounded-xl border border-line px-3 py-2.5" />
              ))}
            </div>
            <Field name="custom" label="Other skills (comma-separated)" defaultValue={custom.join(", ")} maxLength={400} />
            <Submit>Save skills</Submit>
          </ActionForm>
        </Card>
        <div className="space-y-6">
          <Card title="Work experience" padded={false}>
            {exp.length === 0 ? (
              <EmptyState compact icon={<Briefcase className="size-6" />} title="No experience added yet" />
            ) : (
              <ol className="divide-y divide-line">
                {exp.map((e) => (
                  <li key={e.id} className="flex gap-4 px-6 py-4">
                    <div className="flex-1 text-sm">
                      <p className="font-semibold text-navy-950">{e.title}</p>
                      <p className="text-navy-800">{e.organization}</p>
                      <p className="text-xs text-muted">
                        {fmt(e.startDate)} – {fmt(e.endDate)}
                      </p>
                      {e.description && <p className="mt-1 text-muted">{e.description}</p>}
                    </div>
                    <ActionButton action={deleteExperienceAction.bind(null, e.id)} variant="ghost" confirm={{ title: "Remove this experience?", cta: "Remove" }}>
                      Remove
                    </ActionButton>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card title="Add experience">
            <ActionForm action={addExperienceAction} className="grid gap-4 sm:grid-cols-2">
              <FormMessage className="sm:col-span-2" />
              <Field name="title" label="Role" required />
              <Field name="organization" label="Organization / family" required />
              <Field name="startDate" type="date" label="Start date" required />
              <Field name="endDate" type="date" label="End date" hint="Leave empty if current." />
              <TextArea name="description" label="What you did (optional)" rows={3} maxLength={1000} className="sm:col-span-2" />
              <div className="sm:col-span-2">
                <Submit variant="secondary">Add experience</Submit>
              </div>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
