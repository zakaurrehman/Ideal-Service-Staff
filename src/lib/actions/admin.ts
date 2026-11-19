"use server";

/**
 * Administration actions. Every function starts with requireStaff(<permission>)
 * — the server-side authorisation check — and writes to the audit log.
 */
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb, t } from "@/lib/db";
import { echo, fdString, zodFields, type ActionState } from "@/lib/action-state";
import { requireStaff, requestMeta } from "@/lib/auth/session";
import { assignRole, createPasswordResetToken, findUserByEmail, INVITE_TTL_MS, invalidateUserSessions } from "@/lib/auth/core";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { BookingError, assignProfessional, clearRescheduleRequest, createBooking, reschedule, transition } from "@/lib/booking/service";
import { sendEmail, retryEmail } from "@/lib/email/send";
import { TEMPLATES, type TemplateKey } from "@/lib/email/templates";
import { absolute, notify } from "@/lib/notify";
import { audit, getSettings, saveSettings, settingsSchema } from "@/lib/settings";
import { APPLICATION_STATUSES, BOOKING_STATUSES, VERIFICATION_STATUSES, statusLabel, type BookingStatus } from "@/lib/labels";
import { UploadError, storeFile } from "@/lib/storage";
import { addressSchema, emailField, nameField, optText, reqText } from "@/lib/validation";
import { fmtRange, isIsoDate, parseHHMM, zonedToUtc } from "@/lib/time";

const log = async (actorId: string, action: string, entityType: string, entityId: string, summary: string, metadata?: Record<string, unknown>) =>
  audit(await getDb(), { actorId, action, entityType, entityId, summary, metadata, ip: (await requestMeta()).ip });

/* ═══ Users: status, notes ═══════════════════════════════════════════════ */

export async function setUserStatusAction(userId: string, status: "active" | "suspended") {
  const db = await getDb();
  const roles = await db.select({ key: t.roles.key, isStaff: t.roles.isStaff }).from(t.userRoles).innerJoin(t.roles, eq(t.roles.id, t.userRoles.roleId)).where(eq(t.userRoles.userId, userId));
  const perm = roles.some((r) => r.isStaff) ? "admins.manage" : roles.some((r) => r.key === "employee") ? "employees.manage" : "customers.manage";
  const v = await requireStaff(perm);
  if (userId === v.id) return;
  if (roles.some((r) => r.key === "super_admin") && !v.isSuperAdmin) return;
  await db.update(t.users).set({ status }).where(eq(t.users.id, userId));
  if (status === "suspended") await invalidateUserSessions(db, userId);
  await log(v.id, `user.${status}`, "user", userId, `Account ${status === "active" ? "reactivated" : "suspended"}`);
  revalidatePath("/admin", "layout");
}

export async function addCustomerNoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("customers.manage");
  const body = fdString(fd, "body");
  if (body.length < 2 || body.length > 4000) return { fields: { body: "Write a note (up to 4,000 characters)." } };
  const db = await getDb();
  const customerId = fdString(fd, "customerId");
  await db.insert(t.customerNotes).values({ customerId, authorId: v.id, body });
  await log(v.id, "customer.note", "user", customerId, "Internal note added");
  revalidatePath(`/admin/customers/${customerId}/`);
  return { ok: true, message: "Note added." };
}

export async function addInternalNoteAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const entityType = fdString(fd, "entityType");
  const v = await requireStaff(entityType === "application" ? "applications.manage" : "requests.manage");
  const body = fdString(fd, "body");
  if (body.length < 2 || body.length > 4000) return { fields: { body: "Write a note (up to 4,000 characters)." } };
  const entityId = fdString(fd, "entityId");
  const db = await getDb();
  await db.insert(t.internalNotes).values({ entityType, entityId, authorId: v.id, body });
  revalidatePath(entityType === "application" ? `/admin/applications/${entityId}/` : `/admin/requests/${entityId}/`);
  return { ok: true, message: "Note added." };
}

/* ═══ Employees & verification ═══════════════════════════════════════════ */

export async function setVerificationStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("employees.verify");
  const employeeId = fdString(fd, "employeeId");
  const status = fdString(fd, "status") as (typeof VERIFICATION_STATUSES)[number];
  const note = fdString(fd, "note").slice(0, 1000) || null;
  if (!VERIFICATION_STATUSES.includes(status)) return { error: "Choose a status." };
  const db = await getDb();
  const [emp] = await db.select().from(t.employeeProfiles).where(eq(t.employeeProfiles.userId, employeeId));
  if (!emp) return { error: "Employee not found." };
  await db
    .update(t.employeeProfiles)
    .set({ verificationStatus: status, statusNote: note, ...(status === "approved" ? { approvedAt: new Date(), approvedBy: v.id } : {}) })
    .where(eq(t.employeeProfiles.userId, employeeId));
  await log(v.id, "employee.verification", "user", employeeId, `Verification ${emp.verificationStatus} → ${status}`, { note });
  const messages: Record<string, string> = {
    approved: "You can now receive assignments for the services our team has approved for you.",
    documents_required: note ?? "Please upload the requested documents on your Documents page.",
    rejected: note ?? "Please contact the office if you have questions.",
    suspended: note ?? "Please contact the office.",
  };
  await notify(db, {
    userIds: [employeeId],
    category: "account",
    title: `Verification status: ${statusLabel(status)}`,
    body: messages[status] ?? note ?? "",
    href: "/employee/dashboard/",
    email: { template: "employee.status", vars: { status: statusLabel(status), message: messages[status] ?? note ?? "" } },
  });
  revalidatePath("/admin", "layout");
  return { ok: true, message: `Status updated to ${statusLabel(status)} and the employee was notified.` };
}

export async function reviewDocumentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("employees.verify");
  const kind = fdString(fd, "kind");
  const id = fdString(fd, "id");
  const decision = fdString(fd, "decision") === "approved" ? "approved" : "rejected";
  const note = fdString(fd, "note").slice(0, 500) || null;
  const db = await getDb();
  const set = { status: decision, reviewedBy: v.id, reviewedAt: new Date() } as const;
  const [row] =
    kind === "certification"
      ? await db.update(t.employeeCertifications).set(set).where(eq(t.employeeCertifications.id, id)).returning({ employeeId: t.employeeCertifications.employeeId, title: t.employeeCertifications.name })
      : await db.update(t.employeeDocuments).set({ ...set, reviewNote: note }).where(eq(t.employeeDocuments.id, id)).returning({ employeeId: t.employeeDocuments.employeeId, title: t.employeeDocuments.title });
  if (!row) return { error: "Not found." };
  await log(v.id, `${kind}.${decision}`, kind, id, `${row.title} ${decision}`);
  await notify(db, { userIds: [row.employeeId], category: "applications", title: `${row.title}: ${decision === "approved" ? "verified" : "not accepted"}`, body: note ?? "", href: kind === "certification" ? "/employee/certifications/" : "/employee/documents/" });
  revalidatePath(`/admin/employees/${row.employeeId}/`);
  return { ok: true, message: `Marked as ${decision}.` };
}

export async function setServiceEligibilityAction(employeeId: string, serviceId: string, status: "approved" | "revoked") {
  const v = await requireStaff("employees.manage");
  const db = await getDb();
  await db
    .insert(t.employeeServices)
    .values({ employeeId, serviceId, status, decidedBy: v.id, decidedAt: new Date() })
    .onConflictDoUpdate({ target: [t.employeeServices.employeeId, t.employeeServices.serviceId], set: { status, decidedBy: v.id, decidedAt: new Date() } });
  const [svc] = await db.select({ name: t.services.name }).from(t.services).where(eq(t.services.id, serviceId));
  await log(v.id, `eligibility.${status}`, "user", employeeId, `${svc?.name}: ${status}`);
  revalidatePath(`/admin/employees/${employeeId}/`);
}

/* ═══ Bookings ═══════════════════════════════════════════════════════════ */

const bookingErr = (err: unknown): ActionState => {
  if (err instanceof BookingError) return { error: err.message };
  throw err;
};

async function bookingContext(bookingId: string) {
  const db = await getDb();
  const [b] = await db.select().from(t.bookings).where(eq(t.bookings.id, bookingId));
  const [svc] = await db.select({ name: t.bookingServices.serviceName }).from(t.bookingServices).where(eq(t.bookingServices.bookingId, bookingId)).limit(1);
  return { db, b, service: svc?.name ?? "Care service" };
}

const CUSTOMER_MESSAGES: Partial<Record<BookingStatus, string>> = {
  pending_assignment: "Your request has been approved and we’re arranging your care professional.",
  confirmed: "Your visit is confirmed. Your care professional’s details are in your account.",
  rejected: "We’re unable to fulfil this request. Our team will contact you to discuss alternatives.",
  in_progress: "Your visit has started.",
  completed: "Your visit is complete. Thank you for choosing Ideal Service Staff.",
};

export async function adminTransitionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("bookings.manage");
  const bookingId = fdString(fd, "bookingId");
  const to = fdString(fd, "to") as BookingStatus;
  const note = fdString(fd, "note").slice(0, 1000) || null;
  if (!BOOKING_STATUSES.includes(to)) return { error: "Choose a status." };
  try {
    const { db, service } = await bookingContext(bookingId);
    const res = await transition(db, bookingId, to, { actor: "admin", userId: v.id }, note);
    const b = res.booking;
    const tz = b.timezone;
    const when = fmtRange(b.startsAt, b.endsAt, tz);
    await log(v.id, "booking.status", "booking", b.id, `${b.reference}: ${res.from} → ${to}`, { note });
    if (to === "cancelled") {
      await notify(db, { userIds: [b.customerId], category: "bookings", title: `Booking ${b.reference} cancelled`, body: note ?? "", href: `/customer/bookings/${b.reference}/`, email: { template: "booking.cancelled", vars: { reference: b.reference, when } } });
    } else if (res.from === "cancellation_requested") {
      await notify(db, { userIds: [b.customerId], category: "bookings", title: `Cancellation request for ${b.reference} declined`, body: note ?? "Your booking remains in place.", href: `/customer/bookings/${b.reference}/`, email: { template: "booking.updated", vars: { reference: b.reference, status: statusLabel(to), when, message: note ?? "Your booking remains in place." } } });
    } else if (CUSTOMER_MESSAGES[to]) {
      await notify(db, { userIds: [b.customerId], category: "bookings", title: `Booking ${b.reference}: ${statusLabel(to)}`, body: CUSTOMER_MESSAGES[to]!, href: `/customer/bookings/${b.reference}/`, email: { template: "booking.updated", vars: { reference: b.reference, status: statusLabel(to), when, message: note ?? CUSTOMER_MESSAGES[to]! } } });
    }
    if (res.releasedEmployeeId) await notify(db, { userIds: [res.releasedEmployeeId], category: "bookings", title: `Assignment ${b.reference} withdrawn`, body: `${service} · ${when}`, href: "/employee/assignments/" });
    revalidatePath("/admin", "layout");
    return { ok: true, message: `Status changed to ${statusLabel(to)}.` };
  } catch (err) {
    return bookingErr(err);
  }
}

export async function assignAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("bookings.assign");
  const bookingId = fdString(fd, "bookingId");
  const employeeId = fdString(fd, "employeeId");
  if (!employeeId) return { fields: { employeeId: "Choose a professional." } };
  try {
    const { db, service } = await bookingContext(bookingId);
    const settings = await getSettings(db);
    const res = await assignProfessional(db, bookingId, employeeId, v.id, settings.timezone);
    const when = fmtRange(res.booking.startsAt, res.booking.endsAt, settings.timezone);
    await log(v.id, "booking.assign", "booking", bookingId, `${res.booking.reference} assigned`, { employeeId });
    await notify(db, {
      userIds: [employeeId],
      category: "bookings",
      title: `New assignment offered: ${service}`,
      body: when,
      href: `/employee/assignments/${res.assignment.id}/`,
      email: { template: "booking.assignment", vars: { reference: res.booking.reference, service, when } },
    });
    if (res.previousEmployeeId && res.previousEmployeeId !== employeeId) {
      await notify(db, { userIds: [res.previousEmployeeId], category: "bookings", title: `Assignment ${res.booking.reference} withdrawn`, body: when, href: "/employee/assignments/" });
    }
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Professional assigned — they’ve been asked to accept." };
  } catch (err) {
    return bookingErr(err);
  }
}

export async function adminRescheduleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("bookings.manage");
  const bookingId = fdString(fd, "bookingId");
  const date = fdString(fd, "date");
  const minute = parseHHMM(fdString(fd, "time"));
  const duration = Number(fdString(fd, "duration"));
  if (!isIsoDate(date) || minute === null || !Number.isInteger(duration) || duration < 30 || duration > 1440) return { error: "Choose a valid date, time and length.", values: echo(fd) };
  try {
    const { db } = await bookingContext(bookingId);
    const tz = (await getSettings(db)).timezone;
    const start = zonedToUtc(date, minute, tz);
    const end = new Date(start.getTime() + duration * 60_000);
    if (start < new Date()) return { error: "Choose a time in the future.", values: echo(fd) };
    const res = await reschedule(db, bookingId, start, end, v.id, tz);
    const when = fmtRange(start, end, tz);
    await log(v.id, "booking.reschedule", "booking", bookingId, `${res.booking.reference} moved to ${when}`);
    await notify(db, { userIds: [res.booking.customerId], category: "bookings", title: `Booking ${res.booking.reference} rescheduled`, body: when, href: `/customer/bookings/${res.booking.reference}/`, email: { template: "booking.updated", vars: { reference: res.booking.reference, status: "Rescheduled", when, message: `Your visit is now scheduled for ${when}.` } } });
    if (res.releasedEmployeeId) await notify(db, { userIds: [res.releasedEmployeeId], category: "bookings", title: `Assignment ${res.booking.reference} moved and released`, body: "The new time didn’t fit your schedule.", href: "/employee/assignments/" });
    revalidatePath("/admin", "layout");
    return { ok: true, message: res.keptProfessional ? "Rescheduled — the professional is still assigned." : "Rescheduled." };
  } catch (err) {
    return bookingErr(err);
  }
}

export async function approveRescheduleRequestAction(bookingId: string) {
  const v = await requireStaff("bookings.manage");
  const { db, b } = await bookingContext(bookingId);
  if (!b?.rescheduleStartsAt || !b.rescheduleEndsAt) return;
  const tz = (await getSettings(db)).timezone;
  const res = await reschedule(db, bookingId, b.rescheduleStartsAt, b.rescheduleEndsAt, v.id, tz).catch((e) => (e instanceof BookingError ? null : Promise.reject(e)));
  if (!res) return;
  const when = fmtRange(b.rescheduleStartsAt, b.rescheduleEndsAt, tz);
  await log(v.id, "booking.reschedule_approved", "booking", bookingId, `${b.reference} reschedule approved`);
  await notify(db, { userIds: [b.customerId], category: "bookings", title: `New time confirmed for ${b.reference}`, body: when, href: `/customer/bookings/${b.reference}/`, email: { template: "booking.updated", vars: { reference: b.reference, status: "Rescheduled", when, message: "Your reschedule request was approved." } } });
  if (res.releasedEmployeeId) await notify(db, { userIds: [res.releasedEmployeeId], category: "bookings", title: `Assignment ${b.reference} moved and released`, href: "/employee/assignments/" });
  revalidatePath("/admin", "layout");
}

export async function declineRescheduleRequestAction(bookingId: string) {
  const v = await requireStaff("bookings.manage");
  const { db, b } = await bookingContext(bookingId);
  if (!b) return;
  await clearRescheduleRequest(db, bookingId);
  await log(v.id, "booking.reschedule_declined", "booking", bookingId, `${b.reference} reschedule declined`);
  await notify(db, { userIds: [b.customerId], category: "bookings", title: `Reschedule request for ${b.reference} declined`, body: "Your original time remains. Contact us to discuss other options.", href: `/customer/bookings/${b.reference}/` });
  revalidatePath(`/admin/bookings/${bookingId}/`);
}

export async function saveInternalNotesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("bookings.manage");
  const db = await getDb();
  const id = fdString(fd, "bookingId");
  await db.update(t.bookings).set({ internalNotes: fdString(fd, "internalNotes").slice(0, 4000) || null }).where(eq(t.bookings.id, id));
  await log(v.id, "booking.notes", "booking", id, "Internal notes updated");
  return { ok: true, message: "Notes saved." };
}

const adminBookingSchema = z.object({
  customerEmail: emailField,
  serviceId: z.string().uuid("Choose a service."),
  careType: reqText(40, "Choose a care type."),
  date: z.string().refine(isIsoDate, "Choose a date."),
  time: z.string().refine((s) => parseHHMM(s) !== null, "Choose a time."),
  durationMinutes: z.coerce.number().int().min(30).max(1440),
  addressId: z.string().default(""),
  instructions: optText(2000),
  status: z.enum(["draft", "pending_assignment"]),
});

export async function adminCreateBookingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("bookings.manage");
  const raw = Object.fromEntries(fd);
  const parsed = adminBookingSchema.safeParse(raw);
  if (!parsed.success) return { error: "Please complete the highlighted fields.", fields: zodFields(parsed.error), values: echo(fd) };
  const d = parsed.data;
  const db = await getDb();
  const customer = await findUserByEmail(db, d.customerEmail);
  const isCustomer = customer && (await db.select().from(t.customerProfiles).where(eq(t.customerProfiles.userId, customer.id))).length > 0;
  if (!customer || !isCustomer) return { fields: { customerEmail: "No customer account with this email. Ask the client to register first." }, values: echo(fd) };
  let address = null;
  if (!d.addressId) {
    const a = addressSchema.safeParse({ ...raw, label: "Visit address", isDefault: "" });
    if (!a.success) return { error: "Add the visit address.", fields: zodFields(a.error), values: echo(fd) };
    address = a.data;
  }
  try {
    const settings = await getSettings(db);
    const b = await createBooking(
      db,
      { customerId: customer.id, serviceId: d.serviceId, careType: d.careType, durationMinutes: d.durationMinutes, start: zonedToUtc(d.date, parseHHMM(d.time)!, settings.timezone), addressId: d.addressId || null, address, instructions: d.instructions, status: d.status, source: "admin", createdBy: v.id },
      settings,
    );
    await log(v.id, "booking.create", "booking", b.id, `Created ${b.reference} for ${customer.email}`);
    if (d.status !== "draft") {
      const [svc] = await db.select({ name: t.services.name }).from(t.services).where(eq(t.services.id, d.serviceId));
      await notify(db, { userIds: [customer.id], category: "bookings", title: `Booking ${b.reference} created for you`, body: fmtRange(b.startsAt, b.endsAt, settings.timezone), href: `/customer/bookings/${b.reference}/`, email: { template: "booking.submitted", vars: { reference: b.reference, service: svc.name, when: fmtRange(b.startsAt, b.endsAt, settings.timezone) } } });
    }
    redirect(`/admin/bookings/${b.id}/`);
  } catch (err) {
    return { ...bookingErr(err), values: echo(fd) };
  }
}

/* ═══ Services ═══════════════════════════════════════════════════════════ */

const serviceSchema = z
  .object({
    name: reqText(120, "Enter a name."),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
    categoryId: z.union([z.literal(""), z.string().uuid()]).transform((x) => x || null),
    summary: reqText(300, "Add a short summary."),
    description: optText(6000).transform((x) => x ?? ""),
    tasks: z.string().max(3000).transform((s) => s.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 20)),
    defaultDurationMinutes: z.coerce.number().int().min(30).max(1440),
    minDurationMinutes: z.coerce.number().int().min(30).max(1440),
    maxDurationMinutes: z.coerce.number().int().min(30).max(1440),
    isBookable: z.preprocess((x) => x === "on", z.boolean()),
    isActive: z.preprocess((x) => x === "on", z.boolean()),
    sortOrder: z.coerce.number().int().min(0).max(999),
  })
  .refine((d) => d.minDurationMinutes <= d.defaultDurationMinutes && d.defaultDurationMinutes <= d.maxDurationMinutes, { path: ["defaultDurationMinutes"], message: "Default must be between the minimum and maximum." });

export async function saveServiceAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("services.manage");
  const parsed = serviceSchema.safeParse(Object.fromEntries([...fd.entries()].filter(([, x]) => typeof x === "string")));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fields: zodFields(parsed.error), values: echo(fd) };
  const db = await getDb();
  const id = fdString(fd, "id");
  try {
    let serviceId = id;
    if (id) await db.update(t.services).set(parsed.data).where(eq(t.services.id, id));
    else serviceId = (await db.insert(t.services).values(parsed.data).returning({ id: t.services.id }))[0].id;
    const image = fd.get("image");
    if (image instanceof File && image.size > 0) {
      const f = await storeFile(db, image, { purpose: "service_image", ownerUserId: v.id, rule: "image" });
      await db.update(t.services).set({ imageFileId: f.id, imagePath: `/api/files/${f.id}/` }).where(eq(t.services.id, serviceId));
    }
    await log(v.id, id ? "service.update" : "service.create", "service", serviceId, `${parsed.data.name} saved`);
    revalidatePath("/admin/services/", "layout");
    revalidatePath("/services", "layout");
    if (!id) redirect(`/admin/services/${serviceId}/?created=1`);
    return { ok: true, message: "Service saved." };
  } catch (err) {
    if (err instanceof UploadError) return { fields: { image: err.message }, values: echo(fd) };
    if (String((err as { cause?: { code?: string } }).cause?.code) === "23505") return { fields: { slug: "This URL slug is already used." }, values: echo(fd) };
    throw err;
  }
}

export async function archiveServiceAction(id: string, archive: boolean) {
  const v = await requireStaff("services.manage");
  const db = await getDb();
  await db.update(t.services).set({ archivedAt: archive ? new Date() : null, isActive: !archive }).where(eq(t.services.id, id));
  await log(v.id, archive ? "service.archive" : "service.restore", "service", id, archive ? "Archived" : "Restored");
  revalidatePath("/admin/services/", "layout");
}

export async function savePricingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("services.manage");
  const serviceId = fdString(fd, "serviceId");
  const label = fdString(fd, "label").slice(0, 80);
  const amount = Math.round(Number(fdString(fd, "amount")) * 100);
  const unit = fdString(fd, "unit");
  if (!label || !Number.isFinite(amount) || amount < 0 || !["hour", "visit", "day", "week"].includes(unit)) return { error: "Enter a label, a valid amount and a unit.", values: echo(fd) };
  const db = await getDb();
  await db.insert(t.servicePricing).values({ serviceId, label, amountCents: amount, unit });
  await log(v.id, "service.pricing", "service", serviceId, `Price added: ${label}`);
  revalidatePath(`/admin/services/${serviceId}/`);
  return { ok: true, message: "Price added." };
}

export async function deletePricingAction(id: string, serviceId: string) {
  const v = await requireStaff("services.manage");
  const db = await getDb();
  await db.delete(t.servicePricing).where(eq(t.servicePricing.id, id));
  await log(v.id, "service.pricing_delete", "service", serviceId, "Price removed");
  revalidatePath(`/admin/services/${serviceId}/`);
}

export async function saveCategoryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("services.manage");
  const name = fdString(fd, "name").slice(0, 80);
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (name.length < 2) return { fields: { name: "Enter a category name." } };
  const db = await getDb();
  const id = fdString(fd, "id");
  if (id) await db.update(t.serviceCategories).set({ name }).where(eq(t.serviceCategories.id, id));
  else await db.insert(t.serviceCategories).values({ name, slug }).onConflictDoNothing();
  await log(v.id, "category.save", "category", id || slug, `Category ${name}`);
  revalidatePath("/admin/services/", "layout");
  return { ok: true, message: "Category saved." };
}

/* ═══ Applications & care requests ═══════════════════════════════════════ */

export async function setApplicationStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("applications.manage");
  const id = fdString(fd, "id");
  const status = fdString(fd, "status") as (typeof APPLICATION_STATUSES)[number];
  const note = fdString(fd, "note").slice(0, 1000) || null;
  const notifyApplicant = fd.get("notifyApplicant") === "on";
  if (!APPLICATION_STATUSES.includes(status)) return { error: "Choose a status." };
  const db = await getDb();
  const [app] = await db.select().from(t.jobApplications).where(eq(t.jobApplications.id, id));
  if (!app) return { error: "Application not found." };
  await db.transaction(async (tx) => {
    await tx.update(t.jobApplications).set({ status }).where(eq(t.jobApplications.id, id));
    await tx.insert(t.applicationStatusHistory).values({ applicationId: id, fromStatus: app.status, toStatus: status, changedBy: v.id, note });
  });
  await log(v.id, "application.status", "application", id, `${app.reference}: ${app.status} → ${status}`);
  if (notifyApplicant && (status === "approved" || status === "rejected")) {
    const template: TemplateKey = status === "approved" ? "application.approved" : "application.rejected";
    await sendEmail(db, { to: app.email, userId: app.userId, template, vars: { firstName: app.firstName, reference: app.reference, url: absolute(`/register/?type=employee&email=${encodeURIComponent(app.email)}`) } });
  }
  revalidatePath("/admin/applications/", "layout");
  return { ok: true, message: `Status updated${notifyApplicant && (status === "approved" || status === "rejected") ? " and the applicant was emailed" : ""}.` };
}

export async function setRequestStatusAction(id: string, status: "new" | "in_review" | "contacted" | "converted" | "closed") {
  const v = await requireStaff("requests.manage");
  const db = await getDb();
  await db.update(t.serviceRequests).set({ status, handledBy: v.id }).where(eq(t.serviceRequests.id, id));
  await log(v.id, "request.status", "request", id, `Status → ${status}`);
  revalidatePath("/admin/requests/", "layout");
}

/* ═══ Notifications ══════════════════════════════════════════════════════ */

export async function sendAnnouncementAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("notifications.manage");
  const audience = fdString(fd, "audience");
  const title = fdString(fd, "title").slice(0, 120);
  const body = fdString(fd, "body").slice(0, 2000);
  const viaEmail = fd.get("email") === "on";
  if (title.length < 3 || body.length < 5 || !["customer", "employee", "all"].includes(audience)) return { error: "Choose an audience and write a title and message.", values: echo(fd) };
  const db = await getDb();
  const keys = audience === "all" ? ["customer", "employee"] : [audience];
  const ids = (
    await db
      .selectDistinct({ id: t.users.id })
      .from(t.users)
      .innerJoin(t.userRoles, eq(t.userRoles.userId, t.users.id))
      .innerJoin(t.roles, eq(t.roles.id, t.userRoles.roleId))
      .where(and(eq(t.users.status, "active"), inArray(t.roles.key, keys)))
  ).map((r) => r.id);
  await notify(db, { userIds: ids, category: "announcements", title, body, email: viaEmail ? { template: "announcement", vars: { title, body } } : undefined });
  await log(v.id, "announcement.send", "announcement", audience, `Announcement “${title}” to ${ids.length} ${audience} user(s)`);
  return { ok: true, message: `Sent to ${ids.length} user${ids.length === 1 ? "" : "s"} (users who opted out of announcements are skipped).` };
}

export async function retryEmailAction(id: string) {
  const v = await requireStaff("notifications.manage");
  const db = await getDb();
  await retryEmail(db, id);
  await log(v.id, "email.retry", "email", id, "Manual retry");
  revalidatePath("/admin/notifications/");
}

/* ═══ Admin users, roles, templates, content, settings ═══════════════════ */

export async function inviteStaffAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("admins.manage");
  const parsed = z.object({ firstName: nameField("first name"), lastName: nameField("last name"), email: emailField, roleId: z.string().uuid("Choose a role.") }).safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please check the highlighted fields.", fields: zodFields(parsed.error), values: echo(fd) };
  const d = parsed.data;
  const db = await getDb();
  const [role] = await db.select().from(t.roles).where(eq(t.roles.id, d.roleId));
  if (!role?.isStaff) return { fields: { roleId: "Choose a staff role." }, values: echo(fd) };
  if (role.key === "super_admin" && !v.isSuperAdmin) return { fields: { roleId: "Only a Super Admin can grant Super Admin." }, values: echo(fd) };
  if (await findUserByEmail(db, d.email)) return { fields: { email: "A user with this email already exists — change their roles instead." }, values: echo(fd) };
  const userId = await db.transaction(async (tx) => {
    const [u] = await tx.insert(t.users).values({ email: d.email, emailVerifiedAt: null }).returning({ id: t.users.id });
    await tx.insert(t.userProfiles).values({ userId: u.id, firstName: d.firstName, lastName: d.lastName });
    await assignRole(tx, u.id, role.key, v.id);
    return u.id;
  });
  const token = await createPasswordResetToken(db, userId, INVITE_TTL_MS);
  await sendEmail(db, { to: d.email, userId, template: "auth.staff_invite", vars: { firstName: d.firstName, roleName: role.name, url: absolute(`/reset-password/?token=${token}&invite=1`) } });
  await log(v.id, "staff.invite", "user", userId, `Invited ${d.email} as ${role.name}`);
  revalidatePath("/admin/users/");
  return { ok: true, message: `Invitation sent to ${d.email}. The link expires in 72 hours.` };
}

export async function setStaffRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("admins.manage");
  const userId = fdString(fd, "userId");
  const roleIds = fd.getAll("roleId").map(String);
  if (userId === v.id) return { error: "You can’t change your own roles." };
  const db = await getDb();
  const all = await db.select().from(t.roles).where(eq(t.roles.isStaff, true));
  const chosen = all.filter((r) => roleIds.includes(r.id));
  if (!chosen.length) return { error: "Choose at least one staff role (suspend the account to remove access)." };
  if (!v.isSuperAdmin && chosen.some((r) => r.key === "super_admin")) return { error: "Only a Super Admin can grant Super Admin." };
  await db.transaction(async (tx) => {
    await tx.delete(t.userRoles).where(and(eq(t.userRoles.userId, userId), inArray(t.userRoles.roleId, all.map((r) => r.id))));
    await tx.insert(t.userRoles).values(chosen.map((r) => ({ userId, roleId: r.id, assignedBy: v.id })));
  });
  await log(v.id, "staff.roles", "user", userId, `Roles set to ${chosen.map((r) => r.name).join(", ")}`);
  revalidatePath("/admin/users/");
  return { ok: true, message: "Roles updated." };
}

export async function saveRolePermissionsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("roles.manage");
  const roleId = fdString(fd, "roleId");
  const db = await getDb();
  const [role] = await db.select().from(t.roles).where(eq(t.roles.id, roleId));
  if (!role || role.key === "super_admin" || !role.isStaff) return { error: "This role’s permissions can’t be edited." };
  const valid = new Set(PERMISSIONS.map((p) => p.key as string));
  const perms = fd.getAll("perm").map(String).filter((p) => valid.has(p));
  await db.transaction(async (tx) => {
    await tx.delete(t.rolePermissions).where(eq(t.rolePermissions.roleId, roleId));
    if (perms.length) await tx.insert(t.rolePermissions).values(perms.map((p) => ({ roleId, permissionKey: p })));
  });
  await log(v.id, "role.permissions", "role", roleId, `${role.name}: ${perms.length} permission(s)`, { perms });
  revalidatePath("/admin/roles/");
  return { ok: true, message: `${role.name} permissions saved.` };
}

export async function createRoleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("roles.manage");
  const name = fdString(fd, "name").slice(0, 60);
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  if (name.length < 3) return { fields: { name: "Enter a role name." } };
  const db = await getDb();
  const [r] = await db.insert(t.roles).values({ key, name, description: fdString(fd, "description").slice(0, 200), isStaff: true }).onConflictDoNothing().returning();
  if (!r) return { fields: { name: "A role with this name already exists." } };
  await log(v.id, "role.create", "role", r.id, `Role ${name} created`);
  revalidatePath("/admin/roles/");
  return { ok: true, message: `Role ${name} created — now choose its permissions.` };
}

export async function deleteRoleAction(roleId: string) {
  const v = await requireStaff("roles.manage");
  const db = await getDb();
  const [r] = await db.select().from(t.roles).where(eq(t.roles.id, roleId));
  if (!r || r.isSystem) return;
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(t.userRoles).where(eq(t.userRoles.roleId, roleId));
  if (n > 0) return;
  await db.delete(t.roles).where(eq(t.roles.id, roleId));
  await log(v.id, "role.delete", "role", roleId, `Role ${r.name} deleted`);
  revalidatePath("/admin/roles/");
}

export async function saveTemplateAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("templates.manage");
  const key = fdString(fd, "key") as TemplateKey;
  if (!(key in TEMPLATES)) return { error: "Unknown template." };
  const subject = fdString(fd, "subject").slice(0, 200);
  const body = String(fd.get("body") ?? "").slice(0, 8000);
  if (!subject || body.trim().length < 5) return { error: "Subject and body are required.", values: echo(fd) };
  const db = await getDb();
  await db.insert(t.emailTemplates).values({ key, subject, body, updatedBy: v.id }).onConflictDoUpdate({ target: t.emailTemplates.key, set: { subject, body, updatedBy: v.id, updatedAt: new Date() } });
  await log(v.id, "template.save", "template", key, `Template ${key} edited`);
  revalidatePath(`/admin/templates/${key}/`);
  return { ok: true, message: "Template saved." };
}

export async function resetTemplateAction(key: string) {
  const v = await requireStaff("templates.manage");
  const db = await getDb();
  await db.delete(t.emailTemplates).where(eq(t.emailTemplates.key, key));
  await log(v.id, "template.reset", "template", key, `Template ${key} reset to default`);
  revalidatePath(`/admin/templates/${key}/`);
}

export async function saveSettingsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("settings.manage");
  const raw = Object.fromEntries(fd);
  const toMin = (s: unknown) => parseHHMM(String(s ?? "")) ?? NaN;
  const parsed = settingsSchema.safeParse({ ...raw, bookingDayStartMinute: toMin(raw.bookingDayStart), bookingDayEndMinute: toMin(raw.bookingDayEnd) });
  if (!parsed.success) return { error: "Please check the highlighted settings.", fields: zodFields(parsed.error), values: echo(fd) };
  if (parsed.data.bookingDayStartMinute >= parsed.data.bookingDayEndMinute) return { fields: { bookingDayEnd: "Closing time must be after opening time." }, values: echo(fd) };
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: parsed.data.timezone });
  } catch {
    return { fields: { timezone: "Unknown time zone." }, values: echo(fd) };
  }
  const db = await getDb();
  await saveSettings(db, parsed.data, v.id);
  await log(v.id, "settings.save", "settings", "system", "System settings updated", parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "Settings saved." };
}

/* ═══ Website content (CMS) ══════════════════════════════════════════════ */

export async function saveContentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireStaff("content.manage");
  const { contentSchemas } = await import("@/lib/content");
  const key = fdString(fd, "key");
  const all = (k: string) => fd.getAll(k).map(String);
  let value: unknown;
  if (key === "announcement") {
    const href = fdString(fd, "href");
    if (href && !href.startsWith("/") && !href.startsWith("https://")) return { error: "Links must start with / or https://", values: echo(fd) };
    value = { enabled: fd.get("enabled") === "on", text: fdString(fd, "text"), href };
  } else if (key === "faqs") {
    const answers = all("a");
    value = all("q")
      .map((q, i) => ({ q: q.trim(), a: (answers[i] ?? "").trim() }))
      .filter((x) => x.q && x.a);
  } else if (key === "testimonials") {
    const [names, locations, labels, outcomes] = [all("name"), all("location"), all("outcomeLabel"), all("outcomes")];
    value = all("quote")
      .map((quote, i) => ({
        quote: quote.trim(),
        name: (names[i] ?? "").trim(),
        location: (locations[i] ?? "").trim(),
        outcomeLabel: (labels[i] ?? "").trim(),
        outcomes: (outcomes[i] ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
      }))
      .filter((x) => x.quote && x.name);
  } else {
    return { error: "Unknown content block." };
  }
  const parsed = contentSchemas[key as keyof typeof contentSchemas].safeParse(value);
  if (!parsed.success) return { error: `Please check the content: ${parsed.error.issues[0]?.message ?? "invalid"}` };
  const db = await getDb();
  await db
    .insert(t.contentBlocks)
    .values({ key, value: parsed.data, updatedBy: v.id })
    .onConflictDoUpdate({ target: t.contentBlocks.key, set: { value: parsed.data, updatedBy: v.id, updatedAt: new Date() } });
  await log(v.id, "content.save", "content", key, `Website content “${key}” updated`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Published — the website updates on the next page view." };
}

export async function resetContentAction(key: string) {
  const v = await requireStaff("content.manage");
  const db = await getDb();
  await db.delete(t.contentBlocks).where(eq(t.contentBlocks.key, key));
  await log(v.id, "content.reset", "content", key, `Website content “${key}” reset to the original`);
  revalidatePath("/", "layout");
}

