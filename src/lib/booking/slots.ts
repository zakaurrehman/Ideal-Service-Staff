/**
 * Pure scheduling maths (unit-tested): bookable time slots and whether an
 * interval sits inside an employee's weekly working hours.
 */
import type { Settings } from "../settings";
import { addDays, minuteOfDayIn, todayIn, weekdayOf, zonedParts, zonedToUtc } from "../time";

export type Interval = { start: Date; end: Date };
export type WeeklyHours = { weekday: number; startMinute: number; endMinute: number }[];

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end;

/** First and last bookable calendar days (business time zone). */
export function bookingWindow(s: Settings, now = new Date()) {
  const earliest = new Date(now.getTime() + s.bookingLeadHours * 3600_000);
  const first = zonedParts(earliest, s.timezone).date;
  const last = addDays(todayIn(s.timezone), s.bookingWindowDays);
  return { first, last, earliest };
}

/** Candidate start times on a day: business booking hours, interval grid, lead time respected, visit must finish by closing. */
export function daySlots(date: string, durationMinutes: number, s: Settings, now = new Date()): Interval[] {
  const { first, last, earliest } = bookingWindow(s, now);
  if (date < first || date > last) return [];
  const out: Interval[] = [];
  for (let m = s.bookingDayStartMinute; m + durationMinutes <= s.bookingDayEndMinute; m += s.slotIntervalMinutes) {
    const start = zonedToUtc(date, m, s.timezone);
    if (start < earliest) continue;
    out.push({ start, end: new Date(start.getTime() + durationMinutes * 60_000) });
  }
  return out;
}

/** True when [start, end) lies within the employee's working hours for that weekday (single-day visits). */
export function withinWeeklyHours(iv: Interval, hours: WeeklyHours, tz: string) {
  const startDay = zonedParts(iv.start, tz).date;
  const endDay = zonedParts(new Date(iv.end.getTime() - 1), tz).date;
  if (startDay !== endDay) return false;
  const wd = weekdayOf(startDay);
  const s = minuteOfDayIn(iv.start, tz);
  const e = s + Math.round((iv.end.getTime() - iv.start.getTime()) / 60_000);
  return hours.some((h) => h.weekday === wd && h.startMinute <= s && e <= h.endMinute);
}

export const DURATION_OPTIONS = [60, 90, 120, 180, 240, 300, 360, 480, 600, 720];
export const durationLabel = (min: number) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return [h ? `${h} hour${h > 1 ? "s" : ""}` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
};
