/**
 * Booking engine (database-injected so it is fully testable).
 * Integrity rules live here; Server Actions only add auth + notifications.
 *
 * Concurrency: assignments reserve time in employee_schedules, protected by a
 * PostgreSQL exclusion constraint — two overlapping reservations for the same
 * employee can never both commit. Booking rows are locked FOR UPDATE while
 * their status changes.
 */
import { randomInt } from "node:crypto";
import { and, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import type { DB, Queryable, Tx } from "../db/client";
import {
  availabilityBlocks,
  bookingAssignments,
  bookingServices,
  bookingStatusHistory,
  bookings,
  customerAddresses,
  customerDependents,
  employeeAvailability,
  employeeProfiles,
  employeeSchedules,
  employeeServiceAreas,
  employeeServices,
  services,
  userProfiles,
  users,
} from "../db/schema";
import type { BookingStatus } from "../labels";
import type { Settings } from "../settings";
import { daySlots, overlaps, withinWeeklyHours, type Interval } from "./slots";
import { ASSIGNED_STATUSES, UPCOMING_STATUSES, canTransition, customerCanCancelDirectly, customerCanRequestChange, type Actor } from "./status";

export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const makeReference = (prefix: string) => `${prefix}-${Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")}`;

const isPgCode = (err: unknown, code: string) => {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === code || e?.cause?.code === code;
};

/* ── Eligibility ───────────────────────────────────────────────────────── */

export type Candidate = {
  id: string;
  name: string;
  firstName: string;
  eligible: boolean;
  reasons: string[];
  areaMatch: boolean;
  upcomingCount: number;
  preferred: boolean;
};

/**
 * Every approved, active professional with the reasons they can or can't take
 * this visit. Ranking: preferred → area match → fewer upcoming visits → name.
 */
export async function findCandidates(
  db: Queryable,
  opts: { serviceId: string; interval: Interval; tz: string; postalCode?: string | null; city?: string | null; excludeBookingId?: string; preferredId?: string | null },
): Promise<Candidate[]> {
  const emps = await db
    .select({ id: users.id, firstName: userProfiles.firstName, lastName: userProfiles.lastName })
    .from(employeeProfiles)
    .innerJoin(users, eq(users.id, employeeProfiles.userId))
    .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
    .where(and(eq(employeeProfiles.verificationStatus, "approved"), eq(users.status, "active")));
  if (!emps.length) return [];
  const ids = emps.map((e) => e.id);
  const { start, end } = opts.interval;

  const [eligibleRows, hours, blocks, busy, areas, load] = await Promise.all([
    db
      .select({ id: employeeServices.employeeId })
      .from(employeeServices)
      .where(and(inArray(employeeServices.employeeId, ids), eq(employeeServices.serviceId, opts.serviceId), eq(employeeServices.status, "approved"))),
    db.select().from(employeeAvailability).where(inArray(employeeAvailability.employeeId, ids)),
    db
      .select({ id: availabilityBlocks.employeeId })
      .from(availabilityBlocks)
      .where(and(inArray(availabilityBlocks.employeeId, ids), lt(availabilityBlocks.startsAt, end), gt(availabilityBlocks.endsAt, start))),
    db
      .select({ id: employeeSchedules.employeeId, bookingId: employeeSchedules.bookingId })
      .from(employeeSchedules)
      .where(and(inArray(employeeSchedules.employeeId, ids), lt(employeeSchedules.startsAt, end), gt(employeeSchedules.endsAt, start))),
    db.select().from(employeeServiceAreas).where(inArray(employeeServiceAreas.employeeId, ids)),
    db
      .select({ id: employeeSchedules.employeeId, n: sql<number>`count(*)::int` })
      .from(employeeSchedules)
      .where(and(inArray(employeeSchedules.employeeId, ids), gt(employeeSchedules.startsAt, new Date())))
      .groupBy(employeeSchedules.employeeId),
  ]);
  const qualified = new Set(eligibleRows.map((r) => r.id));
  const blocked = new Set(blocks.map((b) => b.id));
  const conflicted = new Set(busy.filter((b) => !opts.excludeBookingId || b.bookingId !== opts.excludeBookingId).map((b) => b.id));
  const loadBy = new Map(load.map((l) => [l.id, l.n]));
  const needle = [opts.postalCode, opts.city].filter(Boolean).map((v) => v!.toLowerCase().trim());

  return emps
    .map((e) => {
      const reasons: string[] = [];
      if (!qualified.has(e.id)) reasons.push("Not approved for this service");
      const wh = hours.filter((h) => h.employeeId === e.id);
      if (!withinWeeklyHours(opts.interval, wh, opts.tz)) reasons.push(wh.length ? "Outside working hours" : "No working hours set");
      if (blocked.has(e.id)) reasons.push("Time off");
      if (conflicted.has(e.id)) reasons.push("Already booked at this time");
      const empAreas = areas.filter((a) => a.employeeId === e.id).map((a) => a.area.toLowerCase());
      return {
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        firstName: e.firstName,
        eligible: reasons.length === 0,
        reasons,
        areaMatch: needle.some((n) => empAreas.includes(n)),
        upcomingCount: loadBy.get(e.id) ?? 0,
        preferred: e.id === opts.preferredId,
      };
    })
    .sort(
      (a, b) =>
        Number(b.eligible) - Number(a.eligible) ||
        Number(b.preferred) - Number(a.preferred) ||
        Number(b.areaMatch) - Number(a.areaMatch) ||
        a.upcomingCount - b.upcomingCount ||
        a.name.localeCompare(b.name),
    );
}

/* ── Creating bookings ─────────────────────────────────────────────────── */

export type NewBooking = {
  customerId: string;
  serviceId: string;
  careType: string;
  durationMinutes: number;
  start: Date;
  dependentId?: string | null;
  addressId?: string | null;
  address?: { line1: string; line2?: string | null; city: string; region: string; postalCode: string; accessNotes?: string | null } | null;
  preferredEmployeeId?: string | null;
  instructions?: string | null;
  status?: BookingStatus;
  source: "customer" | "admin";
  createdBy: string;
};

export async function createBooking(db: DB, input: NewBooking, settings: Settings) {
  const [svc] = await db.select().from(services).where(eq(services.id, input.serviceId));
  if (!svc || !svc.isActive || svc.archivedAt || !svc.isBookable) throw new BookingError("This service isn’t available for online booking.");
  if (input.durationMinutes < svc.minDurationMinutes || input.durationMinutes > svc.maxDurationMinutes) {
    throw new BookingError(`Choose a visit length between ${svc.minDurationMinutes / 60} and ${svc.maxDurationMinutes / 60} hours.`);
  }
  const end = new Date(input.start.getTime() + input.durationMinutes * 60_000);
  if (input.source === "customer") {
    const date = new Intl.DateTimeFormat("en-CA", { timeZone: settings.timezone }).format(input.start);
    const valid = daySlots(date, input.durationMinutes, settings).some((s) => s.start.getTime() === input.start.getTime());
    if (!valid) throw new BookingError("That time is no longer available. Please choose another slot.");
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(bookings)
      .where(and(eq(bookings.customerId, input.customerId), inArray(bookings.status, UPCOMING_STATUSES), gt(bookings.endsAt, new Date())));
    if (n >= settings.maxActiveBookingsPerCustomer) throw new BookingError(`You have ${n} upcoming bookings, which is the current limit. Please contact us to book more.`);
  } else if (input.start < new Date()) {
    throw new BookingError("Choose a time in the future.");
  }

  // Recipient: the customer themself or one of their own dependents.
  let recipientName = "";
  if (input.dependentId) {
    const [dep] = await db
      .select()
      .from(customerDependents)
      .where(and(eq(customerDependents.id, input.dependentId), eq(customerDependents.customerId, input.customerId)));
    if (!dep || dep.archivedAt) throw new BookingError("Choose who the care is for.");
    recipientName = `${dep.firstName} ${dep.lastName}`;
  } else {
    const [p] = await db.select().from(userProfiles).where(eq(userProfiles.userId, input.customerId));
    recipientName = p ? `${p.firstName} ${p.lastName}` : "Account holder";
  }

  // Location: one of the customer's saved addresses (ownership checked) or an explicit address.
  let addr = input.address ?? null;
  if (input.addressId) {
    const [a] = await db
      .select()
      .from(customerAddresses)
      .where(and(eq(customerAddresses.id, input.addressId), eq(customerAddresses.customerId, input.customerId)));
    if (!a || a.archivedAt) throw new BookingError("Choose a service address.");
    addr = { line1: a.line1, line2: a.line2, city: a.city, region: a.region, postalCode: a.postalCode, accessNotes: a.accessNotes };
  }
  if (!addr) throw new BookingError("Add the address where care is needed.");

  if (input.preferredEmployeeId) {
    if (!settings.allowProfessionalSelection && input.source === "customer") throw new BookingError("Choosing a professional isn’t available right now.");
    const c = await findCandidates(db, { serviceId: svc.id, interval: { start: input.start, end }, tz: settings.timezone });
    if (!c.find((x) => x.id === input.preferredEmployeeId && x.eligible)) throw new BookingError("That professional isn’t available at this time. Choose another time or let us match you.");
  }

  const status = input.status ?? "pending_review";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.transaction(async (tx) => {
        const [b] = await tx
          .insert(bookings)
          .values({
            reference: makeReference("ISS"),
            customerId: input.customerId,
            dependentId: input.dependentId ?? null,
            recipientName,
            careType: input.careType,
            addressId: input.addressId ?? null,
            addressLine1: addr!.line1,
            addressLine2: addr!.line2 ?? null,
            city: addr!.city,
            region: addr!.region,
            postalCode: addr!.postalCode,
            accessNotes: addr!.accessNotes ?? null,
            startsAt: input.start,
            endsAt: end,
            timezone: settings.timezone,
            status,
            preferredEmployeeId: input.preferredEmployeeId ?? null,
            instructions: input.instructions ?? null,
            source: input.source,
            createdBy: input.createdBy,
          })
          .returning();
        await tx.insert(bookingServices).values({ bookingId: b.id, serviceId: svc.id, serviceName: svc.name, durationMinutes: input.durationMinutes });
        await tx.insert(bookingStatusHistory).values({ bookingId: b.id, fromStatus: null, toStatus: status, changedBy: input.createdBy, actor: input.source === "admin" ? "admin" : "customer", note: "Booking created" });
        return b;
      });
    } catch (err) {
      if (isPgCode(err, "23505") && String(err).includes("reference")) continue; // reference collision → retry
      throw err;
    }
  }
  throw new BookingError("Could not create the booking. Please try again.");
}

/* ── Status changes ────────────────────────────────────────────────────── */

async function lockBooking(tx: Tx, id: string) {
  const [b] = await tx.select().from(bookings).where(eq(bookings.id, id)).for("update");
  if (!b) throw new BookingError("Booking not found.");
  return b;
}

async function releaseAssignment(tx: Tx, bookingId: string, status: "declined" | "withdrawn", note?: string) {
  const live = await tx
    .update(bookingAssignments)
    .set({ status, respondedAt: new Date(), responseNote: note ?? null })
    .where(and(eq(bookingAssignments.bookingId, bookingId), inArray(bookingAssignments.status, ["offered", "accepted"])))
    .returning({ id: bookingAssignments.id, employeeId: bookingAssignments.employeeId });
  if (live.length) await tx.delete(employeeSchedules).where(inArray(employeeSchedules.assignmentId, live.map((l) => l.id)));
  return live[0]?.employeeId ?? null;
}

async function record(tx: Tx, bookingId: string, from: BookingStatus | null, to: BookingStatus, actor: Actor, userId: string | null, note?: string | null) {
  await tx.insert(bookingStatusHistory).values({ bookingId, fromStatus: from, toStatus: to, changedBy: userId, actor, note: note ?? null });
}

/** Generic transition (admin status changes, employee start/complete, customer withdrawal). */
export async function transition(db: DB, bookingId: string, to: BookingStatus, by: { actor: Actor; userId: string | null }, note?: string | null) {
  return db.transaction(async (tx) => {
    const b = await lockBooking(tx, bookingId);
    if (!canTransition(b.status, to, by.actor)) throw new BookingError(`A booking that is “${b.status.replace(/_/g, " ")}” can’t be moved to “${to.replace(/_/g, " ")}”.`);
    if (to === "assigned") throw new BookingError("Use “Assign professional” to assign someone.");
    if (b.status === "cancellation_requested" && to !== "cancelled" && to !== b.statusBeforeRequest) throw new BookingError("Declining the request returns the booking to its previous status.");
    let released: string | null = null;
    if (["cancelled", "rejected", "pending_assignment"].includes(to)) released = await releaseAssignment(tx, b.id, "withdrawn", note ?? undefined);
    const [updated] = await tx
      .update(bookings)
      .set({
        status: to,
        ...(to === "cancelled" && note ? { cancellationReason: note } : {}),
        ...(b.status === "cancellation_requested" ? { statusBeforeRequest: null } : {}),
      })
      .where(eq(bookings.id, b.id))
      .returning();
    await record(tx, b.id, b.status, to, by.actor, by.userId, note);
    return { booking: updated, from: b.status, releasedEmployeeId: released };
  });
}

/** Admin assigns (or reassigns) a professional — fresh eligibility check + DB-enforced no-overlap. */
export async function assignProfessional(db: DB, bookingId: string, employeeId: string, adminId: string, tz: string) {
  try {
    return await db.transaction(async (tx) => {
      const b = await lockBooking(tx, bookingId);
      if (!["pending_assignment", "assigned", "accepted", "confirmed"].includes(b.status)) {
        throw new BookingError("Professionals can be assigned once a booking is approved (Pending assignment).");
      }
      const [svc] = await tx.select({ id: bookingServices.serviceId }).from(bookingServices).where(eq(bookingServices.bookingId, b.id)).limit(1);
      const candidates = await findCandidates(tx, { serviceId: svc.id, interval: { start: b.startsAt, end: b.endsAt }, tz, excludeBookingId: b.id });
      const c = candidates.find((x) => x.id === employeeId);
      if (!c) throw new BookingError("Only approved, active professionals can be assigned.");
      if (!c.eligible) throw new BookingError(`${c.name} can’t take this visit: ${c.reasons.join(", ").toLowerCase()}.`);
      const previous = await releaseAssignment(tx, b.id, "withdrawn", "Reassigned");
      const [a] = await tx.insert(bookingAssignments).values({ bookingId: b.id, employeeId, assignedBy: adminId }).returning();
      await tx.insert(employeeSchedules).values({ employeeId, bookingId: b.id, assignmentId: a.id, kind: "booking", startsAt: b.startsAt, endsAt: b.endsAt, title: b.reference, createdBy: adminId });
      await tx.update(bookings).set({ status: "assigned" }).where(eq(bookings.id, b.id));
      await record(tx, b.id, b.status, "assigned", "admin", adminId, `Assigned to ${c.name}`);
      return { booking: b, assignment: a, previousEmployeeId: previous };
    });
  } catch (err) {
    if (isPgCode(err, "23P01")) throw new BookingError("That professional was just booked for an overlapping time. Choose someone else.");
    throw err;
  }
}

/** Employee accepts or declines an offered assignment (only their own). */
export async function respondToAssignment(db: DB, assignmentId: string, employeeId: string, accept: boolean, note?: string | null) {
  return db.transaction(async (tx) => {
    const [a] = await tx
      .select()
      .from(bookingAssignments)
      .where(and(eq(bookingAssignments.id, assignmentId), eq(bookingAssignments.employeeId, employeeId)))
      .for("update");
    if (!a) throw new BookingError("Assignment not found.");
    if (a.status !== "offered") throw new BookingError("You’ve already responded to this assignment.");
    const b = await lockBooking(tx, a.bookingId);
    if (b.status !== "assigned") throw new BookingError("This booking has changed — please refresh.");
    if (accept) {
      await tx.update(bookingAssignments).set({ status: "accepted", respondedAt: new Date(), responseNote: note ?? null }).where(eq(bookingAssignments.id, a.id));
      await tx.update(bookings).set({ status: "accepted" }).where(eq(bookings.id, b.id));
      await record(tx, b.id, b.status, "accepted", "employee", employeeId, note);
    } else {
      await tx.update(bookingAssignments).set({ status: "declined", respondedAt: new Date(), responseNote: note ?? null }).where(eq(bookingAssignments.id, a.id));
      await tx.delete(employeeSchedules).where(eq(employeeSchedules.assignmentId, a.id));
      await tx.update(bookings).set({ status: "pending_assignment" }).where(eq(bookings.id, b.id));
      await record(tx, b.id, b.status, "pending_assignment", "employee", employeeId, note ? `Declined: ${note}` : "Declined by professional");
    }
    return b;
  });
}

/** Employee marks their accepted visit started / completed. */
export async function employeeProgress(db: DB, bookingId: string, employeeId: string, to: "in_progress" | "completed", settings: Settings) {
  const [a] = await db
    .select()
    .from(bookingAssignments)
    .where(and(eq(bookingAssignments.bookingId, bookingId), eq(bookingAssignments.employeeId, employeeId), eq(bookingAssignments.status, "accepted")));
  if (!a) throw new BookingError("Only the assigned professional can update this visit.");
  const [b] = await db.select().from(bookings).where(eq(bookings.id, bookingId));
  if (to === "in_progress" && Date.now() < b.startsAt.getTime() - settings.employeeStartWindowMinutes * 60_000) {
    throw new BookingError(`You can start this visit from ${settings.employeeStartWindowMinutes} minutes before the scheduled time.`);
  }
  return transition(db, bookingId, to, { actor: "employee", userId: employeeId });
}

/* ── Customer change requests ──────────────────────────────────────────── */

export async function customerCancel(db: DB, bookingId: string, customerId: string, reason: string | null) {
  return db.transaction(async (tx) => {
    const b = await lockBooking(tx, bookingId);
    if (b.customerId !== customerId) throw new BookingError("Booking not found.");
    if (customerCanCancelDirectly(b.status)) {
      await tx.update(bookings).set({ status: "cancelled", cancellationReason: reason }).where(eq(bookings.id, b.id));
      await record(tx, b.id, b.status, "cancelled", "customer", customerId, reason ?? "Withdrawn by customer");
      return { booking: b, outcome: "cancelled" as const };
    }
    if (!customerCanRequestChange(b.status)) throw new BookingError("This booking can no longer be cancelled online. Please contact us.");
    await tx
      .update(bookings)
      .set({ status: "cancellation_requested", statusBeforeRequest: b.status, cancellationReason: reason, cancelRequestedAt: new Date() })
      .where(eq(bookings.id, b.id));
    await record(tx, b.id, b.status, "cancellation_requested", "customer", customerId, reason);
    return { booking: b, outcome: "requested" as const };
  });
}

export async function customerRequestReschedule(db: DB, bookingId: string, customerId: string, start: Date, reason: string | null, settings: Settings) {
  const [b] = await db.select().from(bookings).where(and(eq(bookings.id, bookingId), eq(bookings.customerId, customerId)));
  if (!b) throw new BookingError("Booking not found.");
  if (!customerCanRequestChange(b.status) && b.status !== "pending_review") throw new BookingError("This booking can’t be rescheduled online. Please contact us.");
  const duration = b.endsAt.getTime() - b.startsAt.getTime();
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: settings.timezone }).format(start);
  if (!daySlots(date, duration / 60_000, settings).some((s) => s.start.getTime() === start.getTime())) throw new BookingError("Choose an available time.");
  await db
    .update(bookings)
    .set({ rescheduleStartsAt: start, rescheduleEndsAt: new Date(start.getTime() + duration), rescheduleReason: reason, rescheduleRequestedAt: new Date() })
    .where(eq(bookings.id, b.id));
  return b;
}

/**
 * Admin moves a booking (own decision or approving a customer request).
 * A live assignment is kept only if the professional can still make it;
 * otherwise it is released and the booking returns to Pending assignment.
 */
export async function reschedule(db: DB, bookingId: string, start: Date, end: Date, adminId: string, tz: string) {
  if (!(start < end)) throw new BookingError("The visit must end after it starts.");
  return db.transaction(async (tx) => {
    const b = await lockBooking(tx, bookingId);
    if (["completed", "cancelled", "rejected", "in_progress"].includes(b.status)) throw new BookingError("This booking can no longer be rescheduled.");
    await tx
      .update(bookings)
      .set({ startsAt: start, endsAt: end, rescheduleStartsAt: null, rescheduleEndsAt: null, rescheduleReason: null, rescheduleRequestedAt: null })
      .where(eq(bookings.id, b.id));
    let kept = false;
    let releasedEmployeeId: string | null = null;
    const [live] = await tx
      .select()
      .from(bookingAssignments)
      .where(and(eq(bookingAssignments.bookingId, b.id), inArray(bookingAssignments.status, ["offered", "accepted"])));
    if (live && ASSIGNED_STATUSES.includes(b.status)) {
      const [svc] = await tx.select({ id: bookingServices.serviceId }).from(bookingServices).where(eq(bookingServices.bookingId, b.id)).limit(1);
      const c = (await findCandidates(tx, { serviceId: svc.id, interval: { start, end }, tz, excludeBookingId: b.id })).find((x) => x.id === live.employeeId);
      if (c?.eligible) {
        await tx.execute(sql`SAVEPOINT resched`);
        try {
          await tx.update(employeeSchedules).set({ startsAt: start, endsAt: end }).where(eq(employeeSchedules.assignmentId, live.id));
          await tx.execute(sql`RELEASE SAVEPOINT resched`);
          kept = true;
        } catch (err) {
          if (!isPgCode(err, "23P01")) throw err;
          await tx.execute(sql`ROLLBACK TO SAVEPOINT resched`);
        }
      }
      if (!kept) {
        releasedEmployeeId = await releaseAssignment(tx, b.id, "withdrawn", "Released after reschedule");
        await tx.update(bookings).set({ status: "pending_assignment" }).where(eq(bookings.id, b.id));
      }
    }
    const to: BookingStatus = live && !kept && ASSIGNED_STATUSES.includes(b.status) ? "pending_assignment" : b.status;
    await record(tx, b.id, b.status, to, "admin", adminId, `Rescheduled${live ? (kept ? " — professional kept" : " — professional released, needs reassignment") : ""}`);
    return { booking: b, keptProfessional: kept, releasedEmployeeId };
  });
}

export async function clearRescheduleRequest(db: Queryable, bookingId: string) {
  await db.update(bookings).set({ rescheduleStartsAt: null, rescheduleEndsAt: null, rescheduleReason: null, rescheduleRequestedAt: null }).where(eq(bookings.id, bookingId));
}

/** Current live assignment (offered/accepted) with the professional's name. */
export async function liveAssignment(db: Queryable, bookingId: string) {
  const [a] = await db
    .select({ id: bookingAssignments.id, status: bookingAssignments.status, employeeId: bookingAssignments.employeeId, firstName: userProfiles.firstName, lastName: userProfiles.lastName, avatarFileId: userProfiles.avatarFileId })
    .from(bookingAssignments)
    .innerJoin(userProfiles, eq(userProfiles.userId, bookingAssignments.employeeId))
    .where(and(eq(bookingAssignments.bookingId, bookingId), inArray(bookingAssignments.status, ["offered", "accepted"])));
  return a ?? null;
}

