import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Phone, ShieldCheck } from "lucide-react";
import { site } from "@/content/site";
import { isDatabaseConfigured } from "@/lib/db";

/** Split-screen layout for sign-in, registration and password recovery. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-root min-h-dvh bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="grain relative isolate hidden overflow-hidden bg-navy-950 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Image src="/images/caregiver-senior-smile.webp" alt="" fill sizes="45vw" priority className="-z-20 object-cover object-[60%_30%] opacity-60" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950 via-navy-950/85 to-navy-950/30" />
        <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-teal-500/25 blur-3xl" />
        <Link href="/" className="enter flex items-center gap-3 text-white" style={{ ["--d" as string]: "0s" }}>
          <Image src="/brand/logo-badge.webp" alt="" width={44} height={44} className="rounded-xl" />
          <span className="text-lg font-bold">{site.name}</span>
        </Link>
        <div className="enter max-w-md" style={{ ["--d" as string]: "0.1s" }}>
          <p className="eyebrow eyebrow-light">Client &amp; staff portal</p>
          <h2 className="display-lg mt-5 text-white">
            Care, coordinated <span className="italic text-teal-300">in one place.</span>
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-navy-200">Book and manage care, follow your appointments, and stay connected with the Ideal Service Staff team.</p>
        </div>
        <p className="enter flex items-center gap-2 text-sm text-navy-300" style={{ ["--d" as string]: "0.2s" }}>
          <ShieldCheck aria-hidden className="size-4 text-teal-300" /> Encrypted connection · Your data is only visible to you and our authorised staff.
        </p>
      </aside>

      <div className="flex min-h-dvh flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-teal-700">
            <ArrowLeft aria-hidden className="size-4" /> Back to website
          </Link>
          <a href={site.phoneHref} className="inline-flex items-center gap-2 text-sm font-semibold text-navy-800 hover:text-teal-700">
            <Phone aria-hidden className="size-4" /> {site.phone}
          </a>
        </div>
        <main id="main" className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {isDatabaseConfigured() ? (
            children
          ) : (
            <div role="status" className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
              <p className="text-lg font-bold">Online accounts are being set up</p>
              <p className="mt-2 text-sm">
                Sign-in and registration will be available shortly. In the meantime our team is happy to help by phone at{" "}
                <a className="font-semibold underline" href={site.phoneHref}>
                  {site.phone}
                </a>{" "}
                or email at{" "}
                <a className="font-semibold underline" href={site.emailHref}>
                  {site.email}
                </a>
                .
              </p>
            </div>
          )}
        </main>
        <p className="text-center text-xs text-muted">
          © {new Date().getFullYear()} {site.name} ·{" "}
          <Link href="/privacy-policy/" className="hover:underline">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms-and-conditions/" className="hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
