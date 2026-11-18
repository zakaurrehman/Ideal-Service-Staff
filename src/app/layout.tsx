import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { SITE_URL, site } from "@/content/site";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CursorRing, MotionProvider, ScrollProgress, SmoothScroll } from "@/components/layout/Experience";
import { Intro, introScript } from "@/components/layout/Intro";
import { revealScript } from "@/components/motion/Reveal";
import { JsonLd, organizationJsonLd } from "@/lib/seo";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  style: ["normal", "italic"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${site.name} | Compassionate Healthcare Staffing & Home Care Support`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  keywords: [
    "healthcare staffing",
    "non-medical home care",
    "caregivers",
    "home health aides",
    "personal care aides",
    "CNA staffing",
    "companion care",
    "respite care",
    "Inglewood",
    "Los Angeles",
    "California",
  ],
  openGraph: { type: "website", siteName: site.name, locale: "en_US", url: "/" },
  twitter: { card: "summary_large_image", site: "@idealservstaff" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#faf8f4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: introScript }} />
        <JsonLd data={organizationJsonLd()} />
        <noscript>
          <style>{"[data-reveal],[data-reveal-item],.split-word{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body>
        <Intro />
        <MotionProvider>
          <SmoothScroll />
          <ScrollProgress />
          <CursorRing />
          <Header />
          <main id="main" tabIndex={-1} className="outline-none">
            {children}
          </main>
          <Footer />
        </MotionProvider>
        <script dangerouslySetInnerHTML={{ __html: revealScript }} />
      </body>
    </html>
  );
}
