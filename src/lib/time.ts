/**
 * Time-zone helpers built on Intl (no dependencies). All instants are stored
 * in UTC; business wall-clock times (e.g. 9:00 AM Pacific) are converted here,
 * DST-safe.
 */
const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    dtfCache.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function zonedParts(date: Date, tz: string) {
  const p: Record<string, string> = {};
  for (const part of dtf(tz).formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS.indexOf(p.weekday),
    date: `${p.year}-${p.month}-${p.day}`,
  };
}

function offsetMs(date: Date, tz: string) {
  const z = zonedParts(date, tz);
  return Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** Wall-clock date + minute-of-day in `tz` → UTC instant. */
export function zonedToUtc(isoDate: string, minuteOfDay: number, tz: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minuteOfDay);
  let ts = guess - offsetMs(new Date(guess), tz);
  ts = guess - offsetMs(new Date(ts), tz); // second pass handles DST boundaries
  return new Date(ts);
}

export const todayIn = (tz: string) => zonedParts(new Date(), tz).date;
export const minuteOfDayIn = (date: Date, tz: string) => {
  const z = zonedParts(date, tz);
  return z.hour * 60 + z.minute;
};

export function addDays(isoDate: string, n: number) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const weekdayOf = (isoDate: string) => new Date(`${isoDate}T12:00:00Z`).getUTCDay();
export const isIsoDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T12:00:00Z`));

export function minutesLabel(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
export const parseHHMM = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const v = Number(m[1]) * 60 + Number(m[2]);
  return v >= 0 && v <= 1440 ? v : null;
};
export const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/* ── Display formatting (always in the business time zone) ─────────────── */

export function fmtDate(d: Date | string | null | undefined, tz: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, ...opts }).format(typeof d === "string" ? new Date(d) : d);
}
export const fmtTime = (d: Date | null | undefined, tz: string) => (d ? new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit" }).format(d) : "—");
export const fmtDateTime = (d: Date | null | undefined, tz: string) => (d ? `${fmtDate(d, tz)} · ${fmtTime(d, tz)}` : "—");
export const fmtRange = (a: Date, b: Date, tz: string) => `${fmtDate(a, tz)} · ${fmtTime(a, tz)} – ${fmtTime(b, tz)}`;
export const tzAbbr = (tz: string, at = new Date()) =>
  new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(at).find((p) => p.type === "timeZoneName")?.value ?? tz;

export function timeAgo(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days} d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

export const money = (cents: number, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
