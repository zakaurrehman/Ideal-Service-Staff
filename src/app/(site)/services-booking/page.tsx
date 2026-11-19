import Link from "next/link";
import { ArrowRight, CalendarCheck, LayoutDashboard, Phone } from "lucide-react";
import { site } from "@/content/site";
import { BookingForm } from "@/components/forms/BookingForm";
import { Enter } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/Primitives";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Services Booking — Book a Free Consultation",
  description:
    "Request a complimentary, no-obligation care consultation by phone, video call or in-home visit. Choose a day and time and our team will confirm.",
  path: "/services-booking/",
  image: "/images/home-visit-tablet.webp",
});

export default function ServicesBookingPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Services Booking", path: "/services-booking/" }])} />
      <PageHero
        crumbs={[{ label: "Services Booking" }]}
        eyebrow="Booking care services"
        title={["Book a complimentary", { text: "care consultation.", className: "italic text-teal-700" }]}
        lede="Choose how and when you’d like to talk. We’ll evaluate your needs, answer your questions and outline possible caregiver matches — with no obligation."
      />

      <section className="pb-24 lg:pb-32">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <Enter className="lg:col-span-8">
            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-lift sm:p-10 lg:p-12">
              <h2 className="display-md flex items-center gap-3">
                <CalendarCheck aria-hidden className="size-7 text-teal-600" /> Request a time
              </h2>
              <div className="mt-8">
                <BookingForm />
              </div>
            </div>
          </Enter>

          <aside className="space-y-5 lg:col-span-4">
            <Enter delay={0.05} className="rounded-[2rem] bg-teal-700 p-8 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-100">Book online</p>
              <p className="mt-3 font-display text-2xl">Choose a service, date and time in your account — we’ll confirm a care professional.</p>
              <Link
                href="/customer/book/"
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 font-semibold text-teal-800 transition-colors hover:bg-teal-50"
              >
                Book a service online <ArrowRight aria-hidden className="size-4" />
              </Link>
            </Enter>
            <Enter delay={0.1} className="rounded-[2rem] bg-navy-900 p-8 text-navy-200">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Prefer to call?</p>
              <p className="mt-3 font-display text-2xl text-white">Book in one call — we’ll take it from there.</p>
              <a
                href={site.phoneHref}
                className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-teal-700 px-6 font-semibold text-white transition-colors hover:bg-teal-800"
              >
                <Phone aria-hidden className="size-4" /> {site.phone}
              </a>
              <dl className="mt-8 space-y-1.5 border-t border-white/10 pt-6 text-sm">
                {site.hours.map((h) => (
                  <div key={h.days} className="flex justify-between gap-4">
                    <dt>{h.days}</dt>
                    <dd className="font-semibold text-white">{h.time}</dd>
                  </div>
                ))}
              </dl>
            </Enter>
            <Enter delay={0.15} className="card p-7">
              <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <LayoutDashboard aria-hidden className="size-5" />
              </span>
              <p className="mt-5 font-bold text-navy-900">Existing client?</p>
              <p className="mt-1 text-sm text-muted">View and manage your appointments in your customer dashboard.</p>
              <Link href="/customer/dashboard/" className="mt-4 inline-flex text-sm font-semibold text-teal-700 underline underline-offset-4">
                Go to Customer Dashboard →
              </Link>
            </Enter>
          </aside>
        </div>
      </section>
    </>
  );
}
