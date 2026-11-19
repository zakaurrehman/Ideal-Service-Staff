import { saveServiceAction } from "@/lib/actions/admin";
import { ActionForm, Checkbox, Field, FormMessage, Select, Submit, TextArea } from "../forms";

type Svc = {
  id: string;
  name: string;
  slug: string;
  categoryId: string | null;
  summary: string;
  description: string;
  tasks: string[];
  defaultDurationMinutes: number;
  minDurationMinutes: number;
  maxDurationMinutes: number;
  isBookable: boolean;
  isActive: boolean;
  sortOrder: number;
  imagePath: string | null;
};

export function ServiceForm({ s, categories }: { s?: Svc; categories: { id: string; name: string }[] }) {
  return (
    <ActionForm action={saveServiceAction} className="grid gap-5 md:grid-cols-6">
      {s && <input type="hidden" name="id" value={s.id} />}
      <FormMessage className="md:col-span-6" />
      <Field name="name" label="Name" defaultValue={s?.name} required className="md:col-span-3" />
      <Field name="slug" label="URL slug" defaultValue={s?.slug} required className="md:col-span-2" hint="Used in /services/<slug>/" />
      <Field name="sortOrder" type="number" label="Order" defaultValue={s?.sortOrder ?? 0} min={0} max={999} className="md:col-span-1" />
      <Select name="categoryId" label="Category" defaultValue={s?.categoryId ?? ""} placeholder="None" options={categories.map((c) => ({ value: c.id, label: c.name }))} className="md:col-span-2" />
      <Field name="minDurationMinutes" type="number" label="Min visit (min)" defaultValue={s?.minDurationMinutes ?? 120} min={30} max={1440} step={30} className="md:col-span-1" />
      <Field name="defaultDurationMinutes" type="number" label="Default (min)" defaultValue={s?.defaultDurationMinutes ?? 240} min={30} max={1440} step={30} className="md:col-span-1" />
      <Field name="maxDurationMinutes" type="number" label="Max visit (min)" defaultValue={s?.maxDurationMinutes ?? 720} min={30} max={1440} step={30} className="md:col-span-2" />
      <TextArea name="summary" label="Short summary" defaultValue={s?.summary} rows={2} maxLength={300} required className="md:col-span-6" />
      <TextArea name="description" label="Description" defaultValue={s?.description} rows={6} maxLength={6000} className="md:col-span-6" hint="Separate paragraphs with a blank line." />
      <TextArea name="tasks" label="Typical support (one per line)" defaultValue={s?.tasks.join("\n")} rows={4} className="md:col-span-6" />
      <div className="md:col-span-3">
        {s?.imagePath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.imagePath} alt="" className="mb-3 h-28 w-full rounded-2xl object-cover" />
        )}
        <Field name="image" type="file" label={s?.imagePath ? "Replace image" : "Image"} accept=".jpg,.jpeg,.png,.webp" hint="JPG, PNG or WebP up to 2 MB." />
      </div>
      <div className="flex flex-col justify-end gap-3 md:col-span-3">
        <Checkbox name="isActive" label="Active (visible and bookable)" defaultChecked={s?.isActive ?? true} />
        <Checkbox name="isBookable" label="Customers can book this online" defaultChecked={s?.isBookable ?? true} />
      </div>
      <div className="md:col-span-6">
        <Submit variant="teal">{s ? "Save service" : "Create service"}</Submit>
      </div>
    </ActionForm>
  );
}
