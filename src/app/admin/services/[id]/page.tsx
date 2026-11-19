import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { deletePricingAction, savePricingAction } from "@/lib/actions/admin";
import { money } from "@/lib/time";
import { Alert, Card, PageHeader, sp, type Search } from "@/components/app/ui";
import { ActionButton, ActionForm, Field, FormMessage, Select, Submit } from "@/components/app/forms";
import { ServiceForm } from "@/components/app/admin/ServiceForm";

export const metadata = { title: "Edit service" };

export default async function EditService({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Search> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireStaff("services.manage");
  const db = await getDb();
  const [s] = await db.select().from(t.services).where(eq(t.services.id, id));
  if (!s) notFound();
  const [categories, prices] = await Promise.all([
    db.select({ id: t.serviceCategories.id, name: t.serviceCategories.name }).from(t.serviceCategories).orderBy(asc(t.serviceCategories.sortOrder)),
    db.select().from(t.servicePricing).where(eq(t.servicePricing.serviceId, id)),
  ]);
  return (
    <>
      <PageHeader title={s.name} crumbs={[{ label: "Services", href: "/admin/services/" }, { label: s.name }]} />
      {sp(await searchParams, "created") && (
        <div className="mb-6">
          <Alert tone="teal">Service created.</Alert>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <ServiceForm s={s} categories={categories} />
        </Card>
        <Card title="Pricing" description="Optional. Nothing is shown publicly unless you add a price.">
          <ul className="mb-5 space-y-2 text-sm">
            {prices.length === 0 && <li className="text-muted">No prices published.</li>}
            {prices.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                <span>
                  <span className="font-semibold">{p.label}</span> — {money(p.amountCents, p.currency)} / {p.unit}
                </span>
                <ActionButton action={deletePricingAction.bind(null, p.id, id)} variant="ghost">
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
          <ActionForm action={savePricingAction} className="space-y-3">
            <input type="hidden" name="serviceId" value={id} />
            <FormMessage />
            <Field name="label" label="Label" placeholder="Standard rate" />
            <div className="grid grid-cols-2 gap-3">
              <Field name="amount" type="number" label="Amount (USD)" min={0} step="0.01" />
              <Select name="unit" label="Per" options={["hour", "visit", "day", "week"].map((u) => ({ value: u, label: u }))} />
            </div>
            <Submit variant="secondary">Add price</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
