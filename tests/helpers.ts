import { eq } from "drizzle-orm";
import { createPglite, migrateDb, type DB } from "../src/lib/db/client";
import { seedReferenceData } from "../src/lib/db/seed";
import { assignRole } from "../src/lib/auth/core";
import * as t from "../src/lib/db/schema";
import { SETTING_DEFAULTS, type Settings } from "../src/lib/settings";
import { addDays, todayIn, zonedToUtc } from "../src/lib/time";

/** Fresh in-memory PostgreSQL (PGlite) with all migrations + reference data. */
export async function testDb(): Promise<DB> {
  const db = await createPglite();
  await migrateDb(db, "pglite");
  await seedReferenceData(db);
  return db;
}

export const settings: Settings = { ...SETTING_DEFAULTS };
const tz = settings.timezone;
/** A business-time instant `days` from today at `hh:mm`. */
export const at = (days: number, hh: number, mm = 0) => zonedToUtc(addDays(todayIn(tz), days), hh * 60 + mm, tz);

let n = 0;
export async function makeUser(db: DB, role: "customer" | "employee" | "admin" | "super_admin", opts: { approved?: boolean; serviceId?: string } = {}) {
  n++;
  const [u] = await db.insert(t.users).values({ email: `${role}${n}-${Date.now()}@example.test`, emailVerifiedAt: new Date() }).returning();
  await db.insert(t.userProfiles).values({ userId: u.id, firstName: `${role}${n}`, lastName: "Test" });
  if (role === "customer") await db.insert(t.customerProfiles).values({ userId: u.id });
  if (role === "employee") {
    await db.insert(t.employeeProfiles).values({ userId: u.id, verificationStatus: opts.approved ? "approved" : "application_received" });
    for (let d = 0; d < 7; d++) await db.insert(t.employeeAvailability).values({ employeeId: u.id, weekday: d, startMinute: 6 * 60, endMinute: 22 * 60 });
    if (opts.serviceId) await db.insert(t.employeeServices).values({ employeeId: u.id, serviceId: opts.serviceId, status: "approved" });
  }
  await assignRole(db, u.id, role);
  return u;
}

export async function firstService(db: DB) {
  const [s] = await db.select().from(t.services).where(eq(t.services.isActive, true)).limit(1);
  return s;
}

export const address = { line1: "1 Test St", city: "Inglewood", region: "CA", postalCode: "90301" };
