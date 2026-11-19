/**
 * Platform settings with code defaults; admins override them in Admin → Settings
 * (system_settings). Defaults are conservative starting points — the business
 * owner should confirm them (see docs/BOOKING-SYSTEM.md).
 */
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Queryable } from "./db/client";
import { auditLogs, systemSettings } from "./db/schema";

const bool = z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean());

export const settingsSchema = z.object({
  timezone: z.string().min(3).max(64),
  bookingLeadHours: z.coerce.number().int().min(0).max(24 * 14),
  bookingWindowDays: z.coerce.number().int().min(1).max(365),
  bookingDayStartMinute: z.coerce.number().int().min(0).max(1439),
  bookingDayEndMinute: z.coerce.number().int().min(1).max(1440),
  slotIntervalMinutes: z.coerce.number().int().refine((n) => [15, 30, 60].includes(n), "Use 15, 30 or 60."),
  cancellationNoticeHours: z.coerce.number().int().min(0).max(24 * 14),
  maxActiveBookingsPerCustomer: z.coerce.number().int().min(1).max(200),
  allowProfessionalSelection: bool,
  requireVerifiedEmailToBook: bool,
  employeeStartWindowMinutes: z.coerce.number().int().min(0).max(24 * 60),
});
export type Settings = z.infer<typeof settingsSchema>;

export const SETTING_DEFAULTS: Settings = {
  timezone: "America/Los_Angeles",
  bookingLeadHours: 24,
  bookingWindowDays: 60,
  bookingDayStartMinute: 7 * 60,
  bookingDayEndMinute: 21 * 60,
  slotIntervalMinutes: 30,
  cancellationNoticeHours: 24,
  maxActiveBookingsPerCustomer: 10,
  allowProfessionalSelection: true,
  requireVerifiedEmailToBook: true,
  employeeStartWindowMinutes: 60,
};

export async function getSettings(db: Queryable): Promise<Settings> {
  const rows = await db.select().from(systemSettings);
  const merged: Record<string, unknown> = { ...SETTING_DEFAULTS };
  for (const r of rows) if (r.key in SETTING_DEFAULTS) merged[r.key] = r.value;
  const parsed = settingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : SETTING_DEFAULTS;
}

export async function saveSettings(db: Queryable, values: Settings, actorId: string) {
  for (const [key, value] of Object.entries(values)) {
    await db
      .insert(systemSettings)
      .values({ key, value, updatedBy: actorId })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedBy: actorId, updatedAt: new Date() } });
  }
}

export async function audit(
  db: Queryable,
  e: { actorId?: string | null; action: string; entityType?: string; entityId?: string; summary: string; metadata?: Record<string, unknown>; ip?: string | null },
) {
  await db.insert(auditLogs).values({
    actorId: e.actorId ?? null,
    action: e.action,
    entityType: e.entityType ?? null,
    entityId: e.entityId ?? null,
    summary: e.summary.slice(0, 500),
    metadata: e.metadata ?? null,
    ip: e.ip ?? null,
  });
}

export async function getSetting(db: Queryable, key: string) {
  const [r] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
  return r?.value;
}
