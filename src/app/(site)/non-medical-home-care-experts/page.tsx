import Image from "next/image";
import { Check } from "lucide-react";
import { about, protocols } from "@/content/company";
import { ParallaxImage } from "@/components/motion/Parallax";
import { Counter } from "@/components/motion/Effects";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { PageHero, SectionHeading } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "About Us — Non-Medical Home Care Experts",
  description:
    "Our purpose, mission, vision and values: transforming non-medical caregiving through professional excellence and compassionate service, so people can age with independence and dignity at home.",
  path: "/non-medical-home-care-experts/",
  image: "/images/team-healthcare-staff.webp",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "About Us", path: "/non-medical-home-care-experts/" }])} />
      <PageHero
        crumbs={[{ label: "About Us" }]}
        eyebrow="Non-medical home care experts"
        title={["Our foundational purpose:", { text: "why we exist.", className: "italic text-teal-700" }]}
        lede={about.purposeIntro}
        image="/images/team-healthcare-staff.webp"
        imageAlt="The Ideal Service Staff team of caregivers, nurses and care professionals"
        imagePosition="50% 25%"
      />

      {/* Three dimensions */}
      <section className="section pt-8 lg:pt-12">
        <div className="container-x">
          <Reveal>
            <p className="max-w-2xl font-display text-2xl leading-snug text-navy-900 sm:text-3xl">
              Our purpose manifests in three critical dimensions.
            </p>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-px overflow-hidden rounded-[2rem] border border-line bg-line md:grid-cols-3">
            {about.dimensions.map((d, i) => (
              <RevealItem key={d.title} className="group bg-white p-8 transition-colors duration-500 hover:bg-teal-50/60 lg:p-10">
                <span aria-hidden data-num={`0${i + 1}`} className="deco-num block font-display text-5xl text-teal-200 transition-colors group-hover:text-teal-400" />
                <h2 className="mt-6 text-xl font-bold text-navy-900">{d.title}</h2>
                <p className="mt-3 leading-relaxed text-body">{d.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* The growing need */}
      <section className="grain relative overflow-hidden bg-navy-950 text-navy-200">
        <div aria-hidden className="absolute -left-40 top-0 size-[36rem] rounded-full bg-teal-500/15 blur-3xl" />
        <div className="container-x section relative">
          <SectionHeading
            light
            eyebrow="The growing need"
            title={["America is aging —", { text: "and wants to age at home.", className: "italic text-teal-300" }]}
            lede="This preference, known as “aging in place,” requires robust support systems that bridge the gap between medical treatment and daily living needs."
          />
          <RevealGroup as="dl" className="mt-14 grid gap-6 md:grid-cols-3">
            {about.need.map((n) => (
              <RevealItem key={n.value} className="flex flex-col rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-8">
                <dt className="order-2 mt-4 text-lg leading-snug text-white">{n.text}</dt>
                <dd className="order-1 font-display text-6xl text-teal-300">{n.value}</dd>
                <dd className="order-3 mt-auto pt-6 text-xs font-semibold uppercase tracking-[0.14em] text-navy-300">Source: {n.source}</dd>
              </RevealItem>
            ))}
          </RevealGroup>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {[
              { title: "Essential ADLs", items: about.adls, img: "/images/caregiver-greeting.webp" },
              { title: "Critical IADLs", items: about.iadls, img: "/images/home-visit-tablet.webp" },
            ].map((g, i) => (
              <Reveal key={g.title} delay={i * 0.1} className="relative overflow-hidden rounded-[2rem]">
                <Image src={g.img} alt="" fill sizes="(min-width: 768px) 45vw, 100vw" className="object-cover opacity-30" />
                <div className="relative bg-gradient-to-br from-navy-900/95 to-navy-900/60 p-8 lg:p-10">
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">{g.title}</h3>
                  <ul className="mt-6 space-y-3">
                    {g.items.map((it) => (
                      <li key={it} className="flex items-center gap-3 text-lg text-white">
                        <Check aria-hidden className="size-5 text-teal-300" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & vision */}
      <section className="section">
        <div className="container-x grid gap-16 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Reveal>
              <p className="eyebrow">Our mission</p>
            </Reveal>
            <Reveal delay={0.1}>
              <blockquote className="mt-6 font-display text-3xl leading-[1.3] text-navy-900 sm:text-4xl">
                “To provide exceptional non-medical home care that enhances quality of life through{" "}
                <span className="italic text-teal-700">professional caregivers, personalized service, and innovative solutions</span> — enabling
                individuals to maintain their independence and dignity in the comfort of their own homes.”
              </blockquote>
            </Reveal>
            <Reveal delay={0.2} className="mt-10">
              <ButtonLink href="/get-care/" variant="accent" arrow>
                Get Care
              </ButtonLink>
            </Reveal>
          </div>
          <div className="lg:col-span-5 lg:col-start-8">
            <Reveal>
              <p className="eyebrow">Our vision</p>
              <h2 className="display-md mt-5">The future we’re building.</h2>
            </Reveal>
            <div className="mt-8 space-y-6">
              {about.vision.map((v, i) => (
                <Reveal key={v.title} delay={i * 0.1} className="card p-7">
                  <h3 className="text-lg font-bold text-navy-900">{v.title}</h3>
                  <p className="mt-2 text-sm text-muted">{v.text}</p>
                  <ul className="mt-4 space-y-2">
                    {v.items.map((it) => (
                      <li key={it} className="flex gap-3 text-[0.95rem] text-body">
                        <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-teal-500" />
                        {it}
                      </li>
                    ))}
                  </ul>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section bg-sand">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading eyebrow="Our core values" title={["The principles", { text: "that guide us.", className: "italic text-teal-700" }]} />
            <ParallaxImage
              src="/images/caregiver-senior-smile.webp"
              alt="A caregiver smiling with an older woman"
              className="mt-10 aspect-[5/4] rounded-[2rem] shadow-lift"
              sizes="(min-width: 1024px) 38vw, 100vw"
            />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            {about.values.map((v, i) => (
              <Reveal key={v.title} delay={i * 0.08} className="border-b border-navy-900/10 py-9 first:pt-0 last:border-0">
                <div className="flex gap-6">
                  <span className="font-display text-2xl text-teal-600">0{i + 1}</span>
                  <div>
                    <h3 className="font-display text-2xl text-navy-900">{v.title}</h3>
                    <p className="mt-3 leading-relaxed text-body">{v.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership + care model */}
      <section className="section">
        <div className="container-x">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-6">
              <SectionHeading
                eyebrow="Leadership"
                title={["Experts shaping the future of", { text: "non-medical home care.", className: "italic text-teal-700" }]}
              />
            </div>
            <Reveal delay={0.1} className="lg:col-span-5 lg:col-start-8 lg:pt-16">
              <p className="lede">{about.leadership}</p>
            </Reveal>
          </div>

          <Reveal className="mt-20">
            <h2 className="display-md">Our innovative care model</h2>
          </Reveal>
          <RevealGroup className="mt-8 grid gap-5 md:grid-cols-2">
            {about.careModel.map((m) => (
              <RevealItem key={m.title} className="card p-8">
                <h3 className="text-xl font-bold text-navy-900">{m.title}</h3>
                <ul className="mt-5 space-y-3">
                  {m.items.map((it) => (
                    <li key={it} className="flex gap-3 text-body">
                      <Check aria-hidden className="mt-1 size-4 shrink-0 text-teal-600" strokeWidth={2.5} />
                      {it}
                    </li>
                  ))}
                </ul>
              </RevealItem>
            ))}
          </RevealGroup>

          <Reveal className="mt-20">
            <h2 className="display-md">Evidence-based protocols</h2>
          </Reveal>
          <RevealGroup className="mt-8 grid gap-5 md:grid-cols-2">
            {protocols.map((p) => (
              <RevealItem key={p.title} className="rounded-[2rem] bg-navy-900 p-8 text-navy-200 sm:p-10">
                <h3 className="text-xl font-bold text-white">{p.title}</h3>
                <ul className="mt-5 space-y-2.5">
                  {p.items.map((it) => (
                    <li key={it} className="flex gap-3">
                      <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-teal-300" />
                      {it}
                    </li>
                  ))}
                </ul>
                <p className="mt-8 flex items-baseline gap-3 border-t border-white/10 pt-6">
                  <span className="font-display text-5xl text-teal-300">
                    <Counter value={p.result.value} suffix={p.result.suffix} />
                  </span>
                  <span className="text-sm">{p.result.label}</span>
                </p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
