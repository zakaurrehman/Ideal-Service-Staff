import { ShieldCheck } from "lucide-react";
import { qualityProgram, technology } from "@/content/company";
import { ParallaxImage } from "@/components/motion/Parallax";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { SectionHeading } from "@/components/ui/Primitives";

/** Section I — "We integrate smart solutions" as a bento grid. */
export function Technology() {
  return (
    <section className="cv-auto section relative bg-sand">
      <div className="container-x">
        <SectionHeading
          eyebrow="Technology-enhanced care"
          title={["We integrate", { text: "smart solutions.", className: "italic text-teal-700" }]}
          lede="Human care, supported by the right tools — so families stay informed and nothing falls through the cracks."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-12 lg:grid-rows-[auto_auto]">
          <Reveal className="relative min-h-[22rem] overflow-hidden rounded-[2rem] lg:col-span-5 lg:row-span-2">
            <div className="absolute inset-0">
              <ParallaxImage
                src="/images/clinician-tablet.webp"
                alt="A smiling care professional using a tablet"
                className="size-full"
                sizes="(min-width: 1024px) 40vw, 100vw"
                position="50% 20%"
                reveal={false}
              />
            </div>
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/30 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                <ShieldCheck aria-hidden className="size-3.5" /> Quality assurance program
              </span>
              <ul className="mt-5 space-y-2.5">
                {qualityProgram.map((q) => (
                  <li key={q} className="flex items-center gap-3 text-[0.95rem] text-white">
                    <span aria-hidden className="size-1.5 rounded-full bg-teal-300" />
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:col-span-7 lg:row-span-2 lg:grid-cols-3">
            {technology.map((t) => (
              <RevealItem
                key={t.title}
                className="group relative overflow-hidden rounded-[1.75rem] border border-white bg-white/70 p-6 backdrop-blur transition-all duration-500 hover:-translate-y-1 hover:bg-white hover:shadow-lift"
              >
                <span className="grid size-12 place-items-center rounded-2xl bg-navy-900 text-teal-300 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-6deg]">
                  <Icon name={t.icon} className="size-5" />
                </span>
                <h3 className="mt-6 text-base font-bold leading-snug text-navy-900">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}
