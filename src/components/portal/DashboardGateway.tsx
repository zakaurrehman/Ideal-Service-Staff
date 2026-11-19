import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Briefcase,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Check,
  ClipboardList,
  HeartHandshake,
  Home,
  LayoutDashboard,
  LifeBuoy,
  LogIn,
  Mail,
  Phone,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { portal, portalIsSeparate, site } from "@/content/site";
import { getPortalStatus, type ServiceState } from "@/lib/portal";
import { ActionRow, StatusPill, SupportStrip, formatChecked } from "@/components/portal/Portal";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/utils";

type Kind = "customer" | "employee";

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

const copy: Record<
  Kind,
  { title: string; portalUrl: string; unavailableTitle: string; unavailableBody: string; capabilities: string[]; audience: string }
> = {
  customer: {
    title: "Customer Dashboard",
    portalUrl: portal.customerPanel,
    audience: "Clients & families",
    unavailableTitle: "Appointment management is temporarily unavailable",
    unavailableBody:
      "The online booking system that powers this dashboard is currently offline. Your account and sign-in are not affected, and our team can help with any booking by phone, WhatsApp or email.",
    capabilities: [
      "See your upcoming and past appointments",
      "Check the status of each booking",
      "Cancel or reschedule, where our policies allow",
      "Keep your contact details up to date",
    ],
  },
  employee: {
    title: "Employee Dashboard",
    portalUrl: portal.employeePanel,
    audience: "Care professionals",
    unavailableTitle: "The employee schedule portal is temporarily unavailable",
    unavailableBody:
      "The scheduling system that powers this dashboard is currently offline. Your account and sign-in are not affected — please contact the office for your current assignments and schedule.",
    capabilities: [
      "View your upcoming assigned appointments",
      "Review your appointment history",
      "Manage availability and days off, where enabled by our team",
      "Update your profile details",
    ],
  },
};

function SideNav({ active }: { active: Kind }) {
  const items: { href: string; label: string; icon: ReactNode; key?: Kind; external?: boolean }[] = [
    { href: "/sign-in/", label: "Portal home", icon: <Home aria-hidden className="size-4" /> },
    { href: "/customer-panel/", label: "Customer Dashboard", icon: <LayoutDashboard aria-hidden className="size-4" />, key: "customer" },
    { href: "/employee-panel/", label: "Employee Dashboard", icon: <ClipboardList aria-hidden className="size-4" />, key: "employee" },
    { href: portal.myAccount, label: "My Account", icon: <UserRound aria-hidden className="size-4" />, external: true },
    { href: "/get-care/", label: "Request Care", icon: <HeartHandshake aria-hidden className="size-4" /> },
    { href: "/contact/", label: "Help & Support", icon: <LifeBuoy aria-hidden className="size-4" /> },
  ];
  return (
    <nav aria-label="Portal" className="lg:sticky lg:top-28">
      <ul className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0">
        {items.map((it) => {
          const isActive = it.key === active;
          const cls = cn(
            "flex h-11 shrink-0 items-center gap-3 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors lg:rounded-2xl",
            isActive ? "bg-navy-900 text-white" : "border border-line bg-white text-navy-800 hover:border-navy-300 lg:border-transparent lg:bg-transparent lg:hover:bg-white",
          );
          return (
            <li key={it.label}>
              {it.external ? (
                <a href={it.href} className={cls}>
                  {it.icon}
                  {it.label}
                </a>
              ) : (
                <Link href={it.href} className={cls} aria-current={isActive ? "page" : undefined}>
                  {it.icon}
                  {it.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Professional empty-state illustration built from brand shapes (no fake data). */
function EmptyIllustration({ state }: { state: ServiceState }) {
  const Icon = state === "unreachable" ? RefreshCw : CalendarX;
  return (
    <div aria-hidden className="relative mx-auto size-40 shrink-0 sm:mx-0">
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-teal-100 to-navy-100 animate-float-slow" />
      <div className="absolute inset-4 rounded-[2rem] border border-white/80 bg-white/70 backdrop-blur" />
      <div className="absolute inset-0 grid place-items-center">
        <Icon className="size-14 text-navy-700" strokeWidth={1.3} />
      </div>
      <span className="absolute -right-2 top-6 grid size-10 place-items-center rounded-2xl bg-white shadow-soft animate-float">
        <CalendarClock className="size-5 text-teal-600" strokeWidth={1.6} />
      </span>
    </div>
  );
}

export async function DashboardGateway({ kind }: { kind: Kind }) {
  const status = await getPortalStatus();
  const state = kind === "customer" ? status.customerPanel : status.employeePanel;
  const c = copy[kind];

  // Working dashboard on a separate portal origin → go straight there (bookmarks keep working).
  if (state === "online" && portalIsSeparate) redirect(c.portalUrl);

  const nowActions =
    kind === "customer"
      ? [
          { href: "/get-care/", icon: <HeartHandshake aria-hidden className="size-5" />, title: "Request care", description: "Tell us what you need — most inquiries answered within 90 minutes." },
          { href: "/services-booking/", icon: <CalendarCheck aria-hidden className="size-5" />, title: "Book a consultation", description: "Request a phone, video or in-home consultation time." },
        ]
      : [
          { href: "/get-job/", icon: <Briefcase aria-hidden className="size-5" />, title: "Careers", description: "Open roles and the employment application." },
          { href: "/contact/", icon: <LifeBuoy aria-hidden className="size-5" />, title: "Contact the office", description: "Questions about assignments, hours or your account." },
        ];

  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-40 top-0 size-[34rem] rounded-full bg-teal-100/60 blur-3xl animate-blob" />
        <div className="absolute inset-0 bg-dots [mask-image:linear-gradient(to_bottom,#000,transparent_45%)]" />
      </div>

      <div className="container-x grid grid-cols-1 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <div className="enter min-w-0" style={d(0)}>
          <SideNav active={kind} />
        </div>

        <div className="min-w-0 space-y-6">
          {/* Header */}
          <header className="enter flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between" style={d(0.05)}>
            <div>
              <nav aria-label="Breadcrumb" className="text-sm text-muted">
                <Link href="/sign-in/" className="link-underline hover:text-navy-900">
                  Portal
                </Link>
                <span aria-hidden className="mx-2">
                  /
                </span>
                <span aria-current="page" className="text-navy-900">
                  {c.title}
                </span>
              </nav>
              <h1 className="display-lg mt-3">{c.title}</h1>
              <p className="mt-2 text-muted">{c.audience} · Checked {formatChecked(status.checkedAt)}</p>
            </div>
            <StatusPill state={state} className="self-start px-3.5 py-1.5 text-sm sm:self-auto" />
          </header>

          {/* State panel */}
          {state === "online" ? (
            <div className="enter rounded-[2rem] border border-teal-200 bg-white p-7 shadow-soft sm:p-10" style={d(0.12)}>
              <h2 className="display-md">Your dashboard is online</h2>
              <p className="mt-3 max-w-xl text-body">Sign in on our secure account portal to view your dashboard.</p>
              <a
                href={c.portalUrl}
                className="mt-7 inline-flex h-14 items-center gap-2.5 rounded-full bg-teal-700 px-7 font-semibold text-white shadow-glow transition-colors hover:bg-teal-800"
              >
                Open {c.title} <ArrowUpRight aria-hidden className="size-5" />
              </a>
            </div>
          ) : (
            <div className="enter overflow-hidden rounded-[2rem] border border-line bg-white shadow-soft" style={d(0.12)}>
              <div className="flex flex-col gap-8 p-7 sm:flex-row sm:items-center sm:p-10">
                <EmptyIllustration state={state} />
                <div>
                  <h2 className="display-md">{state === "unreachable" ? "We couldn’t check the dashboard just now" : c.unavailableTitle}</h2>
                  <p className="mt-3 max-w-2xl leading-relaxed text-body">
                    {state === "unreachable"
                      ? "Our account portal didn’t respond to an automatic status check. You can still try opening it directly, or contact our team."
                      : c.unavailableBody}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <a href={site.phoneHref} className="inline-flex h-11 items-center gap-2 rounded-full bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800">
                      <Phone aria-hidden className="size-4" /> {site.phone}
                    </a>
                    <a
                      href={site.whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-navy-900 hover:border-navy-300"
                    >
                      <WhatsappIcon className="size-4" /> WhatsApp
                    </a>
                    <a href={site.emailHref} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-navy-900 hover:border-navy-300">
                      <Mail aria-hidden className="size-4" /> Email
                    </a>
                    {state === "unreachable" && (
                      <a href={c.portalUrl} className="inline-flex h-11 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-teal-700 hover:border-teal-300">
                        Try opening the dashboard <ArrowUpRight aria-hidden className="size-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-line bg-canvas/60 px-7 py-6 sm:px-10">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">When the dashboard is online, you can</p>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {c.capabilities.map((cap) => (
                    <li key={cap} className="flex items-start gap-3 text-sm text-navy-900">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-teal-200">
                        <Check aria-hidden className="size-3" strokeWidth={3} />
                      </span>
                      {cap}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* What works right now */}
          <div className="enter" style={d(0.2)}>
            <h2 className="text-lg font-bold text-navy-900">Available right now</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <ActionRow
                external
                href={portal.myAccount}
                icon={<LogIn aria-hidden className="size-5" />}
                title="My Account"
                description="Sign in and manage your account details."
                status={status.accounts}
              />
              {nowActions.map((a) => (
                <ActionRow key={a.title} href={a.href} icon={a.icon} title={a.title} description={a.description} />
              ))}
            </div>
          </div>

          <div className="enter" style={d(0.28)}>
            <SupportStrip />
          </div>
        </div>
      </div>
    </section>
  );
}
