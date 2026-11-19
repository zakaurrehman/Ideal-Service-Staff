import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { resetContentAction, saveContentAction } from "@/lib/actions/admin";
import { getContent } from "@/lib/content";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { Badge, Card, LinkButton, PageHeader } from "@/components/app/ui";
import { ActionButton, ActionForm, Checkbox, Field, FormMessage, Submit, TextArea } from "@/components/app/forms";

export const metadata = { title: "Website Content" };

export default async function ContentPage() {
  await requireStaff("content.manage");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const [announcement, faqs, testimonials, rows] = await Promise.all([getContent("announcement"), getContent("faqs"), getContent("testimonials"), db.select().from(t.contentBlocks)]);
  const meta = (k: string) => {
    const r = rows.find((x) => x.key === k);
    return (
      <>
        {r ? <Badge tone="teal">Edited {fmtDateTime(r.updatedAt, tz)}</Badge> : <Badge>Original website content</Badge>}
        {r && (
          <ActionButton action={resetContentAction.bind(null, k)} variant="ghost" confirm={{ title: "Restore the original content?", cta: "Restore" }}>
            Restore original
          </ActionButton>
        )}
      </>
    );
  };
  return (
    <>
      <PageHeader
        title="Website Content"
        description="Edit public website content without a developer. Services (names, descriptions, images) are edited in Service Management."
        actions={
          <LinkButton href="/admin/services/" variant="secondary">
            Service Management
          </LinkButton>
        }
      />
      <div className="space-y-6">
        <Card title="Site-wide announcement" description="A banner across the top of every public page — e.g. holiday hours." actions={meta("announcement")}>
          <ActionForm action={saveContentAction} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="key" value="announcement" />
            <FormMessage className="md:col-span-3" />
            <Field name="text" label="Message" defaultValue={announcement.text} maxLength={200} className="md:col-span-2" />
            <Field name="href" label="Link (optional)" defaultValue={announcement.href} placeholder="/contact/" />
            <Checkbox name="enabled" label="Show the announcement" defaultChecked={announcement.enabled} className="md:col-span-3" />
            <div className="md:col-span-3">
              <Submit variant="teal">Publish</Submit>
            </div>
          </ActionForm>
        </Card>

        <Card title="Frequently asked questions" description="Shown on How It Works (and in its search-engine FAQ data). Clear both fields to remove a question." actions={meta("faqs")}>
          <ActionForm action={saveContentAction} className="space-y-4">
            <input type="hidden" name="key" value="faqs" />
            <FormMessage />
            {[...faqs, { q: "", a: "" }].map((f, i) => (
              <fieldset key={i} className="grid gap-3 rounded-2xl border border-line p-4">
                <legend className="px-1 text-xs font-bold uppercase tracking-wider text-muted">{i < faqs.length ? `Question ${i + 1}` : "Add a question"}</legend>
                <Field name="q" label="Question" defaultValue={f.q} maxLength={300} />
                <TextArea name="a" label="Answer" defaultValue={f.a} rows={3} maxLength={2000} />
              </fieldset>
            ))}
            <Submit variant="teal">Publish FAQs</Submit>
          </ActionForm>
        </Card>

        <Card title="Testimonials" description="The homepage testimonial carousel. Only publish real testimonials you have permission to use." actions={meta("testimonials")}>
          <ActionForm action={saveContentAction} className="space-y-4">
            <input type="hidden" name="key" value="testimonials" />
            <FormMessage />
            {[...testimonials, { quote: "", name: "", location: "", outcomeLabel: "", outcomes: [] as string[] }].map((x, i) => (
              <fieldset key={i} className="grid gap-3 rounded-2xl border border-line p-4 md:grid-cols-3">
                <legend className="px-1 text-xs font-bold uppercase tracking-wider text-muted">{i < testimonials.length ? `Testimonial ${i + 1}` : "Add a testimonial"}</legend>
                <TextArea name="quote" label="Quote" defaultValue={x.quote} rows={3} maxLength={2000} className="md:col-span-3" />
                <Field name="name" label="Name" defaultValue={x.name} />
                <Field name="location" label="Location" defaultValue={x.location} />
                <Field name="outcomeLabel" label="Outcome heading" defaultValue={x.outcomeLabel} />
                <TextArea name="outcomes" label="Outcomes (one per line)" defaultValue={x.outcomes.join("\n")} rows={2} className="md:col-span-3" />
              </fieldset>
            ))}
            <Submit variant="teal">Publish testimonials</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
