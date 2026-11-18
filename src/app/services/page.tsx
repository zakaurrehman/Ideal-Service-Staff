import { carePillars, familyReasons, serviceAdvantages } from "@/content/company";
import { carePrograms, services } from "@/content/services";
import { SITE_URL, site } from "@/content/site";
import { ServicesExplorer } from "@/components/sections/home/ServicesExplorer";
import { Testimonials } from "@/components/sections/home/Testimonials";
import { QualityAssurance } from "@/components/sections/home/QualityAssurance";
import { ParallaxImage } from "@/components/motion/Parallax";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { PageHero, SectionHeading } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Healthcare Staffing & Home Care Services",
  description:
    "Personal care aides, home health aides, CNAs, companion caregivers, respite care, mobility aides, medication reminders and more — plus elder care, post-hospitalization and memory care programs.",
  path: "/services/",
  image: "/images/caregiver-greeting.webp",
});

export default function ServicesPage() {
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: services.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Service",
        name: s.title,
        description: s.summary,
        url: `${SITE_URL}/services/${s.slug}/`,
        provider: { "@id": `${SITE_URL}/#organization` },
      },
    })),
  };

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Services", path: "/services/" }])} />
      <JsonLd data={itemList} />
      <PageHero
        crumbs={[{ label: "Services" }]}
        eyebrow="Revolutionizing non-medical care"
        title={["Care that bridges the gap between", { text: "medicine and daily life.", className: "italic text-teal-700" }]}
        lede={`With America’s aging population expanding — 10,000 seniors reach age 65 every day — and hospital systems increasingly overwhelmed, ${site.name} focuses on non-licensed healthcare staffing: the vital link between medical care and daily living.`}
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/get-care/" variant="accent" size="lg" arrow magnetic>
            Request Care
          </ButtonLink>
          <ButtonLink href="/services-booking/" variant="outline" size="lg">
            Book a consultation
          </ButtonLink>
        </div>
      </PageHero>

      {/* Advantages */}
      <section className="pb-8">
        <div className="container-x">
          <RevealGroup as="dl" className="grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] border border-line bg-line lg:grid-cols-4">
            {serviceAdvantages.map((a) => (
              <RevealItem key={a.label} className="flex flex-col bg-white p-6 sm:p-8">
                <dt className="order-2 mt-2 text-sm text-muted">{a.label}</dt>
                <dd className="order-1 font-display text-3xl text-navy-900 sm:text-4xl">{a.value}</dd>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* All specialties */}
      <section className="section">
        <div className="container-x">
          <SectionHeading
            eyebrow="Healthcare professionals we place"
            title={["Find the right professional", { text: "for every need.", className: "italic text-teal-700" }]}
            lede="Filter by category, then explore each role in detail."
          />
          <div className="mt-12">
            <ServicesExplorer />
          </div>
        </div>
      </section>

      {/* Care programs */}
      <section className="section bg-sand">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <SectionHeading eyebrow="Care programs" title={["Comprehensive programs,", { text: "personal plans.", className: "italic text-teal-700" }]} />
              <ParallaxImage
                src="/images/patient-recovery.webp"
                alt="A care professional sitting with a patient recovering at home"
                className="mt-10 aspect-[4/3] rounded-[2rem] shadow-lift"
                sizes="(min-width: 1024px) 30vw, 100vw"
                position="68% 30%"
              />
            </div>
          </div>
          <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:col-span-8">
            {carePrograms.map((p) => (
              <RevealItem key={p.title} className="group rounded-[1.75rem] border border-white bg-white/80 p-7 transition-all duration-500 hover:-translate-y-1 hover:bg-white hover:shadow-lift">
                <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700 transition-colors duration-500 group-hover:bg-teal-500 group-hover:text-white">
                  <Icon name={p.icon} className="size-5" />
                </span>
                <h3 className="mt-6 text-lg font-bold text-navy-900">{p.title}</h3>
                <p className="mt-3 text-[0.94rem] leading-relaxed text-body">{p.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Pillars */}
      <section className="section">
        <div className="container-x">
          <SectionHeading
            align="center"
            eyebrow="Why choose us"
            title={["We’re committed to working with you", { text: "and your family.", className: "italic text-teal-700" }]}
            lede="To provide the best care possible."
          />
          <RevealGroup className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {carePillars.map((p, i) => (
              <RevealItem key={p.title} className="card relative overflow-hidden p-7">
                <span aria-hidden className="absolute -right-3 -top-6 font-display text-8xl text-navy-900/[0.04]">
                  {i + 1}
                </span>
                <h3 className="font-display text-xl leading-snug text-navy-900">{p.title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-body">{p.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* Booking care services */}
      <section className="grain relative overflow-hidden bg-navy-950">
        <div className="container-x section relative grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <SectionHeading
              light
              eyebrow="Booking care services"
              title={["As simple as one call", { text: "to access home care.", className: "italic text-teal-300" }]}
              lede="To book our services, all you need to do is call us and tell us about your requirements. Every plan is customized to your needs."
            />
            <Reveal delay={0.15} className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/services-booking/" variant="accent" arrow>
                Book a consultation
              </ButtonLink>
              <ButtonLink href={site.phoneHref} variant="outline-light">
                {site.phone}
              </ButtonLink>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="glass-dark rounded-[2rem] p-8 sm:p-10">
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Why families choose us</h3>
            <ul className="mt-6 space-y-4">
              {familyReasons.map((r) => (
                <li key={r} className="flex items-start gap-3 text-lg text-white">
                  <span aria-hidden className="mt-3 size-1.5 shrink-0 rounded-full bg-teal-300" />
                  {r}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <QualityAssurance />
      <Testimonials />
    </>
  );
}
