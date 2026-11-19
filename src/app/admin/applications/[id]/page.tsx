import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { Mail, Paperclip, Phone } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { addInternalNoteAction, setApplicationStatusAction } from "@/lib/actions/admin";
import { APPLICATION_STATUSES, statusLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { Card, DL, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionForm, Checkbox, FormMessage, Select, Submit, TextArea } from "@/components/app/forms";

const EXP: Record<string, string> = { none: "No professional experience", "under-1": "Less than 1 year", "1-3": "1–3 years", "3-5": "3–5 years", "5-plus": "5+ years" };

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await requireStaff("applications.view");
  const db = await getDb();
  const [a] = await db.select().from(t.jobApplications).where(eq(t.jobApplications.id, id));
  if (!a) notFound();
  const tz = (await getSettings(db)).timezone;
  const [docs, history, notes, [account]] = await Promise.all([
    db.select({ d: t.applicationDocuments, f: t.files }).from(t.applicationDocuments).innerJoin(t.files, eq(t.files.id, t.applicationDocuments.fileId)).where(eq(t.applicationDocuments.applicationId, id)),
    db
      .select({ h: t.applicationStatusHistory, first: t.userProfiles.firstName, last: t.userProfiles.lastName })
      .from(t.applicationStatusHistory)
      .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.applicationStatusHistory.changedBy))
      .where(eq(t.applicationStatusHistory.applicationId, id))
      .orderBy(asc(t.applicationStatusHistory.createdAt)),
    db
      .select({ n: t.internalNotes, first: t.userProfiles.firstName, last: t.userProfiles.lastName })
      .from(t.internalNotes)
      .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.internalNotes.authorId))
      .where(and(eq(t.internalNotes.entityType, "application"), eq(t.internalNotes.entityId, id)))
      .orderBy(desc(t.internalNotes.createdAt)),
    db.select({ id: t.users.id }).from(t.users).where(sql`lower(${t.users.email}) = ${a.email.toLowerCase()}`),
  ]);
  const manage = can(v, "applications.manage");
  const name = `${a.firstName} ${a.lastName}`;
  return (
    <>
      <PageHeader
        title={name}
        crumbs={[{ label: "Job Applications", href: "/admin/applications/" }, { label: a.reference }]}
        description={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{a.reference}</span> <StatusBadge status={a.status} /> received {fmtDateTime(a.createdAt, tz)}</span>}
        actions={
          <>
            <a href={`mailto:${a.email}?subject=${encodeURIComponent(`Your application ${a.reference}`)}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-navy-900 hover:border-navy-300">
              <Mail aria-hidden className="size-4" /> Email
            </a>
            <a href={`tel:${a.phone.replace(/[^\d+]/g, "")}`} className="inline-flex h-11 items-center gap-2 rounded-full border border-line bg-white px-5 text-sm font-semibold text-navy-900 hover:border-navy-300">
              <Phone aria-hidden className="size-4" /> Call
            </a>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Application">
            <DL
              items={[
                { label: "Email", value: a.email },
                { label: "Phone", value: a.phone },
                { label: "Address", value: [a.addressLine1, a.city, [a.region, a.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ") },
                { label: "Platform account", value: account ? <Link href={`/admin/employees/${account.id}/`} className="font-semibold text-teal-700 underline">Has an account</Link> : "Not registered yet" },
                { label: "Positions", value: a.positions.join(", ") },
                { label: "Employment type", value: a.employmentType },
                { label: "Availability", value: a.availability.join(", ") },
                { label: "Experience", value: EXP[a.experienceLevel] ?? a.experienceLevel },
                { label: "Certifications", value: a.certifications.join(", ") || "None listed" },
                { label: "Skills", value: a.skills.join(", ") || "—" },
                { label: "Transportation", value: a.hasTransportation ? "Yes" : "No" },
                { label: "Authorized to work", value: a.workAuthorized ? "Yes" : "No" },
                { label: "SMS consent", value: a.smsConsent ? "Yes" : "No" },
                { label: "Qualifications", value: a.qualifications ? <span className="whitespace-pre-wrap">{a.qualifications}</span> : "—" },
                { label: "About", value: a.experienceSummary ? <span className="whitespace-pre-wrap">{a.experienceSummary}</span> : "—" },
              ]}
            />
          </Card>
          <Card title="Documents" description="Opening a file is recorded in the access log." padded={false}>
            {docs.length === 0 ? (
              <p className="px-6 py-5 text-sm text-muted">No documents attached.</p>
            ) : (
              <ul className="divide-y divide-line">
                {docs.map(({ d, f }) => (
                  <li key={d.id} className="flex items-center gap-3 px-6 py-3.5 text-sm">
                    <Paperclip aria-hidden className="size-4 text-teal-700" />
                    <a href={`/api/files/${f.id}/`} target="_blank" rel="noopener" className="flex-1 font-semibold text-navy-950 hover:underline">
                      {f.originalName}
                    </a>
                    <span className="text-xs text-muted">
                      {d.docType === "resume" ? "Résumé" : "Supporting"} · {Math.round(f.sizeBytes / 1024)} KB
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Status history">
            <ol className="space-y-3 text-sm">
              {history.map(({ h, first, last }) => (
                <li key={h.id}>
                  <span className="font-semibold">{statusLabel(h.toStatus)}</span> <span className="text-muted">· {first ? `${first} ${last}` : "Applicant"} · {fmtDateTime(h.createdAt, tz)}</span>
                  {h.note && <p className="text-muted">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="space-y-6">
          {manage && (
            <Card title="Decision">
              <ActionForm action={setApplicationStatusAction} className="space-y-4">
                <input type="hidden" name="id" value={a.id} />
                <FormMessage />
                <Select name="status" label="Status" defaultValue={a.status} options={APPLICATION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
                <TextArea name="note" label="Internal note for the history (optional)" rows={2} maxLength={1000} />
                <Checkbox name="notifyApplicant" label="Email the applicant" hint="Approved → invitation to create an employee account. Rejected → a polite decline." defaultChecked />
                <Submit variant="teal">Save status</Submit>
              </ActionForm>
            </Card>
          )}
          <Card title="Internal notes" description="Staff only.">
            {manage && (
              <ActionForm action={addInternalNoteAction} className="mb-5 space-y-3">
                <input type="hidden" name="entityType" value="application" />
                <input type="hidden" name="entityId" value={a.id} />
                <FormMessage />
                <TextArea name="body" label={<span className="sr-only">Note</span>} rows={3} maxLength={4000} placeholder="Interview notes, references…" />
                <Submit variant="secondary">Add note</Submit>
              </ActionForm>
            )}
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
