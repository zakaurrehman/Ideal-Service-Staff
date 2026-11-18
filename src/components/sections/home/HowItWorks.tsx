"use client";

import Image from "next/image";
import { AnimatePresence, m as motion, useInView, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { processSteps } from "@/content/company";
import { cn } from "@/lib/utils";

const images = [
  { src: "/images/caregiver-greeting.webp", alt: "A caregiver greeting an older man during a first visit", pos: "50% 40%" },
  { src: "/images/home-visit-tablet.webp", alt: "A caregiver reviewing needs on a tablet with an older couple at home", pos: "22% 40%" },
  { src: "/images/clinician-tablet.webp", alt: "A care professional reviewing a care plan on a tablet", pos: "50% 22%" },
  { src: "/images/senior-companion.webp", alt: "A caregiver getting to know an older woman", pos: "60% 40%" },
  { src: "/images/home-health-walker.webp", alt: "A caregiver supporting an older man walking outdoors", pos: "50% 40%" },
];

const DURATION = 7000;

/** Section F — interactive, auto-advancing step explorer. */
export function HowItWorks() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const autoplay = inView && !paused && !reduce;

  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => setActive((a) => (a + 1) % processSteps.length), DURATION);
    return () => clearTimeout(t);
  }, [active, autoplay]);

  const step = processSteps[active];

  return (
    <div
      ref={ref}
      className="grid gap-10 lg:grid-cols-12 lg:gap-14"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Step list */}
      <ol className="flex flex-col gap-2 lg:col-span-5" aria-label="How care begins">
        {processSteps.map((s, i) => {
          const selected = i === active;
          return (
            <li key={s.title}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-current={selected ? "step" : undefined}
                aria-controls="process-panel"
                className={cn(
                  "group relative w-full overflow-hidden rounded-3xl border px-6 py-5 text-left transition-all duration-500",
                  selected ? "border-teal-200 bg-white shadow-lift" : "border-transparent hover:bg-white/60",
                )}
              >
                <span className="flex items-center gap-5">
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-2xl font-display text-lg transition-colors duration-500",
                      selected ? "bg-navy-900 text-white" : "bg-navy-50 text-navy-700 group-hover:bg-navy-100",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <span className={cn("block text-lg font-bold transition-colors", selected ? "text-navy-950" : "text-navy-800")}>{s.title}</span>
                    <span className="block text-sm text-muted">{s.lead}</span>
                  </span>
                </span>
                {selected && (
                  <span className="absolute inset-x-6 bottom-0 h-0.5 overflow-hidden rounded-full bg-navy-100">
                    <motion.span
                      key={`${active}-${autoplay}`}
                      className="block h-full origin-left bg-gradient-to-r from-teal-500 to-teal-300"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: autoplay ? 1 : 0.12 }}
                      transition={{ duration: autoplay ? DURATION / 1000 : 0.4, ease: "linear" }}
                    />
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Detail panel */}
      <div id="process-panel" aria-live="polite" className="relative lg:col-span-7">
        <div className="relative flex min-h-[34rem] flex-col justify-end overflow-hidden rounded-[2rem] shadow-lift sm:block sm:aspect-[16/11] sm:min-h-0">
          <AnimatePresence initial={false} mode="popLayout">
            <motion.div
              key={active}
              className="absolute inset-0"
              initial={{ clipPath: "inset(0 0 0 100%)", scale: 1.08 }}
              animate={{ clipPath: "inset(0 0 0 0%)", scale: 1 }}
              exit={{ opacity: 0.6 }}
              transition={{ duration: 1, ease: [0.76, 0, 0.24, 1] }}
            >
              <Image
                src={images[active].src}
                alt={images[active].alt}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
                style={{ objectPosition: images[active].pos }}
              />
              <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/45 to-transparent sm:from-navy-950/85 sm:via-navy-950/35" />
            </motion.div>
          </AnimatePresence>

          <div className="relative p-6 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-9">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">
                  Step {active + 1} of {processSteps.length}
                </p>
                <h3 className="mt-2 font-display text-2xl text-white sm:text-3xl">{step.title}</h3>
                <p className="mt-3 max-w-xl text-sm text-navy-100 sm:text-base">{step.text}</p>
                <ul className="mt-5 flex flex-wrap gap-2">
                  {step.points.map((p) => (
                    <li key={p} className="glass-dark inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium text-white sm:text-sm">
                      <Check aria-hidden className="size-3.5 text-teal-300" strokeWidth={3} />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
