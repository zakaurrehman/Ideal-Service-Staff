import { desc, eq } from "drizzle-orm";
import { Award, Paperclip } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { addCertificationAction, deleteCertificationAction } from "@/lib/actions/employee";
import { acceptFor } from "@/lib/storage";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionButton, ActionForm, Field, FormMessage, Submit } from "@/components/app/forms";

export const metadata = { title: "Certifications" };

export default async function CertificationsPage() {
  const v = await requireEmployee();
  const db = await getDb();
  const certs = await db.select().from(t.employeeCertifications).where(eq(t.employeeCertifications.employeeId, v.id)).orderBy(desc(t.employeeCertifications.createdAt));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Certifications" description="Add your certifications and licenses with a copy for our team to verify." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <Card padded={false}>
          {certs.length === 0 ? (
            <EmptyState icon={<Award className="size-6" />} title="No certifications yet" description="e.g. CPR / First Aid, HHA, CNA, CA Home Care Aide Registry." />
          ) : (
            <ul className="divide-y divide-line">
              {certs.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                  <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <Award aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-semibold text-navy-950">{c.name}</p>
                    <p className="text-muted">
                      {[c.issuer, c.credentialId && `#${c.credentialId}`, c.expiresOn && `${c.expiresOn < today ? "Expired" : "Expires"} ${c.expiresOn}`].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {c.fileId && (
                      <a href={`/api/files/${c.fileId}/`} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline" target="_blank" rel="noopener">
                        <Paperclip aria-hidden className="size-3.5" /> View file
                      </a>
                    )}
                  </div>
                  <StatusBadge status={c.expiresOn && c.expiresOn < today ? "expired" : c.status} />
                  {c.status === "pending_review" && (
                    <ActionButton action={deleteCertificationAction.bind(null, c.id)} variant="ghost" confirm={{ title: "Delete this certification?", cta: "Delete" }}>
                      Delete
                    </ActionButton>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Add a certification">
          <ActionForm action={addCertificationAction} className="space-y-4">
            <FormMessage />
            <Field name="name" label="Certification" required placeholder="e.g. CPR / First Aid" />
            <Field name="issuer" label="Issued by" />
            <Field name="credentialId" label="Credential / license number" />
            <div className="grid grid-cols-2 gap-3">
              <Field name="issuedOn" type="date" label="Issued" />
              <Field name="expiresOn" type="date" label="Expires" />
            </div>
            <FileInput name="file" label="Copy of certificate" accept={acceptFor("document")} />
            <Submit className="w-full">Add certification</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}

function FileInput({ name, label, accept, required }: { name: string; label: string; accept: string; required?: boolean }) {
  return <Field name={name} type="file" label={label} required={required} hint="PDF, Word or image — up to 4 MB. Stored privately." accept={accept} />;
}
