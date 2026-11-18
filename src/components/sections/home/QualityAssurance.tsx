import { qualityTiers, screeningSteps } from "@/content/company";
import { ParallaxImage, ScrollLine } from "@/components/motion/Parallax";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/Primitives";

/** Section G — the 5-step screening process (scroll-linked timeline) + three-tier quality system. */
export function QualityAssurance() {
  return (
    <section className="cv-auto section relative bg-white">
      <div className="container-x">
        <div className="grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-32">
              <SectionHeading
                eyebrow="How we guarantee quality care"
                title={["We don’t simply hire anyone —", { text: "we match the right person.", className: "italic text-teal-700" }]}
                lede="Every caregiver passes our 5-step screening process before they meet your family — and keeps learning long after."
              />
              <ParallaxImage
                src="/images/team-clinicians.webp"
                alt="Smiling members of the Ideal Service Staff care team"
                className="mt-10 hidden aspect-[16/10] rounded-[2rem] shadow-lift lg:block"
                sizes="40vw"
                position="50% 30%"
              />
            </div>
          </div>

          <div className="relative lg:col-span-6 lg:col-start-7">
            <ScrollLine className="bottom-6 left-[1.6rem] top-6" />
            <ol className="relative">
              {screeningSteps.map((s, i) => (
                <Reveal as="li" key={s.title} className="relative flex gap-7 pb-12 last:pb-0" x={30} y={0}>
                  <span className="relative z-10 grid size-[3.25rem] shrink-0 place-items-center rounded-full border border-teal-200 bg-white font-display text-lg text-teal-700 shadow-soft">
                    {i + 1}
                  </span>
                  <div className="pt-2.5">
                    <h3 className="text-xl font-bold text-navy-900">{s.title}</h3>
                    <p className="mt-2 text-body">{s.text}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-24 lg:mt-32">
          <Reveal>
            <h3 className="display-md max-w-xl">
              A three-tier quality system that <span className="italic text-teal-700">never stops checking.</span>
            </h3>
          </Reveal>
          <RevealGroup className="mt-10 grid gap-5 md:grid-cols-3">
            {qualityTiers.map((t, i) => (
              <RevealItem
                key={t.title}
                className="group relative overflow-hidden rounded-[1.75rem] border border-line bg-canvas p-8 transition-colors duration-500 hover:bg-navy-950"
              >
                <span aria-hidden className="absolute -bottom-6 right-5 font-display text-[7rem] leading-none text-navy-900/[0.05] transition-colors duration-500 group-hover:text-white/[0.06]">
                  {i + 1}
                </span>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700 transition-colors group-hover:text-teal-300">{t.cadence}</p>
                <h4 className="mt-3 text-2xl font-bold text-navy-900 transition-colors group-hover:text-white">{t.title}</h4>
                <ul className="mt-6 space-y-3">
                  {t.items.map((it) => (
                    <li key={it} className="flex items-center gap-3 text-body transition-colors group-hover:text-navy-200">
                      <span className="size-1.5 rounded-full bg-teal-500" aria-hidden />
                      {it}
                    </li>
                  ))}
                </ul>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
