import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Mail, Phone } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { addInternalNoteAction, setRequestStatusAction } from "@/lib/actions/admin";
import { formLabels, type FormKind } from "@/lib/forms/schema";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { Card, DL, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionButton, ActionForm, FormMessage, Submit, TextArea } from "@/components/app/forms";

const human = (k: string) => k.replace(/([A-Z])/g, " $1").replace(/[-_]/g, " ").replace(/^./, (c) => c.toUpperCase());
const val = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? "—"));

export default async function RequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await requireStaff("requests.manage");
  const db = await getDb();
  const [r] = await db.select().from(t.serviceRequests).where(eq(t.serviceRequests.id, id));
  if (!r) notFound();
  const tz = (await getSettings(db)).timezone;
  const notes = await db
    .select({ n: t.internalNotes, first: t.userProfiles.firstName, last: t.userProfiles.lastName })
    .from(t.internalNotes)
    .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.internalNotes.authorId))
    .where(and(eq(t.internalNotes.entityType, "request"), eq(t.internalNotes.entityId, id)))
    .orderBy(desc(t.internalNotes.createdAt));
  const details = Object.entries(r.details).filter(([k]) => !["kind"].includes(k));
  return (
    <>
      <PageHeader
        title={r.name}
        crumbs={[{ label: "Care Requests", href: "/admin/requests/" }, { label: r.reference }]}
        description={<span className="flex flex-wrap items-center gap-2">{formLabels[r.kind as FormKind] ?? r.kind} · {fmtDateTime(r.createdAt, tz)} <StatusBadge status={r.status} /></span>}
        actions={
          <>
            <a href={`mailto:${r.email}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-navy-900 hover:border-navy-300"><Mail aria-hidden className="size-4" /> Email</a>
            {r.phone && <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-navy-900 hover:border-navy-300"><Phone aria-hidden className="size-4" /> Call</a>}
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Submission">
          <DL items={[{ label: "Email", value: r.email }, { label: "Phone", value: r.phone ?? "—" }, ...details.map(([k, v]) => ({ label: human(k), value: val(v) })), { label: "Message", value: r.message ? <span className="whitespace-pre-wrap">{r.message}</span> : "—" }]} />
        </Card>
        <div className="space-y-6">
          <Card title="Status">
            <div className="flex flex-wrap gap-2">
              {(["in_review", "contacted", "converted", "closed"] as const).filter((s) => s !== r.status).map((s) => (
                <ActionButton key={s} action={setRequestStatusAction.bind(null, r.id, s)}>
                  Mark {s.replace("_", " ")}
                </ActionButton>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Booked for them? Create the booking from Bookings → New booking (the client needs an account).</p>
          </Card>
          <Card title="Internal notes">
            <ActionForm action={addInternalNoteAction} className="mb-5 space-y-3">
              <input type="hidden" name="entityType" value="request" />
              <input type="hidden" name="entityId" value={r.id} />
              <FormMessage />
              <TextArea name="body" label={<span className="sr-only">Note</span>} rows={3} maxLength={4000} placeholder="Call notes…" />
              <Submit variant="secondary">Add note</Submit>
            </ActionForm>
            <ul className="space-y-3 text-sm">
              {notes.map(({ n, first, last }) => (
                <li key={n.id} className="rounded-2xl bg-canvas p-3">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{first} {last} · {fmtDateTime(n.createdAt, tz)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
