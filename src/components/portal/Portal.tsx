import Link from "next/link";
import { ArrowUpRight, Clock, Mail, Phone, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { site } from "@/content/site";
import { stateLabel, type PortalStatus, type ServiceState } from "@/lib/portal";
import { cn } from "@/lib/utils";

const pillStyles: Record<ServiceState, { wrap: string; dot: string }> = {
  online: { wrap: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-500" },
  unavailable: { wrap: "bg-amber-50 text-amber-900 ring-amber-200", dot: "bg-amber-500" },
  unreachable: { wrap: "bg-navy-50 text-navy-700 ring-navy-200", dot: "bg-navy-400" },
};

/** Live status indicator (text + colour, never colour alone). */
export function StatusPill({ state, className }: { state: ServiceState; className?: string }) {
  const s = pillStyles[state];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ring-1 ring-inset", s.wrap, className)}>
      <span className="relative flex size-1.5">
        {state === "online" && <span className={cn("absolute inset-0 rounded-full animate-pulse-ring", s.dot)} />}
        <span className={cn("relative size-1.5 rounded-full", s.dot)} />
      </span>
      {stateLabel[state]}
    </span>
  );
}

export const formatChecked = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit", month: "short", day: "numeric" }) + " PT";

/** A single portal action: icon, title, description, optional live status. */
export function ActionRow({
  href,
  icon,
  title,
  description,
  status,
  primary = false,
  external = false,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  status?: ServiceState;
  primary?: boolean;
  external?: boolean;
}) {
  const content = (
    <>
      <span
        className={cn(
          "grid size-12 shrink-0 place-items-center rounded-2xl transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-105 group-hover:-rotate-3",
          primary ? "bg-teal-500 text-white" : "bg-teal-50 text-teal-700",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className={cn("font-bold", primary ? "text-white" : "text-navy-900")}>{title}</span>
          {status && <StatusPill state={status} />}
        </span>
        <span className={cn("mt-0.5 block text-sm leading-relaxed", primary ? "text-navy-200" : "text-muted")}>{description}</span>
        {external && (
          <span className={cn("mt-1.5 inline-flex items-center gap-1 text-[0.72rem] font-semibold", primary ? "text-teal-300" : "text-teal-700")}>
            <ShieldCheck aria-hidden className="size-3.5" /> Secure account portal
          </span>
        )}
      </span>
      <ArrowUpRight
        aria-hidden
        className={cn(
          "size-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5",
          primary ? "text-teal-300" : "text-navy-400",
        )}
      />
    </>
  );
  const cls = cn(
    "group flex items-center gap-4 rounded-2xl p-4 transition-all duration-300 sm:p-5",
    primary
      ? "bg-navy-900 shadow-[0_18px_40px_-20px_rgb(11_27_56/0.7)] hover:bg-navy-800"
      : "border border-line bg-white hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-soft",
  );
  return external ? (
    <a href={href} className={cls}>
      {content}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

/** Live status of each portal service, as checked on the server. */
export function PortalStatusCard({ status, light = false }: { status: PortalStatus; light?: boolean }) {
  const rows: { label: string; state: ServiceState }[] = [
    { label: "Account sign-in & registration", state: status.accounts },
    { label: "Customer dashboard", state: status.customerPanel },
    { label: "Employee dashboard", state: status.employeePanel },
    { label: "Online booking calendar", state: status.booking },
  ];
  return (
    <div className={cn("rounded-[1.75rem] p-6", light ? "glass-dark text-navy-200" : "border border-line bg-white")}>
      <p className={cn("text-xs font-bold uppercase tracking-[0.18em]", light ? "text-teal-300" : "text-teal-700")}>Portal status</p>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4 text-sm">
            <span className={light ? "text-white" : "text-navy-900"}>{r.label}</span>
            <StatusPill state={r.state} />
          </li>
        ))}
      </ul>
      <p className={cn("mt-4 flex items-center gap-1.5 text-xs", light ? "text-navy-300" : "text-muted")}>
        <Clock aria-hidden className="size-3.5" /> Checked automatically · {formatChecked(status.checkedAt)}
      </p>
    </div>
  );
}

export function SupportStrip() {
  return (
    <div className="flex flex-col gap-4 rounded-[1.75rem] border border-line bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-bold text-navy-900">Need help with your account?</p>
        <p className="text-sm text-muted">Our team is available 7 days a week.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={site.phoneHref} className="inline-flex h-11 items-center gap-2 rounded-full bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800">
          <Phone aria-hidden className="size-4" /> {site.phone}
        </a>
        <a href={site.emailHref} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-navy-900 hover:border-navy-300">
          <Mail aria-hidden className="size-4" /> Email us
        </a>
      </div>
    </div>
  );
}
