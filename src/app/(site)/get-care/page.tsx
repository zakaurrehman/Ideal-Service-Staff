import { Clock, Phone, ShieldCheck, UserRoundCheck } from "lucide-react";
import { site } from "@/content/site";
import { services } from "@/content/services";
import { CareRequestForm } from "@/components/forms/CareRequestForm";
import { Enter } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/Primitives";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Request Care & Services",
  description:
    "Tell us about the care you need — it takes about two minutes. Most inquiries receive a response within 90 minutes, and same-day emergency placements are possible.",
  path: "/get-care/",
  image: "/images/hands-compassion.webp",
});

const assurances = [
  { Icon: Clock, title: "90-minute response", text: "For most inquiries during opening hours." },
  { Icon: ShieldCheck, title: "Screened professionals", text: "5-step screening, Live Scan fingerprinting." },
  { Icon: UserRoundCheck, title: "Meet before you commit", text: "In person or by video call." },
];

export default async function GetCarePage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const { service } = await searchParams;
  const preselect = services.find((s) => s.slug === service)?.title;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Request Care", path: "/get-care/" }])} />
      <PageHero
        crumbs={[{ label: "Request Care" }]}
        eyebrow="Requesting care & services"
        title={["Let’s find the right", { text: "care for you.", className: "italic text-teal-700" }]}
        lede="Answer a few quick questions and a care coordinator will be in touch. Prefer to talk? We’re a call away."
      />

      <section className="pb-24 lg:pb-32">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <Enter className="lg:col-span-8">
            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-lift sm:p-10 lg:p-12">
              <CareRequestForm preselect={preselect} />
            </div>
          </Enter>
          <aside className="space-y-5 lg:col-span-4">
            <Enter delay={0.1} className="rounded-[2rem] bg-navy-900 p-8 text-navy-200">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Need care urgently?</p>
              <p className="mt-3 font-display text-2xl text-white">Call us now — same-day emergency placements are possible.</p>
              <a
                href={site.phoneHref}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-teal-700 px-6 font-semibold text-white transition-colors hover:bg-teal-800"
              >
                <Phone aria-hidden className="size-4" /> {site.phone}
              </a>
            </Enter>
            {assurances.map(({ Icon, title, text }, i) => (
              <Enter key={title} delay={0.15 + i * 0.05} className="card flex items-start gap-4 p-6">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Icon aria-hidden className="size-5" />
                </span>
                <span>
                  <span className="block font-bold text-navy-900">{title}</span>
                  <span className="block text-sm text-muted">{text}</span>
                </span>
              </Enter>
            ))}
          </aside>
        </div>
      </section>
    </>
  );
}
