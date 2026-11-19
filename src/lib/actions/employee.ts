"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, t } from "@/lib/db";
import { echo, fdString, zodFields, type ActionState } from "@/lib/action-state";
import { requireEmployee } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/core";
import { BookingError, employeeProgress, respondToAssignment } from "@/lib/booking/service";
import { notify, notifyStaff } from "@/lib/notify";
import { getSettings, audit } from "@/lib/settings";
import { UploadError, deleteStoredFile, storeFile } from "@/lib/storage";
import { DOCUMENT_TYPES } from "@/lib/labels";
import { checkbox, optIsoDate, optText, reqText, isoDate } from "@/lib/validation";
import { fmtRange, isIsoDate, parseHHMM, zonedToUtc } from "@/lib/time";

const E = "/employee";

/* ── Professional profile ──────────────────────────────────────────────── */

const proSchema = z.object({
  headline: optText(120),
  bio: optText(2000),
  yearsExperience: z.union([z.literal(""), z.coerce.number().int().min(0).max(60)]).transform((v) => (v === "" ? null : v)),
  employmentType: z.union([z.literal(""), z.enum(["full-time", "part-time", "per-diem", "live-in"])]).transform((v) => v || null),
  city: optText(120),
  hasTransportation: checkbox,
  workAuthorized: checkbox,
  areas: z.string().max(600).default(""),
});

export async function saveProfessionalProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const parsed = proSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fields: zodFields(parsed.error), values: echo(fd) };
  const { areas, ...profile } = parsed.data;
  const list = [...new Set(areas.split(/[,\n]/).map((a) => a.trim()).filter((a) => a.length >= 2 && a.length <= 60))].slice(0, 20);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.update(t.employeeProfiles).set(profile).where(eq(t.employeeProfiles.userId, v.id));
    await tx.delete(t.employeeServiceAreas).where(eq(t.employeeServiceAreas.employeeId, v.id));
    if (list.length) await tx.insert(t.employeeServiceAreas).values(list.map((area) => ({ employeeId: v.id, area })));
  });
  revalidatePath(E, "layout");
  return { ok: true, message: "Professional profile saved." };
}

export async function submitForVerificationAction() {
  const v = await requireEmployee();
  const db = await getDb();
  const [p] = await db.select().from(t.employeeProfiles).where(eq(t.employeeProfiles.userId, v.id));
  if (!p || !["application_received", "documents_required"].includes(p.verificationStatus)) return;
  await db.update(t.employeeProfiles).set({ verificationStatus: "verification_pending" }).where(eq(t.employeeProfiles.userId, v.id));
  await audit(db, { actorId: v.id, action: "employee.submitted", entityType: "user", entityId: v.id, summary: "Submitted profile for verification" });
  await notifyStaff(db, "employees.verify", { title: "Profile ready for verification", body: `${v.firstName} ${v.lastName} submitted their profile and documents.`, href: `/admin/employees/${v.id}/` });
  revalidatePath(E, "layout");
}

/* ── Skills & experience ───────────────────────────────────────────────── */

export async function saveSkillsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const chosen = fd.getAll("skill").map(String);
  const custom = fdString(fd, "custom").split(",").map((s) => s.trim());
  const skills = [...new Set([...chosen, ...custom].filter((s) => s.length >= 2 && s.length <= 60))].slice(0, 30);
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(t.employeeSkills).where(eq(t.employeeSkills.employeeId, v.id));
    if (skills.length) await tx.insert(t.employeeSkills).values(skills.map((skill) => ({ employeeId: v.id, skill })));
  });
  revalidatePath(`${E}/skills/`);
  return { ok: true, message: "Skills saved." };
}

const expSchema = z
  .object({ title: reqText(120, "Enter your role."), organization: reqText(160, "Enter the organization."), startDate: isoDate, endDate: optIsoDate, description: optText(1000) })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, { path: ["endDate"], message: "End date must be after the start date." });

export async function addExperienceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const parsed = expSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fields: zodFields(parsed.error), values: echo(fd) };
  const db = await getDb();
  await db.insert(t.employeeExperience).values({ ...parsed.data, employeeId: v.id });
  revalidatePath(`${E}/skills/`);
  return { ok: true, message: "Experience added." };
}

export async function deleteExperienceAction(id: string) {
  const v = await requireEmployee();
  const db = await getDb();
  await db.delete(t.employeeExperience).where(and(eq(t.employeeExperience.id, id), eq(t.employeeExperience.employeeId, v.id)));
  revalidatePath(`${E}/skills/`);
}

/* ── Certifications & documents (private files) ────────────────────────── */

const certSchema = z
  .object({ name: reqText(120, "Enter the certification name."), issuer: optText(120), credentialId: optText(80), issuedOn: optIsoDate, expiresOn: optIsoDate })
  .refine((d) => !d.expiresOn || !d.issuedOn || d.expiresOn > d.issuedOn, { path: ["expiresOn"], message: "Expiry must be after the issue date." });

export async function addCertificationAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const parsed = certSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, val]) => typeof val === "string")));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fields: zodFields(parsed.error), values: echo(fd) };
  const db = await getDb();
  if (!(await rateLimit(db, `upload:${v.id}`, 30, 3600)).ok) return { error: "Too many uploads — please try again later." };
  let fileId: string | null = null;
  const file = fd.get("file");
  try {
    if (file instanceof File && file.size > 0) fileId = (await storeFile(db, file, { purpose: "certification", ownerUserId: v.id, rule: "document" })).id;
  } catch (err) {
    if (err instanceof UploadError) return { fields: { file: err.message }, values: echo(fd) };
    throw err;
  }
  await db.insert(t.employeeCertifications).values({ ...parsed.data, fileId, employeeId: v.id });
  await notifyStaff(db, "employees.verify", { title: "New certification to review", body: `${v.firstName} ${v.lastName}: ${parsed.data.name}`, href: `/admin/employees/${v.id}/` });
  revalidatePath(`${E}/certifications/`);
  return { ok: true, message: "Certification added — our team will verify it." };
}

export async function deleteCertificationAction(id: string) {
  const v = await requireEmployee();
  const db = await getDb();
  const [c] = await db
    .delete(t.employeeCertifications)
    .where(and(eq(t.employeeCertifications.id, id), eq(t.employeeCertifications.employeeId, v.id), eq(t.employeeCertifications.status, "pending_review")))
    .returning();
  if (c?.fileId) await deleteStoredFile(db, c.fileId);
  revalidatePath(`${E}/certifications/`);
}

export async function uploadDocumentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const docType = fdString(fd, "docType");
  const title = fdString(fd, "title").slice(0, 120);
  const expires = fdString(fd, "expiresOn");
  const fields: Record<string, string> = {};
  if (!DOCUMENT_TYPES.some((d) => d.value === docType)) fields.docType = "Choose the document type.";
  if (expires && !isIsoDate(expires)) fields.expiresOn = "Enter a valid date.";
  if (Object.keys(fields).length) return { fields, values: echo(fd) };
  const db = await getDb();
  if (!(await rateLimit(db, `upload:${v.id}`, 30, 3600)).ok) return { error: "Too many uploads — please try again later." };
  try {
    const file = await storeFile(db, fd.get("file") as File, { purpose: "employee_document", ownerUserId: v.id, rule: "document" });
    await db.insert(t.employeeDocuments).values({
      employeeId: v.id,
      fileId: file.id,
      docType,
      title: title || DOCUMENT_TYPES.find((d) => d.value === docType)!.label,
      expiresOn: expires || null,
    });
  } catch (err) {
    if (err instanceof UploadError) return { fields: { file: err.message }, values: echo(fd) };
    throw err;
  }
  await notifyStaff(db, "employees.verify", { title: "New employee document uploaded", body: `${v.firstName} ${v.lastName} uploaded a document for review.`, href: `/admin/employees/${v.id}/` });
  revalidatePath(`${E}/documents/`);
  return { ok: true, message: "Document uploaded securely. Only you and authorised staff can open it." };
}

export async function deleteDocumentAction(id: string) {
  const v = await requireEmployee();
  const db = await getDb();
  const [d] = await db
    .delete(t.employeeDocuments)
    .where(and(eq(t.employeeDocuments.id, id), eq(t.employeeDocuments.employeeId, v.id), inArray(t.employeeDocuments.status, ["pending_review", "rejected"])))
    .returning();
  if (d) await deleteStoredFile(db, d.fileId);
  revalidatePath(`${E}/documents/`);
}

/* ── Services the employee wants to offer (admin approves) ─────────────── */

export async function requestServiceAction(serviceId: string) {
  const v = await requireEmployee();
  const db = await getDb();
  await db.insert(t.employeeServices).values({ employeeId: v.id, serviceId, status: "requested" }).onConflictDoNothing();
  revalidatePath(`${E}/services/`);
}

export async function withdrawServiceAction(serviceId: string) {
  const v = await requireEmployee();
  const db = await getDb();
  await db.delete(t.employeeServices).where(and(eq(t.employeeServices.employeeId, v.id), eq(t.employeeServices.serviceId, serviceId), eq(t.employeeServices.status, "requested")));
  revalidatePath(`${E}/services/`);
}

/* ── Availability ──────────────────────────────────────────────────────── */

export async function saveWeeklyHoursAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const rows: { weekday: number; startMinute: number; endMinute: number }[] = [];
  const fields: Record<string, string> = {};
  for (let d = 0; d < 7; d++) {
    if (fd.get(`on-${d}`) !== "on") continue;
    const s = parseHHMM(fdString(fd, `start-${d}`));
    const e = parseHHMM(fdString(fd, `end-${d}`));
    if (s === null || e === null || s >= e) fields[`start-${d}`] = "End time must be after start time.";
    else rows.push({ weekday: d, startMinute: s, endMinute: e });
  }
  if (Object.keys(fields).length) return { error: "Please fix the highlighted days.", fields, values: echo(fd) };
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.delete(t.employeeAvailability).where(eq(t.employeeAvailability.employeeId, v.id));
    if (rows.length) await tx.insert(t.employeeAvailability).values(rows.map((r) => ({ ...r, employeeId: v.id })));
  });
  revalidatePath(`${E}/availability/`);
  return { ok: true, message: rows.length ? "Working hours saved." : "Working hours cleared — you won’t receive new assignments until you add some." };
}

export async function addTimeOffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const from = fdString(fd, "from");
  const to = fdString(fd, "to") || from;
  if (!isIsoDate(from) || !isIsoDate(to) || to < from) return { fields: { from: "Choose a valid date range." }, values: echo(fd) };
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const start = zonedToUtc(from, 0, tz);
  const end = zonedToUtc(to, 1440, tz);
  await db.insert(t.availabilityBlocks).values({ employeeId: v.id, startsAt: start, endsAt: end, reason: fdString(fd, "reason").slice(0, 200) || null });
  revalidatePath(`${E}/availability/`);
  return { ok: true, message: "Time off added. Existing assignments are not changed — contact the office if you need cover." };
}

export async function deleteTimeOffAction(id: string) {
  const v = await requireEmployee();
  const db = await getDb();
  await db.delete(t.availabilityBlocks).where(and(eq(t.availabilityBlocks.id, id), eq(t.availabilityBlocks.employeeId, v.id)));
  revalidatePath(`${E}/availability/`);
}

/* ── Assignments ───────────────────────────────────────────────────────── */

export async function respondAssignmentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const accept = fdString(fd, "decision") === "accept";
  const db = await getDb();
  try {
    const b = await respondToAssignment(db, fdString(fd, "assignmentId"), v.id, accept, fdString(fd, "note").slice(0, 500) || null);
    const tz = (await getSettings(db)).timezone;
    await notifyStaff(db, "bookings.assign", {
      title: accept ? `${v.firstName} accepted ${b.reference}` : `${v.firstName} declined ${b.reference}`,
      body: `${fmtRange(b.startsAt, b.endsAt, tz)}${accept ? " — ready to confirm." : " — needs reassignment."}`,
      href: `/admin/bookings/${b.id}/`,
    });
    revalidatePath(E, "layout");
    return { ok: true, message: accept ? "Assignment accepted. The office will confirm it with the client." : "Assignment declined. Thank you for letting us know." };
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }
}

export async function progressVisitAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireEmployee();
  const to = fdString(fd, "to") === "completed" ? "completed" : "in_progress";
  const db = await getDb();
  try {
    const settings = await getSettings(db);
    const { booking } = await employeeProgress(db, fdString(fd, "bookingId"), v.id, to, settings);
    await notify(db, {
      userIds: [booking.customerId],
      category: "bookings",
      title: to === "in_progress" ? `Your visit ${booking.reference} has started` : `Your visit ${booking.reference} is complete`,
      href: `/customer/bookings/${booking.reference}/`,
    });
    await notifyStaff(db, "bookings.view", { title: `${booking.reference} ${to === "in_progress" ? "started" : "completed"}`, body: `${v.firstName} ${v.lastName}`, href: `/admin/bookings/${booking.id}/` });
    revalidatePath(E, "layout");
    return { ok: true, message: to === "in_progress" ? "Visit started." : "Visit marked as completed." };
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }
}
