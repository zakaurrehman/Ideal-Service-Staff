"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb, t } from "@/lib/db";
import { echo, fdString, zodFields, type ActionState } from "@/lib/action-state";
import { requireCustomer } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/core";
import { BookingError, createBooking, customerCancel, customerRequestReschedule, findCandidates } from "@/lib/booking/service";
import { daySlots } from "@/lib/booking/slots";
import { notify, notifyStaff } from "@/lib/notify";
import { getSettings } from "@/lib/settings";
import { fmtRange, isIsoDate, parseHHMM, zonedToUtc } from "@/lib/time";
import { addressSchema, dependentSchema, optText } from "@/lib/validation";
import { CARE_TYPES } from "@/lib/labels";

/* ── Addresses ─────────────────────────────────────────────────────────── */

export async function saveAddressAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireCustomer();
  const parsed = addressSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please check the address.", fields: zodFields(parsed.error), values: echo(fd) };
  const db = await getDb();
  const id = fdString(fd, "id");
  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: t.customerAddresses.id }).from(t.customerAddresses).where(and(eq(t.customerAddresses.customerId, v.id), isNull(t.customerAddresses.archivedAt)));
    const makeDefault = parsed.data.isDefault || existing.length === 0;
    if (makeDefault) await tx.update(t.customerAddresses).set({ isDefault: false }).where(eq(t.customerAddresses.customerId, v.id));
    if (id) {
      const res = await tx
        .update(t.customerAddresses)
        .set({ ...parsed.data, isDefault: makeDefault })
        .where(and(eq(t.customerAddresses.id, id), eq(t.customerAddresses.customerId, v.id)))
        .returning({ id: t.customerAddresses.id });
      if (!res.length) throw new Error("Address not found");
    } else {
      await tx.insert(t.customerAddresses).values({ ...parsed.data, isDefault: makeDefault, customerId: v.id });
    }
  });
  revalidatePath("/customer/addresses/");
  return { ok: true, message: id ? "Address updated." : "Address added." };
}

export async function archiveAddressAction(id: string) {
  const v = await requireCustomer();
  const db = await getDb();
  await db.update(t.customerAddresses).set({ archivedAt: new Date(), isDefault: false }).where(and(eq(t.customerAddresses.id, id), eq(t.customerAddresses.customerId, v.id)));
  revalidatePath("/customer/addresses/");
}

export async function setDefaultAddressAction(id: string) {
  const v = await requireCustomer();
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.update(t.customerAddresses).set({ isDefault: false }).where(eq(t.customerAddresses.customerId, v.id));
    await tx.update(t.customerAddresses).set({ isDefault: true }).where(and(eq(t.customerAddresses.id, id), eq(t.customerAddresses.customerId, v.id)));
  });
  revalidatePath("/customer/addresses/");
}

/* ── Family / dependents ───────────────────────────────────────────────── */

export async function saveDependentAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireCustomer();
  const parsed = dependentSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please check the details.", fields: zodFields(parsed.error), values: echo(fd) };
  const db = await getDb();
  const id = fdString(fd, "id");
  if (id) {
    await db.update(t.customerDependents).set(parsed.data).where(and(eq(t.customerDependents.id, id), eq(t.customerDependents.customerId, v.id)));
  } else {
    await db.insert(t.customerDependents).values({ ...parsed.data, customerId: v.id });
  }
  revalidatePath("/customer/dependents/");
  return { ok: true, message: id ? "Details updated." : "Family member added." };
}

export async function archiveDependentAction(id: string) {
  const v = await requireCustomer();
  const db = await getDb();
  await db.update(t.customerDependents).set({ archivedAt: new Date() }).where(and(eq(t.customerDependents.id, id), eq(t.customerDependents.customerId, v.id)));
  revalidatePath("/customer/dependents/");
}

/* ── Care preferences ──────────────────────────────────────────────────── */

const prefSchema = z.object({
  preferredContact: z.enum(["phone", "email", "whatsapp"]),
  preferredLanguage: optText(60),
  caregiverGenderPreference: z.enum(["no_preference", "female", "male"]),
  hasPets: z.preprocess((x) => x === "on", z.boolean()),
  notes: optText(1000),
});

export async function saveCarePreferencesAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireCustomer();
  const parsed = prefSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { error: "Please check the preferences.", fields: zodFields(parsed.error) };
  const db = await getDb();
  const { preferredContact, ...prefs } = parsed.data;
  await db.update(t.customerProfiles).set({ preferredContact }).where(eq(t.customerProfiles.userId, v.id));
  await db.insert(t.customerPreferences).values({ customerId: v.id, ...prefs }).onConflictDoUpdate({ target: t.customerPreferences.customerId, set: prefs });
  return { ok: true, message: "Preferences saved." };
}

/* ── Booking wizard (called from the client) ───────────────────────────── */

export async function getSlotsAction(serviceId: string, date: string, durationMinutes: number) {
  await requireCustomer();
  if (!isIsoDate(date) || !Number.isInteger(durationMinutes)) return [];
  const db = await getDb();
  const settings = await getSettings(db);
  return daySlots(date, durationMinutes, settings).map((s) => s.start.toISOString());
}

export type PublicProfessional = { id: string; displayName: string; avatarFileId: string | null; headline: string | null; yearsExperience: number | null; skills: string[] };

/** Available professionals for a slot — public fields only (first name + initial, photo, skills). */
export async function getProfessionalsAction(serviceId: string, startIso: string, durationMinutes: number): Promise<PublicProfessional[]> {
  const v = await requireCustomer();
  const db = await getDb();
  const settings = await getSettings(db);
  if (!settings.allowProfessionalSelection) return [];
  if (!(await rateLimit(db, `pros:${v.id}`, 120, 3600)).ok) return [];
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return [];
  const c = (await findCandidates(db, { serviceId, interval: { start, end: new Date(start.getTime() + durationMinutes * 60_000) }, tz: settings.timezone })).filter((x) => x.eligible);
  if (!c.length) return [];
  const ids = c.map((x) => x.id);
  const rows = await db
    .select({ id: t.userProfiles.userId, firstName: t.userProfiles.firstName, lastName: t.userProfiles.lastName, avatar: t.userProfiles.avatarFileId, headline: t.employeeProfiles.headline, years: t.employeeProfiles.yearsExperience })
    .from(t.userProfiles)
    .innerJoin(t.employeeProfiles, eq(t.employeeProfiles.userId, t.userProfiles.userId));
  const skills = await db.select().from(t.employeeSkills);
  return rows
    .filter((r) => ids.includes(r.id))
    .map((r) => ({
      id: r.id,
      displayName: `${r.firstName} ${r.lastName.charAt(0)}.`,
      avatarFileId: r.avatar,
      headline: r.headline,
      yearsExperience: r.years,
      skills: skills.filter((s) => s.employeeId === r.id).map((s) => s.skill).slice(0, 4),
    }));
}

const bookingInput = z.object({
  serviceId: z.string().uuid("Choose a service."),
  careType: z.enum(CARE_TYPES.map((c) => c.value) as [string, ...string[]], { message: "Choose a care type." }),
  durationMinutes: z.coerce.number().int().min(30).max(24 * 60),
  start: z.string().datetime({ message: "Choose a date and time." }),
  dependentId: z.union([z.literal(""), z.string().uuid()]).transform((x) => x || null),
  addressId: z.union([z.literal(""), z.string().uuid()]).transform((x) => x || null),
  newAddress: addressSchema.omit({ isDefault: true }).extend({ save: z.boolean().default(true) }).nullable(),
  preferredEmployeeId: z.union([z.literal(""), z.string().uuid()]).transform((x) => x || null),
  instructions: optText(2000),
});

export async function createBookingAction(raw: unknown): Promise<{ ok: true; reference: string } | { ok: false; error: string; fields?: Record<string, string> }> {
  const v = await requireCustomer();
  const parsed = bookingInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Some booking details are missing.", fields: zodFields(parsed.error) };
  const d = parsed.data;
  const db = await getDb();
  const settings = await getSettings(db);
  if (settings.requireVerifiedEmailToBook && !v.emailVerifiedAt) return { ok: false, error: "Please confirm your email address before booking — use the link we emailed you (or resend it from your dashboard)." };
  if (!(await rateLimit(db, `book:${v.id}`, 20, 3600)).ok) return { ok: false, error: "You’ve made several booking requests recently. Please wait a little or call us." };

  try {
    let addressId = d.addressId;
    if (!addressId && d.newAddress?.save) {
      const [a] = await db
        .insert(t.customerAddresses)
        .values({ ...d.newAddress, customerId: v.id, isDefault: false })
        .returning({ id: t.customerAddresses.id });
      addressId = a.id;
    }
    const booking = await createBooking(
      db,
      {
        customerId: v.id,
        serviceId: d.serviceId,
        careType: d.careType,
        durationMinutes: d.durationMinutes,
        start: new Date(d.start),
        dependentId: d.dependentId,
        addressId,
        address: addressId ? null : d.newAddress,
        preferredEmployeeId: d.preferredEmployeeId,
        instructions: d.instructions,
        source: "customer",
        createdBy: v.id,
      },
      settings,
    );
    const [svc] = await db.select({ name: t.services.name }).from(t.services).where(eq(t.services.id, d.serviceId));
    const when = fmtRange(booking.startsAt, booking.endsAt, settings.timezone);
    await notify(db, {
      userIds: [v.id],
      category: "bookings",
      title: `Booking request ${booking.reference} received`,
      body: `${svc.name} · ${when}`,
      href: `/customer/bookings/${booking.reference}/`,
      email: { template: "booking.submitted", vars: { reference: booking.reference, service: svc.name, when } },
    });
    await notifyStaff(db, "bookings.manage", { title: `New booking request ${booking.reference}`, body: `${v.firstName} ${v.lastName} · ${svc.name} · ${when}`, href: `/admin/bookings/${booking.id}/` });
    revalidatePath("/customer", "layout");
    return { ok: true, reference: booking.reference };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    throw err;
  }
}

/* ── Change requests ───────────────────────────────────────────────────── */

async function ownBooking(customerId: string, bookingId: string) {
  const db = await getDb();
  const [b] = await db.select().from(t.bookings).where(and(eq(t.bookings.id, bookingId), eq(t.bookings.customerId, customerId)));
  return b ?? null;
}

export async function cancelBookingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireCustomer();
  const b = await ownBooking(v.id, fdString(fd, "bookingId"));
  if (!b) return { error: "Booking not found." };
  const reason = fdString(fd, "reason").slice(0, 1000) || null;
  const db = await getDb();
  try {
    const res = await customerCancel(db, b.id, v.id, reason);
    await notifyStaff(db, "bookings.manage", {
      title: res.outcome === "cancelled" ? `Booking ${b.reference} withdrawn by customer` : `Cancellation requested for ${b.reference}`,
      body: reason ?? "No reason given",
      href: `/admin/bookings/${b.id}/`,
    });
    revalidatePath(`/customer/bookings/${b.reference}/`);
    return { ok: true, message: res.outcome === "cancelled" ? "Your booking request has been cancelled." : "Cancellation requested — our team will confirm shortly." };
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message };
    throw err;
  }
}

export async function requestRescheduleAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const v = await requireCustomer();
  const b = await ownBooking(v.id, fdString(fd, "bookingId"));
  if (!b) return { error: "Booking not found." };
  const date = fdString(fd, "date");
  const minute = parseHHMM(fdString(fd, "time"));
  if (!isIsoDate(date) || minute === null) return { error: "Choose a new date and time.", values: echo(fd) };
  const db = await getDb();
  const settings = await getSettings(db);
  try {
    const start = zonedToUtc(date, minute, settings.timezone);
    await customerRequestReschedule(db, b.id, v.id, start, fdString(fd, "reason").slice(0, 1000) || null, settings);
    await notifyStaff(db, "bookings.manage", { title: `Reschedule requested for ${b.reference}`, body: `New time requested: ${fmtRange(start, new Date(start.getTime() + (b.endsAt.getTime() - b.startsAt.getTime())), settings.timezone)}`, href: `/admin/bookings/${b.id}/` });
    revalidatePath(`/customer/bookings/${b.reference}/`);
    return { ok: true, message: "Reschedule requested — we’ll confirm the new time with you." };
  } catch (err) {
    if (err instanceof BookingError) return { error: err.message, values: echo(fd) };
    throw err;
  }
}
