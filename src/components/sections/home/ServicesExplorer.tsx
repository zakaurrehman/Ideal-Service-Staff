"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, m as motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { serviceCategories, services as staticServices, type Service, type ServiceCategory } from "@/content/services";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

/** Section D — interactive, filterable service cards. */
export function ServicesExplorer({ limit, items }: { limit?: number; items?: Service[] }) {
  const services = items ?? staticServices;
  const [active, setActive] = useState<ServiceCategory | "all">("all");
  const list = services.filter((s) => active === "all" || s.category === active).slice(0, limit);

  return (
    <div>
      <LayoutGroup id="service-tabs">
        <div role="group" aria-label="Filter services by category" className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {serviceCategories.map((c) => {
            const selected = active === c.id;
            const count = c.id === "all" ? services.length : services.filter((s) => s.category === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={selected}
                aria-controls="service-grid"
                onClick={() => setActive(c.id)}
                className={cn(
                  "relative flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-colors",
                  selected ? "text-white" : "text-navy-800 hover:text-navy-950",
                )}
              >
                {selected && (
                  <motion.span layoutId="svc-pill" className="absolute inset-0 rounded-full bg-navy-900" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                )}
                {!selected && <span className="absolute inset-0 rounded-full border border-navy-900/12 bg-white/70" />}
                <span className="relative">{c.label}</span>
                <span className={cn("relative text-xs tabular-nums", selected ? "text-teal-200" : "text-muted")}>{count}</span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <motion.ul id="service-grid" layout className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((s, i) => (
            <motion.li
              key={s.slug}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.04, 0.3) }}
            >
              <ServiceCard service={s} />
            </motion.li>
          ))}
          {!limit && <AdviceTile key={`cta-${active}`} count={list.length} />}
        </AnimatePresence>
      </motion.ul>
    </div>
  );
}

/* Fills the remainder of the last grid row, so no card is ever left orphaned. */
const LG_SPAN = { 1: "lg:col-span-1", 2: "lg:col-span-2" } as const;

function AdviceTile({ count }: { count: number }) {
  const lgSpan = ((3 - (count % 3)) % 3) as 0 | 1 | 2;
  const smNeeds = count % 2 === 1;
  if (!lgSpan && !smNeeds) return null;
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      className={cn(!smNeeds && "sm:hidden", lgSpan ? `lg:block ${LG_SPAN[lgSpan]}` : "lg:hidden")}
    >
      <Link
        href="/get-care/"
        className="group relative flex h-full min-h-72 flex-col justify-between overflow-hidden rounded-[1.75rem] bg-navy-900 p-8 text-white transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift"
      >
        <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-teal-500/25 blur-3xl transition-transform duration-700 group-hover:scale-125" />
        <p className="relative text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Not sure what you need?</p>
        <div className="relative">
          <p className="font-display text-3xl leading-tight">We’ll help you find the right care — at no cost to ask.</p>
          <span className="mt-6 inline-flex items-center gap-2 font-semibold text-teal-300">
            Talk to a care coordinator
            <ArrowUpRight aria-hidden className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </motion.li>
  );
}

export function ServiceCard({ service: s }: { service: Service }) {
  return (
    <Link
      href={`/services/${s.slug}/`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-line bg-white shadow-soft transition-all duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-lift"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={s.image}
          alt=""
          fill
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
          className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06]"
          style={s.imagePosition ? { objectPosition: s.imagePosition } : undefined}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/55 via-navy-950/0 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-90" />
        <span className="absolute left-4 top-4 grid size-11 place-items-center rounded-2xl bg-white/90 text-teal-700 shadow-soft backdrop-blur transition-transform duration-500 group-hover:rotate-[-6deg] group-hover:scale-105">
          <Icon name={s.icon} className="size-5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-lg font-bold leading-snug text-navy-900">{s.title}</h3>
        <p className="mt-2 flex-1 text-[0.93rem] leading-relaxed text-muted">{s.summary}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700">
          Learn more
          <span className="sr-only"> about {s.title}</span>
          <ArrowUpRight aria-hidden className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
