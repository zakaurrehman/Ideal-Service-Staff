import { Clock, MapPin } from "lucide-react";
import { site } from "@/content/site";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactChannels } from "@/components/sections/home/ContactSection";
import { Enter } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/Primitives";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Contact Us",
  description: `Get in touch with ${site.name}: call ${site.phone}, email ${site.email}, or visit us at 330 W. Olive St, Inglewood, CA 90301. Open 7 days a week.`,
  path: "/contact/",
  image: "/images/home-visit-tablet.webp",
});

export default function ContactPage() {
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&output=embed`;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Contact Us", path: "/contact/" }])} />
      <PageHero
        crumbs={[{ label: "Contact Us" }]}
        eyebrow="Get in touch"
        title={["Contact us to get", { text: "more information.", className: "italic text-teal-700" }]}
        lede="Just say hello — whether you need care for a loved one, staffing for your organization, or answers to a quick question."
      />

      <section className="pb-20 lg:pb-28">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-5">
            <Enter>
              <ContactChannels />
            </Enter>
            <Enter delay={0.1} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="card p-6">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                  <MapPin aria-hidden className="size-4" /> Our office
                </h2>
                <address className="mt-4 not-italic text-navy-900">
                  <span className="block text-sm text-muted">California</span>
                  {site.address.street}
                  <br />
                  {site.address.city}, {site.address.region} {site.address.postalCode}
                </address>
              </div>
              <div className="card p-6">
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
                  <Clock aria-hidden className="size-4" /> Open hours
                </h2>
                <dl className="mt-4 space-y-1.5 text-sm">
                  {site.hours.map((h) => (
                    <div key={h.days} className="flex justify-between gap-4">
                      <dt className="text-muted">{h.days}</dt>
                      <dd className="font-semibold text-navy-900">{h.time}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Enter>
            <Enter delay={0.15} className="overflow-hidden rounded-[2rem] border border-line shadow-soft">
              <iframe
                title={`Map of ${site.mapQuery}`}
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="block h-72 w-full grayscale-[0.3]"
              />
            </Enter>
          </div>

          <Enter delay={0.1} className="lg:col-span-7">
            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-lift sm:p-10 lg:sticky lg:top-28">
              <h2 className="display-md">Send us a message</h2>
              <p className="mt-2 text-muted">We respond to most inquiries within 90 minutes during opening hours.</p>
              <div className="mt-8">
                <ContactForm />
              </div>
            </div>
          </Enter>
        </div>
      </section>
    </>
  );
}
