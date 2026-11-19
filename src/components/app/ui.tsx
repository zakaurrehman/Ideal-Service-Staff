import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { statusLabel, statusTone, type Tone } from "@/lib/labels";

/* ── Layout primitives ─────────────────────────────────────────────────── */

export function PageHeader({ title, description, actions, crumbs }: { title: string; description?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <header className="enter mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {crumbs.map((c, i) => (
              <span key={c.label} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden>/</span>}
                {c.href ? (
                  <Link href={c.href} className="hover:text-navy-900 hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-navy-900">
                    {c.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="font-display text-3xl font-semibold tracking-tight text-navy-950 sm:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({ title, description, actions, children, className, padded = true, id }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; padded?: boolean; id?: string }) {
  return (
    <section id={id} className={cn("rounded-3xl border border-line bg-white shadow-soft", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-6 py-4">
          <div>
            {title && <h2 className="text-base font-bold text-navy-950">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className={padded ? "p-6" : ""}>{children}</div>
    </section>
  );
}

const toneCls: Record<Tone, string> = {
  teal: "bg-teal-50 text-teal-800 ring-teal-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  navy: "bg-navy-50 text-navy-800 ring-navy-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  gray: "bg-stone-100 text-stone-700 ring-stone-200",
};
const dotCls: Record<Tone, string> = { teal: "bg-teal-500", amber: "bg-amber-500", navy: "bg-navy-500", red: "bg-red-500", gray: "bg-stone-400" };

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", toneCls[tone], className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", dotCls[tone])} />
      {children}
    </span>
  );
}

export const StatusBadge = ({ status, className }: { status: string | null | undefined; className?: string }) => (
  <Badge tone={statusTone(status)} className={className}>
    {statusLabel(status)}
  </Badge>
);

export function StatCard({ label, value, hint, icon, href, tone = "navy" }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; href?: string; tone?: "navy" | "teal" | "amber" }) {
  const iconCls = { navy: "bg-navy-50 text-navy-700", teal: "bg-teal-50 text-teal-700", amber: "bg-amber-50 text-amber-800" }[tone];
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        {icon && <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", iconCls)}>{icon}</span>}
      </div>
      <p className="mt-3 font-display text-3xl font-semibold tabular-nums text-navy-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </>
  );
  const cls = "group block rounded-3xl border border-line bg-white p-5 shadow-soft transition-all duration-300";
  return href ? (
    <Link href={href} className={cn(cls, "hover:-translate-y-0.5 hover:border-navy-200 hover:shadow-lift")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function EmptyState({ icon, title, description, action, compact }: { icon?: ReactNode; title: string; description?: ReactNode; action?: ReactNode; compact?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "py-8" : "py-14")}>
      {icon && (
        <div className="relative mb-5">
          <div aria-hidden className="absolute inset-0 -m-3 rounded-full bg-teal-100/70 blur-xl" />
          <div className="relative grid size-14 place-items-center rounded-2xl border border-line bg-white text-teal-700 shadow-soft">{icon}</div>
        </div>
      )}
      <p className="font-semibold text-navy-950">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LinkButton({ href, children, variant = "primary", size = "md", className, external }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "ghost" | "teal"; size?: "sm" | "md"; className?: string; external?: boolean }) {
  const cls = cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
    size === "sm" ? "h-9 px-4 text-sm" : "h-11 px-5 text-sm",
    variant === "primary" && "bg-navy-900 text-white hover:bg-navy-800",
    variant === "teal" && "bg-teal-700 text-white hover:bg-teal-800",
    variant === "secondary" && "border border-line bg-white text-navy-900 hover:border-navy-300",
    variant === "ghost" && "text-teal-700 hover:bg-teal-50",
    className,
  );
  return external ? (
    <a href={href} className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export const MoreLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <Link href={href} className="group inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
    {children}
    <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-0.5" />
  </Link>
);

export function DL({ items, cols = 2 }: { items: { label: string; value: ReactNode }[]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-4", cols === 2 && "sm:grid-cols-2", cols === 3 && "sm:grid-cols-3")}>
      {items.map((i) => (
        <div key={i.label} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{i.label}</dt>
          <dd className="mt-1 break-words text-sm text-navy-950">{i.value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Alert({ tone = "navy", title, children, action }: { tone?: "navy" | "amber" | "teal" | "red"; title?: ReactNode; children?: ReactNode; action?: ReactNode }) {
  const cls = {
    navy: "border-navy-200 bg-navy-50 text-navy-900",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    teal: "border-teal-200 bg-teal-50 text-teal-950",
    red: "border-red-200 bg-red-50 text-red-900",
  }[tone];
  return (
    <div role="status" className={cn("enter flex flex-col gap-3 rounded-2xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between", cls)}>
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ── Tables (server-driven search, sort and pagination via the URL) ─────── */

export type Search = Record<string, string | string[] | undefined>;
export const sp = (s: Search, k: string) => (Array.isArray(s[k]) ? s[k]![0] : (s[k] ?? "")) as string;

export function withParams(base: string, current: Search, patch: Record<string, string | number | null>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(current)) if (typeof v === "string" && v) p.set(k, v);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") p.delete(k);
    else p.set(k, String(v));
  }
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}
export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th scope="col" className={cn("whitespace-nowrap border-b border-line bg-canvas/70 px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted first:pl-6 last:pr-6", className)}>
    {children}
  </th>
);
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn("border-b border-line/70 px-4 py-3.5 align-middle first:pl-6 last:pr-6", className)}>{children}</td>
);

export function SortTh({ label, field, base, search }: { label: string; field: string; base: string; search: Search }) {
  const active = sp(search, "sort") === field;
  const dir = active && sp(search, "dir") === "asc" ? "asc" : "desc";
  const next = active && dir === "desc" ? "asc" : "desc";
  const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <Th>
      <Link href={withParams(base, search, { sort: field, dir: next, page: null })} className="inline-flex items-center gap-1 hover:text-navy-900" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}>
        {label}
        <Icon aria-hidden className={cn("size-3.5", active ? "text-teal-700" : "opacity-50")} />
      </Link>
    </Th>
  );
}

export function Pagination({ base, search, page, pageSize, total }: { base: string; search: Search; page: number; pageSize: number; total: number }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn = "inline-flex h-9 items-center gap-1 rounded-full border border-line bg-white px-3 text-sm font-semibold text-navy-900";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm text-muted">
      <p>
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link className={cn(btn, "hover:border-navy-300")} href={withParams(base, search, { page: page - 1 })}>
            <ChevronLeft aria-hidden className="size-4" /> Previous
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")} aria-disabled>
            <ChevronLeft aria-hidden className="size-4" /> Previous
          </span>
        )}
        <span className="px-1 tabular-nums">
          {page} / {pages}
        </span>
        {page < pages ? (
          <Link className={cn(btn, "hover:border-navy-300")} href={withParams(base, search, { page: page + 1 })}>
            Next <ChevronRight aria-hidden className="size-4" />
          </Link>
        ) : (
          <span className={cn(btn, "opacity-40")} aria-disabled>
            Next <ChevronRight aria-hidden className="size-4" />
          </span>
        )}
      </div>
    </div>
  );
}

/** GET search/filter bar — works without JavaScript. */
export function FilterBar({ base, search, placeholder = "Search…", filters = [], children }: { base: string; search: Search; placeholder?: string; filters?: { name: string; label: string; options: { value: string; label: string }[] }[]; children?: ReactNode }) {
  const inputCls = "h-10 rounded-full border border-line bg-white px-4 text-sm text-navy-950 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20";
  return (
    <form action={base} method="get" className="flex flex-wrap items-center gap-2 border-b border-line px-6 py-4" role="search">
      <label className="sr-only" htmlFor="q">
        Search
      </label>
      <input id="q" name="q" defaultValue={sp(search, "q")} placeholder={placeholder} className={cn(inputCls, "min-w-0 flex-1 sm:max-w-xs")} />
      {filters.map((f) => (
        <label key={f.name} className="sr-only-focusable">
          <span className="sr-only">{f.label}</span>
          <select name={f.name} defaultValue={sp(search, f.name)} className={inputCls}>
            <option value="">{f.label}: all</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}
      {children}
      {sp(search, "sort") && <input type="hidden" name="sort" value={sp(search, "sort")} />}
      {sp(search, "dir") && <input type="hidden" name="dir" value={sp(search, "dir")} />}
      <button className="h-10 rounded-full bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800">Apply</button>
      {Object.keys(search).some((k) => ["q", ...filters.map((f) => f.name)].includes(k) && sp(search, k)) && (
        <Link href={base} className="text-sm font-semibold text-teal-700 hover:underline">
          Clear
        </Link>
      )}
    </form>
  );
}

export const pageOf = (s: Search) => Math.max(1, Math.min(10_000, Number.parseInt(sp(s, "page") || "1", 10) || 1));
