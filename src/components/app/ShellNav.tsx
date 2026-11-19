"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean; badge?: number };
export type NavGroup = { label?: string; items: NavItem[] };

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href);
}

export function SideNavLinks({ groups, onNavigate, layoutId }: { groups: NavGroup[]; onNavigate?: () => void; layoutId: string }) {
  const pathname = usePathname();
  // Most specific match wins (e.g. /admin/employees/verification over /admin/employees).
  const all = groups.flatMap((g) => g.items).filter((i) => isActive(pathname, i));
  const activeHref = all.sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <nav aria-label="Account" className="space-y-6">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-navy-400">{g.label}</p>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                      active ? "text-white" : "text-navy-200 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {active && (
                      <m.span
                        layoutId={layoutId}
                        className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-white/10"
                        transition={{ type: "spring", stiffness: 420, damping: 36 }}
                      />
                    )}
                    {active && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-teal-400" />}
                    <span className={cn("relative [&>svg]:size-[18px]", active ? "text-teal-300" : "text-navy-300")}>{item.icon}</span>
                    <span className="relative truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="relative ml-auto rounded-full bg-teal-500 px-2 py-0.5 text-[11px] font-bold text-navy-950 tabular-nums">{item.badge > 99 ? "99+" : item.badge}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MobileNav({ groups, header, footer }: { groups: NavGroup[]; header: ReactNode; footer: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-10 place-items-center rounded-full border border-line bg-white text-navy-900 lg:hidden"
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-app-nav"
      >
        <Menu aria-hidden className="size-5" />
      </button>
      <div className={cn("fixed inset-0 z-50 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
        <div className={cn("absolute inset-0 bg-navy-950/50 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
        <div
          id="mobile-app-nav"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col overflow-y-auto bg-navy-950 p-4 shadow-lift transition-transform duration-300 ease-[var(--ease-out-expo)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
          inert={!open}
        >
          <div className="mb-6 flex items-center justify-between">
            {header}
            <button type="button" onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-full text-navy-200 hover:bg-white/10" aria-label="Close menu">
              <X aria-hidden className="size-5" />
            </button>
          </div>
          <SideNavLinks groups={groups} onNavigate={() => setOpen(false)} layoutId="nav-active-mobile" />
          <div className="mt-auto pt-6">{footer}</div>
        </div>
      </div>
    </>
  );
}
