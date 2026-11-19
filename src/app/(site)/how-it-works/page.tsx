import { getContent } from "@/lib/content";
import { site } from "@/content/site";
import { HowItWorks } from "@/components/sections/home/HowItWorks";
import { QualityAssurance } from "@/components/sections/home/QualityAssurance";
import { Technology } from "@/components/sections/home/Technology";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { Faq } from "@/components/ui/Faq";
import { PageHero, SectionHeading } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { House, Phone, Smile } from "lucide-react";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "How It Works — From First Call to Care",
  description:
    "A free consultation, a 90-minute needs assessment, an individualized care plan and careful caregiver matching — then ongoing supervisor visits and quality reviews.",
  path: "/how-it-works/",
  image: "/images/home-visit-tablet.webp",
});

const quick = [
  { Icon: Phone, title: "Make a call / WhatsApp", text: "Pick up the phone and tell us about your requirements — or drop us a voice note or message on WhatsApp." },
  { Icon: House, title: "Care comes to your home", text: "Based on your requirements and plan, we provide care at your home." },
  { Icon: Smile, title: "Enjoy your home care", text: "Continue enjoying the care you or your loved one needs." },
];

export const revalidate = 3600;

export default async function HowItWorksPage() {
  const faqs = await getContent("faqs");
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "How It Works", path: "/how-it-works/" }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />
      <PageHero
        crumbs={[{ label: "How It Works" }]}
        eyebrow="Getting started"
        title={["Three simple steps.", { text: "One caring team.", className: "italic text-teal-700" }]}
        lede="When someone you love needs help, it can be hard to know where to start. This is where our care begins — with clarity, dignity and respect."
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/get-care/" variant="accent" size="lg" arrow magnetic>
            Start a care request
          </ButtonLink>
          <ButtonLink href={site.whatsappHref} variant="outline" size="lg">
            <WhatsappIcon className="mr-1 inline size-4" /> WhatsApp us
          </ButtonLink>
        </div>
      </PageHero>

      <section className="pb-20 lg:pb-28">
        <div className="container-x">
          <RevealGroup as="ol" className="grid gap-5 md:grid-cols-3">
            {quick.map(({ Icon, title, text }, i) => (
              <RevealItem as="li" key={title} className="group relative overflow-hidden rounded-[2rem] border border-line bg-white p-8 shadow-soft">
                <span className="flex items-center justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl bg-navy-900 text-white transition-colors duration-500 group-hover:bg-teal-500">
                    <Icon aria-hidden className="size-6" strokeWidth={1.6} />
                  </span>
                  <span aria-hidden data-num={`0${i + 1}`} className="deco-num font-display text-5xl text-navy-900/10" />
                </span>
                <h2 className="mt-8 text-xl font-bold text-navy-900">{title}</h2>
                <p className="mt-3 text-body">{text}</p>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="section bg-sand">
        <div className="container-x">
          <SectionHeading
            eyebrow="The full journey"
            title={["What happens", { text: "behind the scenes.", className: "italic text-teal-700" }]}
            lede="Select a step to see what’s involved."
          />
          <div className="mt-14">
            <HowItWorks />
          </div>
        </div>
      </section>

      <QualityAssurance />
      <Technology />

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading eyebrow="Questions" title={["Frequently", { text: "asked.", className: "italic text-teal-700" }]} />
            <Reveal delay={0.1}>
              <p className="mt-6 text-body">
                Still have questions? Call{" "}
                <a href={site.phoneHref} className="font-semibold text-teal-700 underline">
                  {site.phone}
                </a>{" "}
                — we’re open 7 days a week.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.1} className="lg:col-span-8">
            <Faq items={faqs} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
