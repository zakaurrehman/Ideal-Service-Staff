import Link from "next/link";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { footerNav, site } from "@/content/site";
import { services } from "@/content/services";
import { Logo } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";
import { FacebookIcon, LinkedinIcon, XIcon } from "@/components/ui/SocialIcons";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { Reveal, SplitReveal } from "@/components/motion/Reveal";

const footerServices = services.filter((s) =>
  ["administrative-support", "medical-nursing-assistants", "mental-health-services", "personal-assistants", "diagnostic-services", "nurses-and-cnas", "therapy-and-respite-care"].includes(s.slug),
);

function FooterCol({ title, links }: { title: string; links: { label: string; href: string; external?: boolean }[] }) {
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">{title}</h3>
      <ul className="mt-5 space-y-3">
        {links.map((l) => (
          <li key={l.href + l.label}>
            {l.external ? (
              <a href={l.href} className="link-underline text-[0.95rem] text-navy-200 transition-colors hover:text-white">
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="link-underline text-[0.95rem] text-navy-200 transition-colors hover:text-white">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const socials = [
    { href: site.social.facebook, label: "Facebook", Icon: FacebookIcon },
    { href: site.social.linkedin, label: "LinkedIn", Icon: LinkedinIcon },
    { href: site.social.x, label: "X (Twitter)", Icon: XIcon },
  ];

  return (
    <footer className="cv-auto grain relative overflow-hidden bg-navy-950 text-navy-200">
      <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-teal-500/20 blur-3xl" />

      {/* Closing CTA */}
      <div className="container-x relative pt-24 lg:pt-32">
        <div className="flex flex-col items-start justify-between gap-10 border-b border-white/10 pb-16 lg:flex-row lg:items-end lg:pb-24">
          <div className="max-w-3xl">
            <Reveal>
              <p className="eyebrow eyebrow-light">We are just a call away</p>
            </Reveal>
            <SplitReveal
              lines={["Care that feels like", { text: "family begins here.", className: "italic text-teal-300" }]}
              className="display-xl mt-6 text-white"
            />
          </div>
          <Reveal delay={0.2} className="flex flex-wrap gap-3">
            <ButtonLink href="/get-care/" variant="accent" size="lg" arrow magnetic>
              Request Care
            </ButtonLink>
            <ButtonLink href={site.phoneHref} variant="outline-light" size="lg">
              <Phone aria-hidden className="mr-1 inline size-4" />
              {site.phone}
            </ButtonLink>
          </Reveal>
        </div>
      </div>

      <div className="container-x relative grid gap-14 py-16 lg:grid-cols-12 lg:py-20">
        <div className="lg:col-span-4">
          <Logo light />
          <p className="mt-6 max-w-sm text-[0.95rem] leading-relaxed text-navy-300">
            Compassionate, qualified non-medical healthcare professionals for families, individuals and care organizations —
            matched with care, screened with rigor.
          </p>
          <div className="mt-8">
            <p id="newsletter-label" className="text-sm font-semibold text-white">
              Newsletter
            </p>
            <p className="mt-1 text-sm text-navy-300">Care tips, company news and updates.</p>
            <NewsletterForm />
          </div>
          <ul className="mt-8 flex gap-3" aria-label="Social media">
            {socials.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Ideal Service Staff on ${label}`}
                  className="grid size-11 place-items-center rounded-full border border-white/15 text-white transition-all duration-300 hover:-translate-y-0.5 hover:border-teal-400 hover:bg-teal-500"
                >
                  <Icon className="size-[1.05rem]" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-[1fr_0.8fr_0.95fr_1.4fr]">
          <FooterCol title="Services" links={footerServices.map((s) => ({ label: s.title.replace(/ \(.*\)/, ""), href: `/services/${s.slug}/` }))} />
          <FooterCol title="Company" links={footerNav.company} />
          <FooterCol title="Care & Accounts" links={footerNav.care} />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Contact</h3>
            <address className="mt-5 space-y-4 text-[0.95rem] not-italic">
              <p className="flex gap-3">
                <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-teal-300" />
                <span>
                  {site.address.street}
                  <br />
                  {site.address.city}, {site.address.region} {site.address.postalCode}
                </span>
              </p>
              <a href={site.phoneHref} className="flex gap-3 hover:text-white">
                <Phone aria-hidden className="mt-1 size-4 shrink-0 text-teal-300" />
                {site.phone}
              </a>
              <a href={site.emailHref} className="flex gap-3 text-[0.9rem] hover:text-white [overflow-wrap:anywhere]">
                <Mail aria-hidden className="mt-1 size-4 shrink-0 text-teal-300" />
                {site.email}
              </a>
              <div className="flex gap-3">
                <Clock aria-hidden className="mt-1 size-4 shrink-0 text-teal-300" />
                <ul className="space-y-1 text-sm">
                  {site.hours.map((h) => (
                    <li key={h.days}>
                      <span className="text-white">{h.days}:</span> {h.time}
                    </li>
                  ))}
                </ul>
              </div>
            </address>
          </div>
        </div>
      </div>

      <div className="container-x relative flex flex-col gap-4 border-t border-white/10 py-8 text-sm text-navy-300 lg:flex-row lg:items-center lg:justify-between">
        <p>
          © {year} {site.legalName}. All rights reserved.
        </p>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          {footerNav.legal.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="link-underline hover:text-white">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
