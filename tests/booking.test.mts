import { test } from "node:test";
import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { address, at, firstService, makeUser, settings, testDb } from "./helpers";
import * as t from "../src/lib/db/schema";
import {
  BookingError,
  assignProfessional,
  createBooking,
  customerCancel,
  findCandidates,
  reschedule,
  respondToAssignment,
  transition,
} from "../src/lib/booking/service";
import { canTransition, nextStatuses } from "../src/lib/booking/status";
import { daySlots, withinWeeklyHours } from "../src/lib/booking/slots";
import { addDays, todayIn, zonedParts, zonedToUtc } from "../src/lib/time";

const db = await testDb();
const tz = settings.timezone;
const svc = await firstService(db);

async function book(customerId: string, start: Date, extra: Partial<Parameters<typeof createBooking>[1]> = {}) {
  return createBooking(db, { customerId, serviceId: svc.id, careType: "one-time", durationMinutes: 240, start, address, source: "customer", createdBy: customerId, ...extra }, settings);
}
async function approve(id: string, adminId: string) {
  return transition(db, id, "pending_assignment", { actor: "admin", userId: adminId });
}

test("status machine: actors are restricted", () => {
  assert.ok(canTransition("pending_review", "pending_assignment", "admin"));
  assert.ok(!canTransition("pending_review", "pending_assignment", "customer"));
  assert.ok(canTransition("assigned", "accepted", "employee"));
  assert.ok(!canTransition("assigned", "accepted", "admin"));
  assert.ok(!canTransition("completed", "cancelled", "admin"));
  assert.deepEqual(nextStatuses("completed", "admin"), []);
});

test("time zones: wall-clock ↔ UTC across DST", () => {
  // 2026-03-08 is the US spring-forward day; 9:00 AM PDT = 16:00 UTC, the day before 9:00 AM PST = 17:00 UTC
  assert.equal(zonedToUtc("2026-03-08", 9 * 60, "America/Los_Angeles").toISOString(), "2026-03-08T16:00:00.000Z");
  assert.equal(zonedToUtc("2026-03-07", 9 * 60, "America/Los_Angeles").toISOString(), "2026-03-07T17:00:00.000Z");
  assert.equal(zonedToUtc("2026-11-19", 0, "America/Los_Angeles").toISOString(), "2026-11-19T08:00:00.000Z");
});

test("slots respect lead time, window and closing time", () => {
  const today = todayIn(tz);
  assert.equal(daySlots(today, 240, settings).length, 0, "24h lead time");
  assert.equal(daySlots(addDays(today, settings.bookingWindowDays + 2), 240, settings).length, 0, "outside window");
  const s = daySlots(addDays(today, 3), 240, settings);
  assert.ok(s.length > 0);
  const last = s[s.length - 1];
  const endMinute = zonedParts(last.end, tz).hour * 60 + zonedParts(last.end, tz).minute;
  assert.ok(endMinute <= settings.bookingDayEndMinute, "visit ends by closing time");
  assert.ok(withinWeeklyHours({ start: at(3, 10), end: at(3, 14) }, [{ weekday: zonedParts(at(3, 10), tz).weekday, startMinute: 600, endMinute: 840 }], tz));
  assert.ok(!withinWeeklyHours({ start: at(3, 10), end: at(3, 15) }, [{ weekday: zonedParts(at(3, 10), tz).weekday, startMinute: 600, endMinute: 840 }], tz));
});

test("customer booking validation: only real slots, own addresses and dependents", async () => {
  const c = await makeUser(db, "customer");
  const other = await makeUser(db, "customer");
  await assert.rejects(book(c.id, at(3, 10, 7)), BookingError, "off-grid time");
  await assert.rejects(book(c.id, at(0, 23)), BookingError, "inside lead time");
  const [foreignAddr] = await db.insert(t.customerAddresses).values({ customerId: other.id, label: "Home", ...address }).returning();
  await assert.rejects(book(c.id, at(3, 10), { addressId: foreignAddr.id, address: null }), /address/i);
  const [foreignDep] = await db.insert(t.customerDependents).values({ customerId: other.id, firstName: "A", lastName: "B", relationship: "Parent" }).returning();
  await assert.rejects(book(c.id, at(3, 10), { dependentId: foreignDep.id }), /care is for/i);
  const b = await book(c.id, at(3, 10));
  assert.equal(b.status, "pending_review");
  assert.match(b.reference, /^ISS-[A-Z2-9]{6}$/);
});

test("eligibility: unapproved, unqualified, off-hours and time-off professionals are excluded", async () => {
  const ok = await makeUser(db, "employee", { approved: true, serviceId: svc.id });
  const unapproved = await makeUser(db, "employee", { approved: false, serviceId: svc.id });
  const unqualified = await makeUser(db, "employee", { approved: true });
  const away = await makeUser(db, "employee", { approved: true, serviceId: svc.id });
  await db.insert(t.availabilityBlocks).values({ employeeId: away.id, startsAt: at(5, 0), endsAt: at(6, 0) });
  const c = await findCandidates(db, { serviceId: svc.id, interval: { start: at(5, 10), end: at(5, 14) }, tz });
  const by = (id: string) => c.find((x) => x.id === id);
  assert.equal(by(ok.id)?.eligible, true);
  assert.equal(by(unapproved.id), undefined, "not approved → not a candidate at all");
  assert.deepEqual(by(unqualified.id)?.reasons, ["Not approved for this service"]);
  assert.deepEqual(by(away.id)?.reasons, ["Time off"]);
  const late = await findCandidates(db, { serviceId: svc.id, interval: { start: at(5, 20), end: at(5, 23) }, tz });
  assert.ok(late.find((x) => x.id === ok.id)?.reasons.includes("Outside working hours"));
});

test("assignment flow: assign → accept → confirm → start → complete", async () => {
  const admin = await makeUser(db, "admin");
  const c = await makeUser(db, "customer");
  const e = await makeUser(db, "employee", { approved: true, serviceId: svc.id });
  const b = await book(c.id, at(4, 9));
  await assert.rejects(assignProfessional(db, b.id, e.id, admin.id, tz), /approved/i, "cannot assign before approval");
  await approve(b.id, admin.id);
  const { assignment } = await assignProfessional(db, b.id, e.id, admin.id, tz);
  await respondToAssignment(db, assignment.id, e.id, true);
  await transition(db, b.id, "confirmed", { actor: "admin", userId: admin.id });
  await transition(db, b.id, "in_progress", { actor: "employee", userId: e.id });
  const done = await transition(db, b.id, "completed", { actor: "employee", userId: e.id });
  assert.equal(done.booking.status, "completed");
  const history = await db.select().from(t.bookingStatusHistory).where(eq(t.bookingStatusHistory.bookingId, b.id));
  assert.deepEqual(history.map((h) => h.toStatus), ["pending_review", "pending_assignment", "assigned", "accepted", "confirmed", "in_progress", "completed"]);
});

test("double booking is impossible, including concurrent assignments", async () => {
  const admin = await makeUser(db, "admin");
  const e = await makeUser(db, "employee", { approved: true, serviceId: svc.id });
  const c1 = await makeUser(db, "customer");
  const c2 = await makeUser(db, "customer");
  const b1 = await book(c1.id, at(6, 10));
  const b2 = await book(c2.id, at(6, 12)); // overlaps 12:00–14:00
  await approve(b1.id, admin.id);
  await approve(b2.id, admin.id);
  const results = await Promise.allSettled([assignProfessional(db, b1.id, e.id, admin.id, tz), assignProfessional(db, b2.id, e.id, admin.id, tz)]);
  const ok = results.filter((r) => r.status === "fulfilled");
  assert.equal(ok.length, 1, "exactly one assignment wins");
  const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
  assert.ok(failed.reason instanceof BookingError, String(failed.reason));
  const sched = await db.select().from(t.employeeSchedules).where(eq(t.employeeSchedules.employeeId, e.id));
  assert.equal(sched.length, 1);
});

test("decline releases the time; reschedule keeps or releases the professional", async () => {
  const admin = await makeUser(db, "admin");
  const e = await makeUser(db, "employee", { approved: true, serviceId: svc.id });
  const c = await makeUser(db, "customer");
  const b = await book(c.id, at(8, 9));
  await approve(b.id, admin.id);
  const a1 = await assignProfessional(db, b.id, e.id, admin.id, tz);
  await respondToAssignment(db, a1.assignment.id, e.id, false, "Busy");
  let [row] = await db.select().from(t.bookings).where(eq(t.bookings.id, b.id));
  assert.equal(row.status, "pending_assignment");
  assert.equal((await db.select().from(t.employeeSchedules).where(eq(t.employeeSchedules.bookingId, b.id))).length, 0);

  const a2 = await assignProfessional(db, b.id, e.id, admin.id, tz);
  await respondToAssignment(db, a2.assignment.id, e.id, true);
  const kept = await reschedule(db, b.id, at(8, 13), at(8, 17), admin.id, tz);
  assert.equal(kept.keptProfessional, true);
  const [s] = await db.select().from(t.employeeSchedules).where(eq(t.employeeSchedules.bookingId, b.id));
  assert.equal(s.startsAt.getTime(), at(8, 13).getTime());

  const released = await reschedule(db, b.id, at(8, 19), at(8, 23), admin.id, tz); // past 22:00 working hours
  assert.equal(released.keptProfessional, false);
  [row] = await db.select().from(t.bookings).where(eq(t.bookings.id, b.id));
  assert.equal(row.status, "pending_assignment");
});

test("customers can only cancel their own bookings; requests vs direct withdrawal", async () => {
  const admin = await makeUser(db, "admin");
  const owner = await makeUser(db, "customer");
  const intruder = await makeUser(db, "customer");
  const b = await book(owner.id, at(9, 10));
  await assert.rejects(customerCancel(db, b.id, intruder.id, null), /not found/i);
  const direct = await customerCancel(db, b.id, owner.id, "Changed plans");
  assert.equal(direct.outcome, "cancelled");

  const b2 = await book(owner.id, at(10, 10));
  await approve(b2.id, admin.id);
  const req = await customerCancel(db, b2.id, owner.id, null);
  assert.equal(req.outcome, "requested");
  const [r] = await db.select().from(t.bookings).where(and(eq(t.bookings.id, b2.id)));
  assert.equal(r.status, "cancellation_requested");
  assert.equal(r.statusBeforeRequest, "pending_assignment");
  await assert.rejects(transition(db, b2.id, "confirmed", { actor: "admin", userId: admin.id }), BookingError, "decline must restore previous status");
  const back = await transition(db, b2.id, "pending_assignment", { actor: "admin", userId: admin.id });
  assert.equal(back.booking.status, "pending_assignment");
});
