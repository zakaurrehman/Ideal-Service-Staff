import type { Metadata } from "next";
import { SITE_URL, site } from "@/content/site";

/** Per-page metadata with canonical URL + Open Graph defaults. */
export function pageMetadata({
  title,
  description,
  path,
  image,
  noindex,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  noindex?: boolean;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      type,
      url: path,
      title: `${title} | ${site.name}`,
      description,
      siteName: site.name,
      locale: "en_US",
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: "summary_large_image", title: `${title} | ${site.name}`, description },
  };
}

export const absoluteUrl = (path: string) => `${SITE_URL}${path}`;

/** Organization / LocalBusiness structured data (contact details from the original site). */
export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "HomeHealthCareService"],
    "@id": `${SITE_URL}/#organization`,
    name: site.name,
    alternateName: site.legalName,
    url: SITE_URL,
    logo: absoluteUrl("/brand/logo-badge-full.png"),
    image: absoluteUrl("/images/team-healthcare-staff.webp"),
    description: site.description,
    telephone: "+1-310-462-1700",
    email: site.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      postalCode: site.address.postalCode,
      addressCountry: site.address.country,
    },
    openingHoursSpecification: site.hours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.schema,
      opens: h.opens,
      closes: h.closes,
    })),
    sameAs: Object.values(site.social),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...items].map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
