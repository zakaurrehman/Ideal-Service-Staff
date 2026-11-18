import { BadgeCheck } from "lucide-react";
import { credentials, reachStats } from "@/content/company";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";

/** Section B — genuine trust indicators (Legal Disclosure credentials + original homepage reach figures). */
export function TrustBar() {
  const items = [...credentials, ...credentials];
  return (
    <section id="trust" aria-label="Credentials and reach" className="relative border-y border-line bg-white/60 backdrop-blur">
      <div className="container-x grid gap-10 py-12 lg:grid-cols-12 lg:items-center lg:py-14">
        <Reveal className="lg:col-span-4">
          <p className="eyebrow">Trusted across the USA</p>
          <RevealGroup as="dl" className="mt-5 grid grid-cols-3 gap-4">
            {reachStats.map((s) => (
              <RevealItem key={s.label} className="flex flex-col">
                <dt className="order-2 mt-1 text-xs leading-snug text-muted">{s.label}</dt>
                <dd className="font-display text-[1.6rem] leading-none text-navy-900 sm:text-3xl">{s.value}</dd>
              </RevealItem>
            ))}
          </RevealGroup>
        </Reveal>

        <div className="relative overflow-hidden mask-fade-x lg:col-span-8" aria-label="Caregiver credentials">
          <ul className="flex w-max animate-marquee gap-4 hover:[animation-play-state:paused]">
            {items.map((c, i) => (
              <li
                key={`${c.title}-${i}`}
                aria-hidden={i >= credentials.length}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-5 py-4 shadow-soft"
              >
                <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <BadgeCheck aria-hidden className="size-5" strokeWidth={1.7} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-navy-900">{c.title}</span>
                  <span className="block text-xs text-muted">{c.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
