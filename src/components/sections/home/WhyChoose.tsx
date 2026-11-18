import Image from "next/image";
import { BadgeDollarSign, CalendarClock, Repeat, Zap } from "lucide-react";
import { differentiators, keyStats, whyNonLicensed } from "@/content/company";
import { Counter } from "@/components/motion/Effects";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";

const diffIcons = [BadgeDollarSign, CalendarClock, Zap, Repeat];

/** Section E — "Why Hire Ideal-Service Staff" + "Why Families Choose Us" (animated statistics). */
export function WhyChoose() {
  return (
    <section className="cv-auto grain relative isolate overflow-hidden bg-navy-950 text-navy-200">
      <Image src="/images/team-together.webp" alt="" fill sizes="100vw" className="-z-20 object-cover opacity-[0.08]" />
      <div aria-hidden className="absolute -right-40 top-0 -z-10 size-[40rem] rounded-full bg-teal-500/20 blur-3xl" />
      <div aria-hidden className="absolute -left-40 bottom-0 -z-10 size-[30rem] rounded-full bg-navy-500/30 blur-3xl" />

      <div className="container-x section">
        <div className="grid gap-14 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <SectionHeading
              light
              eyebrow="Why families choose us"
              title={["Not every need requires", { text: "a medical license.", className: "italic text-teal-300" }]}
            />
            <Reveal delay={0.1}>
              <p className="lede mt-7 max-w-2xl text-navy-200">{whyNonLicensed}</p>
            </Reveal>
          </div>
          <Reveal delay={0.15} className="lg:col-span-5">
            <div className="glass-dark rounded-[2rem] p-8">
              <p className="font-display text-7xl leading-none text-white sm:text-8xl">
                <Counter value={80} suffix="%" />
              </p>
              <p className="mt-4 text-navy-200">
                of routine caregiving tasks — bathing, meal preparation, transportation and companionship — can be performed safely by a
                non-physician care team working with your medical team.
              </p>
            </div>
          </Reveal>
        </div>

        <RevealGroup as="dl" className="mt-16 grid gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 sm:grid-cols-3">
          {keyStats.map((s) => (
            <RevealItem key={s.label} className="flex flex-col bg-navy-950/80 p-8 backdrop-blur lg:p-10">
              <dt className="order-2 mt-3 text-base font-semibold text-white">{s.label}</dt>
              <dd className="order-1 font-display text-6xl leading-none text-teal-300 lg:text-7xl">
                <Counter value={s.value} decimals={s.decimals ?? 0} suffix={s.suffix} />
              </dd>
              <dd className="order-3 mt-1 text-sm text-navy-300">{s.note}</dd>
            </RevealItem>
          ))}
        </RevealGroup>

        <div className="mt-16 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <RevealGroup as="ul" className="grid grid-cols-2 gap-x-10 gap-y-6 sm:grid-cols-4">
            {differentiators.map((d, i) => {
              const I = diffIcons[i];
              return (
                <RevealItem as="li" key={d} className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-teal-300">
                    <I aria-hidden className="size-5" strokeWidth={1.6} />
                  </span>
                  <span className="font-semibold text-white">{d}</span>
                </RevealItem>
              );
            })}
          </RevealGroup>
          <Reveal delay={0.2} className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
            <ButtonLink href="/how-it-works/" variant="light" arrow>
              Read about our approach to care
            </ButtonLink>
          </Reveal>
        </div>
        <Reveal delay={0.1}>
          <p className="mt-10 text-sm text-navy-300">No long-term contracts · Possible same-day emergency placements</p>
        </Reveal>
      </div>
    </section>
  );
}
