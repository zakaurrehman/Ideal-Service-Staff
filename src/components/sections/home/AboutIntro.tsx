import { Check } from "lucide-react";
import { about } from "@/content/company";
import { Drift, ParallaxImage } from "@/components/motion/Parallax";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";

/** Section C — "A Personal Welcome from Our Team" + mission & values (original homepage / About copy). */
export function AboutIntro() {
  return (
    <section className="cv-auto section relative overflow-hidden">
      <div className="container-x grid gap-16 lg:grid-cols-12 lg:gap-12">
        {/* Image collage */}
        <div className="relative order-2 pb-10 lg:order-1 lg:col-span-5 lg:self-start">
          <ParallaxImage
            src="/images/companion-laughter.webp"
            alt="A caregiver and an older man laughing together at home"
            className="aspect-[4/5] w-[86%] rounded-[2rem] shadow-lift"
            sizes="(min-width: 1024px) 34vw, 86vw"
          />
          <Drift className="absolute bottom-0 right-0 w-[52%]" distance={30}>
            <ParallaxImage
              src="/images/hands-held.webp"
              alt="A caregiver holding an older person’s hands"
              className="aspect-square rounded-[1.75rem] border-[6px] border-canvas shadow-lift"
              sizes="260px"
              strength={6}
            />
          </Drift>
          <Reveal delay={0.3} className="absolute left-4 top-6 sm:left-6">
            <div className="glass max-w-[15rem] rounded-2xl p-4">
              <p className="font-display text-lg leading-snug text-navy-900">“Quality care can be life-saving.”</p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Our founding belief</p>
            </div>
          </Reveal>
        </div>

        {/* Copy */}
        <div className="order-1 lg:order-2 lg:col-span-7 lg:pl-8">
          <SectionHeading
            eyebrow="A personal welcome from our team"
            title={["It’s the gentle hand that", { text: "helps you stand.", className: "italic text-teal-700" }]}
          />
          <Reveal delay={0.1}>
            <p className="lede mt-7">
              The reassuring voice that reminds you to take your medication, and the patient companion who listens when you need it most.
              We are not merely another staffing agency — we are a community of committed caregivers, trained assistants, and caring
              professionals who step in when you need practical, hands-on support.
            </p>
          </Reveal>

          <Reveal delay={0.15}>
            <p className="mt-8 text-sm font-bold uppercase tracking-[0.14em] text-navy-900">Whether you need</p>
          </Reveal>
          <RevealGroup as="ul" className="mt-4 grid gap-3 sm:grid-cols-3">
            {["A reliable caregiver for an elderly parent", "Post-surgery care", "Assistance for a disabled loved one"].map((t) => (
              <RevealItem as="li" key={t} className="card flex items-start gap-3 p-4 text-[0.95rem] font-medium text-navy-900">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-teal-500 text-white">
                  <Check aria-hidden className="size-3.5" strokeWidth={3} />
                </span>
                {t}
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.1}>
            <figure className="relative mt-12 border-l-2 border-teal-400 pl-6">
              <figcaption className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">Our mission</figcaption>
              <blockquote className="mt-3 font-display text-xl leading-relaxed text-navy-900 sm:text-[1.45rem]">“{about.mission}”</blockquote>
            </figure>
          </Reveal>

          <RevealGroup className="mt-12 grid gap-6 sm:grid-cols-3">
            {about.values.map((v, i) => (
              <RevealItem key={v.title}>
                <span className="font-display text-sm text-teal-700">0{i + 1}</span>
                <h3 className="mt-2 text-base font-bold text-navy-900">{v.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{v.text.split(". ")[0]}.</p>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal delay={0.1} className="mt-12">
            <ButtonLink href="/non-medical-home-care-experts/" variant="primary" arrow>
              More about us
            </ButtonLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
