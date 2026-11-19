"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, m as motion, useMotionValueEvent, useScroll } from "framer-motion";
import { ChevronDown, LogIn, Menu, Phone, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { mainNav, site, type NavItem } from "@/content/site";
import { Logo } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

export function Header() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 24);
    setHidden(y > 480 && y > prev + 4 && !open);
    if (y < prev - 4) setHidden(false);
  });

  // Close the drawer on navigation
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <a
        href="#main"
        className="sr-only z-[90] rounded-full bg-navy-900 px-5 py-3 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        animate={{ y: hidden ? "-110%" : "0%" }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        {/* Wider than page content on very large screens so the phone number fits beside the menu. */}
        <div className="container-x pt-3 sm:pt-4 2xl:max-w-[92rem]">
          <div
            className={cn(
              "flex h-[4.25rem] items-center justify-between gap-4 rounded-full pl-4 pr-2.5 transition-all duration-500 ease-[var(--ease-out-expo)] sm:pl-5",
              scrolled || open ? "glass border-white/60" : "border border-transparent",
            )}
          >
            <Logo />

            <nav aria-label="Main" className="hidden xl:block" onMouseLeave={() => setHovered(null)}>
              <ul className="flex items-center">
                {mainNav.map((item) => (
                  <DesktopItem
                    key={item.label}
                    item={item}
                    active={isActive(pathname, item.href)}
                    hovered={hovered === item.label}
                    onHover={() => setHovered(item.label)}
                  />
                ))}
              </ul>
            </nav>

            <div className="flex items-center gap-2">
              <a
                href={site.phoneHref}
                className="hidden items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-navy-900 transition-colors hover:text-teal-700 2xl:flex"
              >
                <Phone aria-hidden className="size-4" />
                {site.phone}
              </a>
              <Link
                href="/sign-in/"
                className="hidden items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-navy-900 transition-colors hover:text-teal-700 lg:flex"
              >
                <LogIn aria-hidden className="size-4" />
                My Account
              </Link>
              <span className="hidden sm:block">
                <ButtonLink href="/get-care/" variant="accent" size="sm" className="h-11 px-5" arrow>
                  Request Care
                </ButtonLink>
              </span>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="mobile-nav"
                aria-label={open ? "Close menu" : "Open menu"}
                className="grid size-12 place-items-center rounded-full bg-navy-900 text-white transition-colors hover:bg-navy-800 xl:hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={open ? "x" : "m"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <MobileNav open={open} onClose={() => setOpen(false)} pathname={pathname} />
    </>
  );
}

function DesktopItem({ item, active, hovered, onHover }: { item: NavItem; active: boolean; hovered: boolean; onHover: () => void }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = () => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const hide = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const linkCls = cn(
    "relative z-10 flex items-center gap-1 whitespace-nowrap rounded-full px-[0.7rem] py-2 text-[0.9rem] font-semibold transition-colors duration-300 2xl:px-3",
    active ? "text-navy-950" : "text-navy-800/75 hover:text-navy-950",
  );

  const indicator = (
    <>
      {hovered && (
        <motion.span
          layoutId="nav-hover"
          className="absolute inset-0 -z-0 rounded-full bg-navy-900/[0.06]"
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        />
      )}
      {active && <span aria-hidden className="absolute -bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-teal-500" />}
    </>
  );

  if (!item.children) {
    return (
      <li className="relative" onMouseEnter={onHover}>
        <Link href={item.href} className={linkCls} aria-current={active ? "page" : undefined}>
          {item.label}
        </Link>
        {indicator}
      </li>
    );
  }

  return (
    <li
      className="relative"
      onMouseEnter={() => {
        onHover();
        show();
      }}
      onMouseLeave={hide}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
    >
      <div className="flex items-center">
        <Link href={item.href} className={cn(linkCls, "pr-1.5")} aria-current={active ? "page" : undefined}>
          {item.label}
        </Link>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={`${item.label} menu`}
          onClick={() => setOpen((o) => !o)}
          className="relative z-10 -ml-1 grid size-7 place-items-center rounded-full text-navy-800/70 hover:text-navy-950"
        >
          <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-300", open && "rotate-180")} />
        </button>
      </div>
      {indicator}
      <AnimatePresence>
        {open && (
          <motion.div
            id={menuId}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute left-1/2 top-full w-[22rem] -translate-x-1/2 pt-4"
            onFocus={show}
            onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(false)}
          >
            <ul className="glass rounded-3xl p-2.5">
              {item.children.map((c) => (
                <li key={c.href + c.label}>
                  <Link
                    href={c.href}
                    className="group/item flex flex-col rounded-2xl px-4 py-3 transition-colors hover:bg-teal-50"
                    onClick={() => setOpen(false)}
                  >
                    <span className="flex items-center justify-between text-sm font-semibold text-navy-900">
                      {c.label}
                      <span aria-hidden className="text-teal-600 opacity-0 transition-all duration-300 group-hover/item:translate-x-0.5 group-hover/item:opacity-100">
                        →
                      </span>
                    </span>
                    {c.description && <span className="mt-0.5 text-[0.8rem] text-muted">{c.description}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function MobileNav({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // Simple focus trap
      if (e.key === "Tab" && panelRef.current) {
        const f = panelRef.current.querySelectorAll<HTMLElement>("a, button");
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.documentElement.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panelRef.current?.querySelector<HTMLElement>("a")?.focus();
    return () => {
      document.documentElement.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onKey]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-nav"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className="fixed inset-0 z-40 overflow-y-auto bg-canvas xl:hidden"
          initial={{ clipPath: "circle(0% at calc(100% - 3.25rem) 2.6rem)" }}
          animate={{ clipPath: "circle(150% at calc(100% - 3.25rem) 2.6rem)" }}
          exit={{ clipPath: "circle(0% at calc(100% - 3.25rem) 2.6rem)" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
          data-lenis-prevent
        >
          <div aria-hidden className="pointer-events-none absolute -right-32 top-24 size-96 rounded-full bg-teal-200/50 blur-3xl" />
          <div className="container-x relative flex min-h-full flex-col pb-10 pt-28">
            <motion.ul
              className="flex flex-col"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.25 } } }}
            >
              {mainNav.map((item) => (
                <motion.li
                  key={item.label}
                  className="border-b border-line"
                  variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
                >
                  <div className="flex items-center justify-between">
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "block py-4 font-display text-[2rem] leading-tight tracking-[-0.02em]",
                        isActive(pathname, item.href) ? "text-teal-700" : "text-navy-900",
                      )}
                    >
                      {item.label}
                    </Link>
                    {item.children && (
                      <button
                        type="button"
                        aria-expanded={expanded === item.label}
                        aria-label={`Show ${item.label} links`}
                        onClick={() => setExpanded((e) => (e === item.label ? null : item.label))}
                        className="grid size-12 place-items-center rounded-full border border-line"
                      >
                        <ChevronDown aria-hidden className={cn("size-5 transition-transform", expanded === item.label && "rotate-180")} />
                      </button>
                    )}
                  </div>
                  <AnimatePresence initial={false}>
                    {item.children && expanded === item.label && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        {item.children.map((c) => (
                          <li key={c.href + c.label}>
                            <Link href={c.href} onClick={onClose} className="block py-2.5 pl-1 text-base font-medium text-body">
                              {c.label}
                            </Link>
                          </li>
                        ))}
                        <li className="h-3" />
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div
              className="mt-10 grid gap-3 sm:grid-cols-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.6, duration: 0.6 } }}
            >
              <ButtonLink href="/get-care/" variant="accent" size="lg" arrow onClick={onClose}>
                Request Care
              </ButtonLink>
              <ButtonLink href="/sign-in/" variant="outline" size="lg" onClick={onClose}>
                Login / My Account
              </ButtonLink>
            </motion.div>
            <motion.div
              className="mt-auto pt-10 text-sm text-muted"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.75 } }}
            >
              <a href={site.phoneHref} className="block font-display text-2xl text-navy-900">
                {site.phone}
              </a>
              <a href={site.emailHref} className="mt-1 block">
                {site.email}
              </a>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
