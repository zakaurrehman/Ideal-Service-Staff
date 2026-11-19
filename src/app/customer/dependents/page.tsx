import { and, asc, eq, isNull } from "drizzle-orm";
import { Users } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/session";
import { archiveDependentAction, saveDependentAction } from "@/lib/actions/customer";
import { RELATIONSHIPS } from "@/lib/labels";
import { Card, EmptyState, PageHeader } from "@/components/app/ui";
import { ActionButton, ActionForm, Field, FormMessage, Select, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "My Family / Dependents" };

function DependentForm({ d }: { d?: { id: string; firstName: string; lastName: string; relationship: string; supportNotes: string | null } }) {
  return (
    <ActionForm action={saveDependentAction} className="grid gap-4 sm:grid-cols-2">
      {d && <input type="hidden" name="id" value={d.id} />}
      <FormMessage className="sm:col-span-2" />
      <Field name="firstName" label="First name" defaultValue={d?.firstName} required />
      <Field name="lastName" label="Last name" defaultValue={d?.lastName} required />
      <Select name="relationship" label="Relationship to you" defaultValue={d?.relationship} options={RELATIONSHIPS.map((r) => ({ value: r, label: r }))} placeholder="Choose…" required className="sm:col-span-2" />
      <TextArea
        name="supportNotes"
        label="Support preferences (optional)"
        defaultValue={d?.supportNotes}
        rows={3}
        maxLength={1000}
        className="sm:col-span-2"
        hint="Routines, interests or how they like to be supported. Please don’t include medical records — share those directly with our care team."
      />
      <div className="sm:col-span-2">
        <Submit variant={d ? "secondary" : "primary"}>{d ? "Save changes" : "Add family member"}</Submit>
      </div>
    </ActionForm>
  );
}

export default async function Page() {
  const v = await requireCustomer();
  const db = await getDb();
  const rows = await db
    .select()
    .from(t.customerDependents)
    .where(and(eq(t.customerDependents.customerId, v.id), isNull(t.customerDependents.archivedAt)))
    .orderBy(asc(t.customerDependents.createdAt));
  return (
    <>
      <PageHeader title="My Family / Dependents" description="People you book care for. Only you and our authorised staff can see these details." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-4">
          {rows.length === 0 ? (
            <Card>
              <EmptyState icon={<Users className="size-6" />} title="No family members added" description="Add a parent, spouse or loved one to book care on their behalf." />
            </Card>
          ) : (
            rows.map((d) => (
              <details key={d.id} className="group rounded-3xl border border-line bg-white shadow-soft open:shadow-lift">
                <summary className="flex cursor-pointer list-none items-center gap-4 px-6 py-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-teal-50 font-bold text-teal-800">
                    {d.firstName[0]}
                    {d.lastName[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-navy-950">
                      {d.firstName} {d.lastName}
                    </span>
                    <span className="text-sm text-muted">{d.relationship}</span>
                  </span>
                  <span className="text-sm font-semibold text-teal-700 group-open:hidden">Edit</span>
                </summary>
                <div className="border-t border-line px-6 py-5">
                  <DependentForm d={d} />
                  <div className="mt-4 border-t border-line pt-4">
                    <ActionButton action={archiveDependentAction.bind(null, d.id)} variant="danger" confirm={{ title: `Remove ${d.firstName}?`, body: "Past bookings keep their details. You can add them again at any time.", cta: "Remove" }}>
                      Remove
                    </ActionButton>
                  </div>
                </div>
              </details>
            ))
          )}
        </div>
        <Card title="Add a family member">
          <DependentForm />
        </Card>
      </div>
    </>
  );
}
