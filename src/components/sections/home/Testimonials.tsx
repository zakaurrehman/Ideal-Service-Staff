"use client";

import { AnimatePresence, m as motion, useInView, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Pause, Play, Quote } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { testimonials as staticTestimonials } from "@/content/company";
import { SectionHeading } from "@/components/ui/Primitives";

const INTERVAL = 9000;

/** Section J — accessible testimonial carousel (swipe, arrows, keyboard, pause control). */
export function Testimonials({ items }: { items?: typeof staticTestimonials }) {
  const testimonials = items?.length ? items : staticTestimonials;
  const [[index, dir], setState] = useState<[number, number]>([0, 1]);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.4 });
  const reduce = useReducedMotion();
  const n = testimonials.length;
  const auto = playing && !hovered && inView && !reduce;

  const go = useCallback((d: number) => setState(([i]) => [(i + d + n) % n, d]), [n]);
  const goTo = (i: number) => setState(([cur]) => [i, i > cur ? 1 : -1]);

  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => go(1), INTERVAL);
    return () => clearTimeout(t);
  }, [auto, index, go]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };

  const t = testimonials[index];

  return (
    <section className="cv-auto section relative overflow-hidden" aria-roledescription="carousel" aria-label="Client testimonials">
      <div aria-hidden className="absolute -left-40 top-20 -z-10 size-[36rem] rounded-full bg-gold-300/20 blur-3xl" />
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading eyebrow="What our clients say" title={["Families who found", { text: "peace of mind.", className: "italic text-teal-700" }]} />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? "Pause automatic rotation" : "Start automatic rotation"}
              className="grid size-12 place-items-center rounded-full border border-line bg-white text-navy-900 transition-colors hover:border-navy-300"
            >
              {playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous testimonial"
              className="grid size-14 place-items-center rounded-full border border-line bg-white text-navy-900 transition-all hover:-translate-x-0.5 hover:border-navy-300"
            >
              <ArrowLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next testimonial"
              className="grid size-14 place-items-center rounded-full bg-navy-900 text-white transition-all hover:translate-x-0.5 hover:bg-navy-800"
            >
              <ArrowRight aria-hidden className="size-5" />
            </button>
          </div>
        </div>

        <div
          ref={ref}
          className="relative mt-14"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") go(1);
            if (e.key === "ArrowLeft") go(-1);
          }}
        >
          <div className="relative overflow-hidden rounded-[2.25rem] border border-line bg-white shadow-soft">
            <Quote aria-hidden className="absolute right-8 top-8 size-28 text-teal-100 sm:size-40" strokeWidth={1} />
            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.figure
                key={index}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${n}`}
                custom={dir}
                initial={{ opacity: 0, x: dir * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: dir * -60 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                drag={reduce ? false : "x"}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={onDragEnd}
                className="relative grid cursor-grab gap-10 p-8 active:cursor-grabbing sm:p-12 lg:grid-cols-12 lg:gap-14 lg:p-16"
              >
                <div className="lg:col-span-8">
                  <blockquote>
                  <p className="font-display text-xl leading-[1.55] text-navy-900 sm:text-2xl lg:text-[1.7rem]">“{t.quote}”</p>
                  </blockquote>
                  <figcaption className="mt-8 flex items-center gap-4">
                    <span className="grid size-12 place-items-center rounded-full bg-navy-900 font-display text-lg text-white" aria-hidden>
                      {t.name.charAt(0)}
                    </span>
                    <span>
                      <span className="block font-bold text-navy-900">{t.name}</span>
                      <span className="block text-sm text-muted">{t.location}</span>
                    </span>
                  </figcaption>
                </div>
                <div className="self-end rounded-[1.5rem] bg-canvas p-6 lg:col-span-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{t.outcomeLabel}</p>
                  <ul className="mt-4 space-y-3">
                    {t.outcomes.map((o) => (
                      <li key={o} className="flex gap-3 text-sm text-navy-900">
                        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-teal-500 text-white">
                          <Check aria-hidden className="size-3" strokeWidth={3} />
                        </span>
                        {o}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.figure>
            </AnimatePresence>
          </div>

          {/* Pager */}
          <div className="mt-8 flex items-center justify-between gap-6">
            <p className="font-display text-lg tabular-nums text-navy-900" aria-live="polite">
              {String(index + 1).padStart(2, "0")} <span className="text-muted">/ {String(n).padStart(2, "0")}</span>
            </p>
            <div className="flex flex-1 justify-end gap-2" role="group" aria-label="Choose testimonial">
              {testimonials.map((x, i) => (
                <button
                  key={x.name}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show testimonial from ${x.name}`}
                  aria-current={i === index}
                  className="group relative h-11 w-8 sm:w-12"
                >
                  <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-navy-100">
                    {i === index && (
                      <motion.span
                        key={`${index}-${auto}`}
                        className="absolute inset-y-0 left-0 rounded-full bg-teal-500"
                        initial={{ width: auto ? "0%" : "100%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: auto ? INTERVAL / 1000 : 0.3, ease: "linear" }}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
