import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { site } from "@/content/site";
import { ContactForm } from "@/components/forms/ContactForm";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/Primitives";
import { WhatsappIcon } from "@/components/ui/SocialIcons";

export const contactChannels = [
  { Icon: Phone, label: "Call us", value: site.phone, href: site.phoneHref },
  { Icon: WhatsappIcon, label: "WhatsApp", value: "Message or voice note", href: site.whatsappHref },
  { Icon: Mail, label: "Email", value: site.email, href: site.emailHref },
];

export function ContactChannels() {
  return (
    <ul className="grid gap-3">
      {contactChannels.map(({ Icon, label, value, href }) => (
        <li key={label}>
          <a
            href={href}
            {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="group flex items-center gap-4 rounded-2xl border border-line bg-white/70 p-4 transition-all duration-300 hover:border-teal-200 hover:bg-white hover:shadow-soft"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-navy-900 text-white transition-colors group-hover:bg-teal-500">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{label}</span>
              <span className="block truncate font-semibold text-navy-900">{value}</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Section L — "We are Just A Call Away!" with a quick inquiry form. */
export function ContactSection() {
  return (
    <section id="contact" className="cv-auto section relative overflow-hidden">
      <div aria-hidden className="absolute -right-40 top-20 -z-10 size-[40rem] rounded-full bg-teal-100/60 blur-3xl" />
      <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading
            eyebrow="We are just a call away"
            title={["Let’s talk about", { text: "the care you need.", className: "italic text-teal-700" }]}
            lede="Call us for a complimentary, no-obligation consultation. We’ll evaluate your needs and match you with possible caregivers. Meet your caregiver in person or by video call — then start care with confidence and assurance."
          />
          <Reveal delay={0.1} className="mt-10">
            <ContactChannels />
            <div className="mt-6 flex flex-col gap-3 text-sm text-body sm:flex-row sm:gap-8">
              <p className="flex gap-2">
                <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-600" />
                {site.address.street}, {site.address.city}, {site.address.region} {site.address.postalCode}
              </p>
              <p className="flex gap-2">
                <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-600" />
                Open 7 days a week
              </p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="lg:col-span-7">
          <div className="rounded-[2rem] border border-line bg-white p-6 shadow-lift sm:p-10">
            <h3 className="display-md">Send us a message</h3>
            <p className="mt-2 text-sm text-muted">
              Prefer a guided request?{" "}
              <Link href="/get-care/" className="font-semibold text-teal-700 underline">
                Use our care request form
              </Link>
              .
            </p>
            <div className="mt-8">
              <ContactForm compact />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
