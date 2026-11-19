import { desc, eq } from "drizzle-orm";
import { FileLock2, FileText } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { deleteDocumentAction, uploadDocumentAction } from "@/lib/actions/employee";
import { DOCUMENT_TYPES, docTypeLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/time";
import { acceptFor } from "@/lib/storage";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionButton, ActionForm, Field, FormMessage, Select, Submit } from "@/components/app/forms";

export const metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const v = await requireEmployee();
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const docs = await db
    .select({ d: t.employeeDocuments, name: t.files.originalName, size: t.files.sizeBytes })
    .from(t.employeeDocuments)
    .innerJoin(t.files, eq(t.files.id, t.employeeDocuments.fileId))
    .where(eq(t.employeeDocuments.employeeId, v.id))
    .orderBy(desc(t.employeeDocuments.createdAt));
  return (
    <>
      <PageHeader title="Documents" description="Upload the documents our team asks for. Files are stored privately — only you and authorised staff can open them." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Card padded={false}>
          {docs.length === 0 ? (
            <EmptyState icon={<FileText className="size-6" />} title="No documents uploaded" description="Typical documents: government ID, work authorization, TB test, background check." />
          ) : (
            <ul className="divide-y divide-line">
              {docs.map(({ d, name, size }) => (
                <li key={d.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-navy-50 text-navy-700">
                    <FileLock2 aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <a href={`/api/files/${d.fileId}/`} target="_blank" rel="noopener" className="font-semibold text-navy-950 hover:underline">
                      {d.title}
                    </a>
                    <p className="text-muted">
                      {docTypeLabel(d.docType)} · {name} · {Math.round(size / 1024)} KB · uploaded {fmtDate(d.createdAt, tz)}
                    </p>
                    {d.reviewNote && <p className="mt-1 rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-950">Note from our team: {d.reviewNote}</p>}
                  </div>
                  <StatusBadge status={d.status} />
                  {d.status !== "approved" && (
                    <ActionButton action={deleteDocumentAction.bind(null, d.id)} variant="ghost" confirm={{ title: "Delete this document?", body: "The file will be permanently removed.", cta: "Delete" }}>
                      Delete
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Upload a document">
          <ActionForm action={uploadDocumentAction} className="space-y-4">
            <FormMessage />
            <Select name="docType" label="Document type" options={DOCUMENT_TYPES.map((d) => ({ value: d.value, label: d.label }))} placeholder="Choose…" required />
            <Field name="title" label="Title (optional)" maxLength={120} />
            <Field name="expiresOn" type="date" label="Expiry date (if any)" />
            <Field name="file" type="file" label="File" required accept={acceptFor("document")} hint="PDF, Word or image — up to 4 MB." />
            <Submit className="w-full">Upload securely</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
