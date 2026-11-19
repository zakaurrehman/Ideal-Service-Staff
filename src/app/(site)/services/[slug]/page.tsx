import { notFound } from "next/navigation";
import { Check, Phone } from "lucide-react";
import { getPublicServices } from "@/lib/content";
import { SITE_URL, site } from "@/content/site";
import { screeningSteps } from "@/content/company";
import { ServiceCard } from "@/components/sections/home/ServicesExplorer";
import { HowItWorks } from "@/components/sections/home/HowItWorks";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Icon } from "@/components/ui/Icon";
import { PageHero, SectionHeading } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

/** New services added in the admin are generated on first visit; archived ones return 404. */
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await getPublicServices()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = (await getPublicServices()).find((x) => x.slug === slug);
  if (!s) return {};
  return pageMetadata({ title: s.title, description: s.summary, path: `/services/${s.slug}/`, image: s.image });
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const services = await getPublicServices();
  const s = services.find((x) => x.slug === slug);
  if (!s) notFound();

  const related = services.filter((x) => x.slug !== s.slug && x.category === s.category).slice(0, 3);
  const fill = services.filter((x) => x.slug !== s.slug && !related.includes(x)).slice(0, 3 - related.length);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Services", path: "/services/" },
          { name: s.title, path: `/services/${s.slug}/` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: s.title,
          description: s.summary,
          serviceType: s.title,
          url: `${SITE_URL}/services/${s.slug}/`,
          provider: { "@id": `${SITE_URL}/#organization` },
          areaServed: "US",
        }}
      />
      <PageHero
        crumbs={[{ label: "Services", href: "/services/" }, { label: s.title }]}
        eyebrow="Our healthcare services"
        title={[s.title]}
        lede={s.summary}
        image={s.image}
        imageAlt=""
        imagePosition={s.imagePosition}
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href={`/get-care/?service=${s.slug}`} variant="accent" size="lg" arrow magnetic>
            Request this service
          </ButtonLink>
          <ButtonLink href={site.phoneHref} variant="outline" size="lg">
            <Phone aria-hidden className="mr-1 inline size-4" />
            {site.phone}
          </ButtonLink>
        </div>
      </PageHero>

      <section className="section pt-4 lg:pt-8">
        <div className="container-x grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <Reveal>
              <span className="grid size-14 place-items-center rounded-2xl bg-navy-900 text-teal-300">
                <Icon name={s.icon} className="size-6" />
              </span>
            </Reveal>
            <Reveal delay={0.05}>
              <h2 className="display-md mt-8">Overview</h2>
            </Reveal>
            {s.description.map((p, i) => (
              <Reveal key={i} delay={0.1 + i * 0.05}>
                <p className="lede mt-5">{p}</p>
              </Reveal>
            ))}
            <Reveal delay={0.2}>
              <p className="mt-8 rounded-2xl border border-line bg-white p-5 text-sm text-muted">
                Our caregivers provide non-medical support within the scope set out in our{" "}
                <a href="/legal-disclosure/" className="font-semibold text-teal-700 underline">
                  Legal Disclosure
                </a>
                , and coordinate with your medical team for clinical needs.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
            <div className="rounded-[2rem] bg-sand p-8">
              <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Typical support includes</h2>
              <ul className="mt-6 space-y-4">
                {s.tasks.map((t) => (
                  <li key={t} className="flex items-start gap-3 font-medium text-navy-900">
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-teal-500 text-white">
                      <Check aria-hidden className="size-3.5" strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-muted">Every plan is individualized after your needs assessment.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section bg-white">
        <div className="container-x">
          <SectionHeading
            eyebrow="Our 5-step screening process"
            title={["Every professional is", { text: "carefully screened.", className: "italic text-teal-700" }]}
          />
          <RevealGroup as="ol" className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {screeningSteps.map((st, i) => (
              <RevealItem as="li" key={st.title} className="rounded-[1.5rem] border border-line bg-canvas p-6">
                <span className="font-display text-3xl text-teal-500">{i + 1}</span>
                <h3 className="mt-4 font-bold text-navy-900">{st.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{st.text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="section">
        <div className="container-x">
          <SectionHeading eyebrow="How it works" title={["From first call", { text: "to care you can count on.", className: "italic text-teal-700" }]} />
          <div className="mt-14">
            <HowItWorks />
          </div>
        </div>
      </section>

      <section className="section bg-sand">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading eyebrow="Related services" title={["You may also need"]} />
            <ButtonLink href="/services/" variant="outline" arrow>
              All services
            </ButtonLink>
          </div>
          <RevealGroup as="ul" className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[...related, ...fill].map((r) => (
              <RevealItem as="li" key={r.slug}>
                <ServiceCard service={r} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
