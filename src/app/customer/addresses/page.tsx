import { and, desc, eq, isNull } from "drizzle-orm";
import { MapPin, Star } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/session";
import { archiveAddressAction, saveAddressAction, setDefaultAddressAction } from "@/lib/actions/customer";
import { Badge, Card, EmptyState, PageHeader } from "@/components/app/ui";
import { ActionButton, ActionForm, Checkbox, Field, FormMessage, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "Addresses" };

type Addr = { id: string; label: string; line1: string; line2: string | null; city: string; region: string; postalCode: string; accessNotes: string | null; isDefault: boolean };

function AddressForm({ a }: { a?: Addr }) {
  return (
    <ActionForm action={saveAddressAction} className="grid gap-4 sm:grid-cols-6">
      {a && <input type="hidden" name="id" value={a.id} />}
      <FormMessage className="sm:col-span-6" />
      <Field name="label" label="Name" defaultValue={a?.label} placeholder="Home, Mom’s house…" required className="sm:col-span-6" />
      <Field name="line1" label="Street address" defaultValue={a?.line1} autoComplete="address-line1" required className="sm:col-span-6" />
      <Field name="line2" label="Apt, suite (optional)" defaultValue={a?.line2} autoComplete="address-line2" className="sm:col-span-6" />
      <Field name="city" label="City" defaultValue={a?.city} autoComplete="address-level2" required className="sm:col-span-3" />
      <Field name="region" label="State" defaultValue={a?.region ?? "CA"} maxLength={2} autoComplete="address-level1" required className="sm:col-span-1" />
      <Field name="postalCode" label="ZIP" defaultValue={a?.postalCode} inputMode="numeric" autoComplete="postal-code" required className="sm:col-span-2" />
      <TextArea name="accessNotes" label="Access notes (optional)" defaultValue={a?.accessNotes} rows={2} maxLength={500} hint="Parking, gate codes are best shared by phone." className="sm:col-span-6" />
      <Checkbox name="isDefault" label="Use as my default address" defaultChecked={a?.isDefault} className="sm:col-span-6" />
      <div className="sm:col-span-6">
        <Submit variant={a ? "secondary" : "primary"}>{a ? "Save address" : "Add address"}</Submit>
      </div>
    </ActionForm>
  );
}

export default async function Page() {
  const v = await requireCustomer();
  const db = await getDb();
  const rows = await db
    .select()
    .from(t.customerAddresses)
    .where(and(eq(t.customerAddresses.customerId, v.id), isNull(t.customerAddresses.archivedAt)))
    .orderBy(desc(t.customerAddresses.isDefault), desc(t.customerAddresses.createdAt));
  return (
    <>
      <PageHeader title="Addresses" description="Where our care professionals visit. Choose one when you book." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="space-y-4">
          {rows.length === 0 ? (
            <Card>
              <EmptyState icon={<MapPin className="size-6" />} title="No saved addresses" description="Add the address where care is needed — it makes booking quicker." />
            </Card>
          ) : (
            rows.map((a) => (
              <details key={a.id} className="group rounded-3xl border border-line bg-white shadow-soft open:shadow-lift">
                <summary className="flex cursor-pointer list-none items-center gap-4 px-6 py-4">
                  <span className="grid size-11 place-items-center rounded-2xl bg-navy-50 text-navy-700">
                    <MapPin aria-hidden className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold text-navy-950">
                      {a.label} {a.isDefault && <Badge tone="teal">Default</Badge>}
                    </span>
                    <span className="block truncate text-sm text-muted">
                      {a.line1}
                      {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.region} {a.postalCode}
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-teal-700 group-open:hidden">Edit</span>
                </summary>
                <div className="border-t border-line px-6 py-5">
                  <AddressForm a={a} />
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    {!a.isDefault && (
                      <ActionButton action={setDefaultAddressAction.bind(null, a.id)}>
                        <Star aria-hidden className="size-4" /> Make default
                      </ActionButton>
                    )}
                    <ActionButton action={archiveAddressAction.bind(null, a.id)} variant="danger" confirm={{ title: "Remove this address?", body: "Existing bookings keep their address.", cta: "Remove" }}>
                      Remove
                    </ActionButton>
                  </div>
                </div>
              </details>
            ))
          )}
        </div>
        <Card title="Add an address">
          <AddressForm />
        </Card>
      </div>
    </>
  );
}
