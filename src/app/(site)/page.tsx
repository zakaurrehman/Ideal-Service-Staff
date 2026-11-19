import type { Metadata } from "next";
import { Hero } from "@/components/sections/home/Hero";
import { TrustBar } from "@/components/sections/home/TrustBar";
import { AboutIntro } from "@/components/sections/home/AboutIntro";
import { ServicesExplorer } from "@/components/sections/home/ServicesExplorer";
import { Affiliation } from "@/components/sections/home/Affiliation";
import { getContent, getPublicServices } from "@/lib/content";
import { WhyChoose } from "@/components/sections/home/WhyChoose";
import { HowItWorks } from "@/components/sections/home/HowItWorks";
import { QualityAssurance } from "@/components/sections/home/QualityAssurance";
import { Impact } from "@/components/sections/home/Impact";
import { Technology } from "@/components/sections/home/Technology";
import { Testimonials } from "@/components/sections/home/Testimonials";
import { LatestArticles } from "@/components/sections/home/LatestArticles";
import { ContactSection } from "@/components/sections/home/ContactSection";
import { SectionHeading } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: { absolute: `${site.name} | Compassionate Healthcare Staffing & Home Care Support` },
  description:
    "Compassionate care. Exceptional professionals. Better outcomes. Ideal Service Staff connects families and healthcare organizations with screened, trained caregivers, aides and CNAs. Call (310) 462-1700.",
  alternates: { canonical: "/" },
};

export const revalidate = 3600;

export default async function HomePage() {
  const [services, testimonials] = await Promise.all([getPublicServices(), getContent("testimonials")]);
  return (
    <>
      <Hero />
      <TrustBar />
      <Affiliation />
      <AboutIntro />

      <section id="services" className="cv-auto section relative bg-sand">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <SectionHeading
              eyebrow="Our healthcare services"
              title={["The behind-the-scenes heroes", { text: "who cover gaps in care.", className: "italic text-teal-700" }]}
              lede="So medical professionals can concentrate on complex treatment — while patients and seniors receive dignified, attentive care."
            />
            <Reveal delay={0.1}>
              <ButtonLink href="/services/" variant="outline" arrow>
                View all services
              </ButtonLink>
            </Reveal>
          </div>
          <div className="mt-12">
            <ServicesExplorer items={services} />
          </div>
        </div>
      </section>

      <WhyChoose />

      <section className="cv-auto section">
        <div className="container-x">
          <SectionHeading
            eyebrow="How it works"
            title={["As simple as one call", { text: "to access home care.", className: "italic text-teal-700" }]}
            lede="Our services are customized to your needs. Here’s how we go from your first call to care you can count on."
          />
          <div className="mt-14">
            <HowItWorks />
          </div>
        </div>
      </section>

      <QualityAssurance />
      <Impact />
      <Technology />
      <Testimonials items={testimonials} />
      <LatestArticles />
      <ContactSection />
    </>
  );
}
