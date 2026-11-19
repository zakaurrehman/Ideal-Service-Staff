import "server-only";
/**
 * Stores public website submissions in PostgreSQL so nothing depends on an
 * email arriving: job applications (with private files) and care requests,
 * consultation requests, contact messages and newsletter sign-ups.
 * Success is only reported after the database transaction (and any file
 * storage) has completed.
 */
import { getDb, t } from "@/lib/db";
import { makeReference } from "@/lib/booking/service";
import { sendEmail } from "@/lib/email/send";
import { notifyStaff } from "@/lib/notify";
import { UploadError, deleteStoredFile, storeFile, storageConfigured } from "@/lib/storage";
import { ATTACHMENTS_MAX_BYTES, MAX_SUPPORTING_DOCS, formLabels, type FormKind } from "./schema";

export class SubmissionError extends Error {
  constructor(
    message: string,
    public field?: string,
    public status = 422,
  ) {
    super(message);
  }
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function persistSubmission(kind: FormKind, data: Record<string, unknown>, fd: FormData) {
  const db = await getDb();
  if (kind === "job-application") return persistApplication(db, data, fd);

  const reference = makeReference(kind === "newsletter" ? "NEWS" : "REQ");
  const name = str(data.name) ?? "Newsletter subscriber";
  const email = String(data.email ?? "");
  const { name: _n, email: _e, phone, message, notes, ...details } = data;
  await db.insert(t.serviceRequests).values({
    reference,
    kind,
    name,
    email,
    phone: str(phone),
    message: str(message) ?? str(notes),
    details,
  });
  if (kind !== "newsletter") {
    await notifyStaff(db, "requests.manage", { title: `${formLabels[kind]} ${reference}`, body: `${name} · ${email}`, href: `/admin/requests/?q=${reference}` });
  }
  return { reference };
}

async function persistApplication(db: Awaited<ReturnType<typeof getDb>>, d: Record<string, unknown>, fd: FormData) {
  const resume = fd.get("resume");
  const docs = fd.getAll("documents").filter((f): f is File => f instanceof File && f.size > 0);
  const files = [...(resume instanceof File && resume.size > 0 ? [{ file: resume, type: "resume" }] : []), ...docs.map((file) => ({ file, type: "supporting" }))];
  if (docs.length > MAX_SUPPORTING_DOCS) throw new SubmissionError(`Attach at most ${MAX_SUPPORTING_DOCS} supporting documents.`, "documents");
  if (files.reduce((n, f) => n + f.file.size, 0) > ATTACHMENTS_MAX_BYTES) throw new SubmissionError("Attachments must total 4 MB or less.", "documents");
  if (files.length && !storageConfigured()) throw new SubmissionError("Document uploads are temporarily unavailable. Please submit without attachments and email your résumé to Info@idealservicestaff.com.", "resume", 503);

  // Store files first; if anything later fails, remove them again.
  const stored: { id: string; type: string }[] = [];
  try {
    for (const f of files) {
      const row = await storeFile(db, f.file, { purpose: "application_document", ownerUserId: null, rule: f.type === "resume" ? "resume" : "document" });
      stored.push({ id: row.id, type: f.type });
    }
  } catch (err) {
    for (const s of stored) await deleteStoredFile(db, s.id);
    if (err instanceof UploadError) throw new SubmissionError(err.message, files[stored.length]?.type === "resume" ? "resume" : "documents");
    throw err;
  }

  const reference = makeReference("APP");
  try {
    const app = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(t.jobApplications)
        .values({
          reference,
          firstName: String(d.firstName),
          lastName: String(d.lastName),
          email: String(d.email),
          phone: String(d.phone),
          addressLine1: str(d.addressLine1),
          city: String(d.city),
          region: str(d.region)?.toUpperCase() ?? null,
          postalCode: str(d.postalCode),
          positions: (d.positions as string[]) ?? [],
          employmentType: String(d.employmentType),
          availability: (d.availability as string[]) ?? [],
          experienceLevel: String(d.experience),
          certifications: (d.certifications as string[]) ?? [],
          skills: (str(d.skills) ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20),
          qualifications: str(d.qualifications),
          experienceSummary: str(d.about),
          hasTransportation: d.transportation === "yes",
          workAuthorized: d.workAuthorized === "yes",
          smsConsent: Boolean(d.smsConsent),
        })
        .returning();
      if (stored.length) await tx.insert(t.applicationDocuments).values(stored.map((s) => ({ applicationId: row.id, fileId: s.id, docType: s.type })));
      await tx.insert(t.applicationStatusHistory).values({ applicationId: row.id, fromStatus: null, toStatus: "submitted", note: "Submitted via website" });
      return row;
    });
    await sendEmail(db, { to: app.email, template: "application.received", vars: { firstName: app.firstName, reference } });
    await notifyStaff(db, "applications.view", { title: `New job application ${reference}`, body: `${app.firstName} ${app.lastName} · ${app.positions.join(", ")}`, href: `/admin/applications/${app.id}/` });
    return { reference };
  } catch (err) {
    for (const s of stored) await deleteStoredFile(db, s.id);
    throw err;
  }
}
