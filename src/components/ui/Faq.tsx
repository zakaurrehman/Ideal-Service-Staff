"use client";

import { AnimatePresence, m as motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((it, i) => {
        const expanded = open === i;
        return (
          <li key={it.q}>
            <h3>
              <button
                type="button"
                id={`${base}-q${i}`}
                aria-expanded={expanded}
                aria-controls={`${base}-a${i}`}
                onClick={() => setOpen(expanded ? null : i)}
                className="group flex w-full items-center justify-between gap-6 py-6 text-left"
              >
                <span className="text-lg font-semibold text-navy-900 transition-colors group-hover:text-teal-700">{it.q}</span>
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full border transition-all duration-500",
                    expanded ? "rotate-45 border-teal-500 bg-teal-500 text-white" : "border-line text-navy-900",
                  )}
                >
                  <Plus aria-hidden className="size-4" />
                </span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {expanded && (
                <motion.div
                  id={`${base}-a${i}`}
                  role="region"
                  aria-labelledby={`${base}-q${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-3xl pb-7 pr-14 leading-relaxed text-body">{it.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}
