import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { resetTemplateAction, saveTemplateAction } from "@/lib/actions/admin";
import { getTemplate } from "@/lib/email/send";
import { TEMPLATES, renderEmail, type TemplateKey } from "@/lib/email/templates";
import { Card, PageHeader } from "@/components/app/ui";
import { ActionButton, ActionForm, Field, FormMessage, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "Edit template" };

const SAMPLE: Record<string, string> = { firstName: "Alex", reference: "ISS-ABC123", service: "Companion Caregivers", when: "Mon, Dec 1, 2026 · 9:00 AM – 1:00 PM", status: "Confirmed", message: "Your visit is confirmed.", url: "https://idealservicestaff.com/", roleName: "Admin", subject: "Question about my booking", title: "Office hours update", body: "Example announcement text." };

export default async function EditTemplate({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  if (!(key in TEMPLATES)) notFound();
  await requireStaff("templates.manage");
  const tpl = await getTemplate(await getDb(), key as TemplateKey);
  const def = TEMPLATES[key as TemplateKey];
  const preview = renderEmail(tpl, SAMPLE);
  return (
    <>
      <PageHeader title={def.name} crumbs={[{ label: "Email Templates", href: "/admin/templates/" }, { label: def.name }]} description={<>Variables: {def.vars.map((v) => <code key={v} className="mr-1 rounded bg-canvas px-1.5 py-0.5 text-xs">{`{{${v}}}`}</code>)}</>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Edit">
          <ActionForm action={saveTemplateAction} className="space-y-4">
            <input type="hidden" name="key" value={key} />
            <FormMessage />
            <Field name="subject" label="Subject" defaultValue={tpl.subject} maxLength={200} required />
            <TextArea name="body" label="Body" defaultValue={tpl.body} rows={14} maxLength={8000} hint="Blank line = new paragraph. A button is written as [button:Label]({{url}}) on its own line." />
            <div className="flex flex-wrap gap-2">
              <Submit variant="teal">Save template</Submit>
            </div>
          </ActionForm>
          {tpl.customised && (
            <div className="mt-4 border-t border-line pt-4">
              <ActionButton action={resetTemplateAction.bind(null, key)} variant="ghost" confirm={{ title: "Restore the default wording?", cta: "Restore default" }}>
                Restore default
              </ActionButton>
            </div>
          )}
        </Card>
        <Card title="Preview (sample data)" padded={false}>
          <p className="border-b border-line px-6 py-3 text-sm">
            <span className="text-muted">Subject:</span> <strong>{preview.subject}</strong>
          </p>
          <iframe title="Email preview" srcDoc={preview.html} sandbox="" className="h-[32rem] w-full rounded-b-3xl" />
        </Card>
      </div>
    </>
  );
}
