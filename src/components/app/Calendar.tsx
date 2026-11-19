import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Tone } from "@/lib/labels";
import { cn } from "@/lib/utils";

export type CalEvent = { id: string; date: string; time: string; label: string; href?: string; tone: Tone };

const toneCls: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-900 border-teal-200",
  amber: "bg-amber-50 text-amber-950 border-amber-200",
  navy: "bg-navy-50 text-navy-900 border-navy-200",
  red: "bg-red-50 text-red-900 border-red-200 line-through decoration-red-300",
  gray: "bg-stone-100 text-stone-700 border-stone-200",
};

export const monthOf = (s: string | undefined, today: string) => (s && /^\d{4}-\d{2}$/.test(s) ? s : today.slice(0, 7));
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const first = `${month}-01`;
  const last = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  return { first, last };
}
const shift = (month: string, n: number) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

/** Month grid on tablet/desktop, agenda list on phones. Navigation via ?month=YYYY-MM. */
export function MonthCalendar({ month, today, events, base, extraQuery = "" }: { month: string; today: string; events: CalEvent[]; base: string; extraQuery?: string }) {
  const [y, m] = month.split("-").map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const byDay = new Map<string, CalEvent[]>();
  for (const e of events) byDay.set(e.date, [...(byDay.get(e.date) ?? []), e]);
  const title = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
  const href = (mm: string) => `${base}?month=${mm}${extraQuery}`;
  return (
    <div className="rounded-3xl border border-line bg-white shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <h2 className="font-display text-xl font-semibold text-navy-950" aria-live="polite">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          <Link href={href(shift(month, -1))} className="grid size-9 place-items-center rounded-full border border-line hover:border-navy-300" aria-label="Previous month">
            <ChevronLeft aria-hidden className="size-4" />
          </Link>
          <Link href={href(today.slice(0, 7))} className="h-9 rounded-full border border-line px-3 text-sm font-semibold leading-9 text-navy-900 hover:border-navy-300">
            Today
          </Link>
          <Link href={href(shift(month, 1))} className="grid size-9 place-items-center rounded-full border border-line hover:border-navy-300" aria-label="Next month">
            <ChevronRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>

      <div className="hidden md:block">
        <div className="grid grid-cols-7 border-b border-line text-center text-xs font-bold uppercase tracking-wider text-muted">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2.5">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: lead }, (_, i) => (
            <div key={`l${i}`} className="min-h-28 border-b border-r border-line/60 bg-canvas/40" />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const list = byDay.get(date) ?? [];
            return (
              <div key={date} className={cn("min-h-28 border-b border-r border-line/60 p-1.5", date === today && "bg-teal-50/40")}>
                <p className={cn("mb-1 grid size-7 place-items-center rounded-full text-xs font-semibold tabular-nums", date === today ? "bg-teal-700 text-white" : "text-navy-800")}>{i + 1}</p>
                <ul className="space-y-1">
                  {list.slice(0, 3).map((e) => (
                    <li key={e.id}>
                      {e.href ? (
                        <Link href={e.href} className={cn("block truncate rounded-lg border px-1.5 py-0.5 text-[11px] font-medium transition-transform hover:-translate-y-px", toneCls[e.tone])}>
                          <span className="tabular-nums">{e.time}</span> {e.label}
                        </Link>
                      ) : (
                        <span className={cn("block truncate rounded-lg border px-1.5 py-0.5 text-[11px] font-medium", toneCls[e.tone])}>
                          {e.time} {e.label}
                        </span>
                      )}
                    </li>
                  ))}
                  {list.length > 3 && <li className="px-1.5 text-[11px] font-semibold text-muted">+{list.length - 3} more</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <ol className="divide-y divide-line md:hidden">
        {[...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).length === 0 ? (
          <li className="px-6 py-10 text-center text-sm text-muted">Nothing scheduled this month.</li>
        ) : (
          [...byDay.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, list]) => (
              <li key={date} className="px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wider text-muted">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</p>
                <ul className="mt-2 space-y-1.5">
                  {list.map((e) => (
                    <li key={e.id}>
                      <Link href={e.href ?? "#"} className={cn("block rounded-xl border px-3 py-2 text-sm", toneCls[e.tone])}>
                        <span className="font-semibold tabular-nums">{e.time}</span> · {e.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))
        )}
      </ol>
    </div>
  );
}
