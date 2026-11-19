"use client";

import Image from "next/image";
import Link from "next/link";
import { m as motion, type MotionValue, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ShieldCheck, Sparkles, Star, UserRoundCheck } from "lucide-react";
import { type CSSProperties } from "react";
import { SplitReveal } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Entrances use CSS keyframes (.enter*, see globals.css) so the hero animates
 * from first paint without waiting for hydration; scroll parallax uses CSS
 * scroll-driven animations. Framer Motion only adds pointer-depth parallax.
 */
const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

function useDepth(mx: MotionValue<number>, my: MotionValue<number>, depth: number) {
  const x = useSpring(useTransform(mx, (v) => v * depth), { stiffness: 80, damping: 20 });
  const y = useSpring(useTransform(my, (v) => v * depth), { stiffness: 80, damping: 20 });
  return { x, y };
}

export function Hero() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const far = useDepth(mx, my, 10);
  const mid = useDepth(mx, my, 22);
  const near = useDepth(mx, my, 38);


  const onMove = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <section onPointerMove={onMove} className="relative overflow-hidden pb-16 pt-28 sm:pt-36 lg:min-h-[100svh] lg:pb-24 lg:pt-40">
      {/* Atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-48 -top-24 size-[44rem] rounded-full bg-teal-200/45 blur-3xl animate-blob" />
        <div className="absolute -right-40 top-40 size-[36rem] rounded-full bg-navy-200/45 blur-3xl animate-blob [animation-delay:-7s]" />
        <div className="absolute bottom-0 left-1/3 size-[24rem] rounded-full bg-gold-300/25 blur-3xl animate-blob [animation-delay:-12s]" />
        <div className="absolute inset-0 bg-dots [mask-image:radial-gradient(ellipse_at_30%_40%,#000_10%,transparent_65%)]" />
      </div>

      <div className="container-x grid items-center gap-14 lg:grid-cols-12 lg:gap-8">
        {/* Copy */}
        <div className="hero-fade lg:col-span-6">
          <p
            className="enter inline-flex items-center gap-2.5 rounded-full border border-navy-900/10 bg-white/70 py-1.5 pl-2 pr-4 text-[0.8rem] font-semibold text-navy-800 shadow-soft backdrop-blur"
            style={d(0)}
          >
            <span className="relative grid size-6 place-items-center rounded-full bg-teal-500 text-white">
              <span className="absolute inset-0 rounded-full bg-teal-400 animate-pulse-ring" />
              <Sparkles aria-hidden className="relative size-3.5" />
            </span>
            Trusted healthcare staffing &amp; care support
          </p>

          <SplitReveal
            as="h1"
            immediate
            delay={0.05}
            className="display-xl mt-7 text-navy-950"
            lines={["Compassionate Care.", { text: "Exceptional Professionals.", className: "italic text-teal-600" }, "Better Outcomes."]}
          />

          <p className="enter lede mt-7 max-w-xl" style={d(0.3)}>
            Connecting families, healthcare organizations, and individuals with reliable, compassionate, and qualified healthcare
            professionals.
          </p>

          <div className="enter mt-9 flex flex-wrap items-center gap-3" style={d(0.4)}>
            <ButtonLink href="/get-care/" variant="accent" size="lg" arrow magnetic>
              Find Care
            </ButtonLink>
            <ButtonLink href="/services/" variant="primary" size="lg" magnetic>
              Find a Professional
            </ButtonLink>
            <Link href="/services-booking/" className="group ml-1 inline-flex h-14 items-center gap-2 px-2 font-semibold text-navy-900">
              <span className="link-underline">Request Services</span>
              <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>

          {/* Trust indicators */}
          <ul aria-label="Why families trust us" className="enter mt-12 flex flex-wrap items-center gap-x-7 gap-y-5 border-t border-navy-900/10 pt-8" style={d(0.55)}>
            <li className="flex items-center gap-3">
              <span className="flex -space-x-3" aria-hidden>
                {["caregiver-senior-smile", "clinician-tablet", "companion-laughter", "home-health-walker"].map((img) => (
                  <Image key={img} src={`/images/${img}.webp`} alt="" width={44} height={44} className="size-11 rounded-full border-[3px] border-canvas object-cover" />
                ))}
              </span>
              <span>
                <span className="block text-sm font-bold text-navy-900">Hundreds of caregivers</span>
                <span className="block text-xs text-muted">screened, trained &amp; matched</span>
              </span>
            </li>
            <li>
              <span className="flex items-center gap-1 text-gold-500" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-current" />
                ))}
              </span>
              <span className="mt-1 block text-sm text-navy-900">
                <strong>4.9/5</strong> <span className="text-muted">client satisfaction</span>
              </span>
            </li>
            <li>
              <span className="block font-display text-2xl text-navy-900">97%</span>
              <span className="block text-xs text-muted">caregiver retention</span>
            </li>
          </ul>
        </div>

        {/* Visual composition */}
        <div className="relative lg:col-span-6">
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[34rem] sm:aspect-[5/5.4] lg:ml-auto lg:mr-0">
            {/* Arch photo */}
            <motion.div className="absolute inset-y-0 right-0 w-[84%]" style={reduce ? undefined : far}>
              <div className="enter-clip relative size-full overflow-hidden rounded-b-[2.5rem] rounded-t-[999px] shadow-lift" style={d(0.05)}>
                <div className="hero-sink absolute inset-[-8%]">
                  <Image
                    src="/images/hero-home-visit.webp"
                    alt="A caregiver checking an older man's blood pressure during a home visit"
                    fill
                    priority
                    fetchPriority="high"
                    sizes="(min-width: 1024px) 65vw, 200vw"
                    className="object-cover object-[50%_30%]"
                  />
                </div>
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/35 via-transparent to-transparent" />
              </div>
            </motion.div>

            {/* Secondary photo */}
            <div className="enter-pop absolute -left-2 bottom-[8%] w-[42%] sm:left-0" style={d(0.5)}>
              <motion.div style={reduce ? undefined : near} className="relative aspect-square overflow-hidden rounded-[1.75rem] border-[6px] border-canvas shadow-lift">
                <Image
                  src="/images/caregiver-senior-smile.webp"
                  alt="A smiling caregiver sharing a warm moment with an older woman"
                  fill
                  priority
                  sizes="(min-width: 1024px) 240px, 45vw"
                  className="object-cover"
                />
              </motion.div>
            </div>

            {/* Floating card: screening */}
            <div className="enter-slide absolute left-0 top-[12%] sm:-left-6" style={d(0.7)}>
              <motion.div style={reduce ? undefined : mid}>
                <div className="glass flex items-center gap-3 rounded-2xl py-3 pl-3 pr-5 animate-float">
                  <span className="grid size-10 place-items-center rounded-xl bg-navy-900 text-white">
                    <ShieldCheck aria-hidden className="size-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-navy-900">5-step screening</span>
                    <span className="block text-xs text-muted">Background-checked &amp; skills-tested</span>
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Floating card: matching */}
            <div className="enter-pop absolute -right-1 bottom-[-4%] sm:-right-6 lg:bottom-[6%]" style={d(0.85)}>
              <motion.div style={reduce ? undefined : near}>
                <div className="glass w-60 rounded-2xl p-4 animate-float-slow">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-full bg-teal-500 text-white">
                      <UserRoundCheck aria-hidden className="size-4" />
                    </span>
                    <span className="text-sm font-bold text-navy-900">Caregiver matched</span>
                  </div>
                  <ul className="mt-3 space-y-1.5 text-xs text-body">
                    {["Alignment of skills", "Personality match", "Introduction meeting"].map((t, i) => (
                      <li key={t} className="flex items-center gap-2">
                        <span className="enter-bar h-1.5 rounded-full bg-teal-400" style={d(1.2 + i * 0.15)} />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            </div>

            {/* Rotating seal */}
            <div className="enter-spin absolute -top-4 right-[-2%] hidden size-32 sm:block lg:size-36" style={d(0.9)}>
              <motion.div style={reduce ? undefined : mid} className="relative size-full">
                <div className="absolute inset-0 rounded-full bg-white/80 shadow-lift backdrop-blur" />
                <svg viewBox="0 0 100 100" className="absolute inset-0 size-full animate-spin-slow" aria-hidden>
                  <defs>
                    <path id="seal" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
                  </defs>
                  <text className="fill-navy-800 text-[8.6px] font-bold uppercase tracking-[0.32em]">
                    <textPath href="#seal">Compassion · Professionalism · Trust ·</textPath>
                  </text>
                </svg>
                <Image src="/brand/logo-badge.webp" alt="" width={64} height={64} className="absolute left-1/2 top-1/2 size-[44%] -translate-x-1/2 -translate-y-1/2" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      <a
        href="#trust"
        aria-label="Scroll to learn more"
        className="enter absolute bottom-8 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted lg:flex"
        style={d(1.3)}
      >
        Scroll
        <span className="grid size-10 place-items-center rounded-full border border-navy-900/15">
          <ArrowDown aria-hidden className="size-4 animate-float" />
        </span>
      </a>
    </section>
  );
}
