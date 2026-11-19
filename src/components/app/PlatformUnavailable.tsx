import Link from "next/link";
import { site } from "@/content/site";

/** Shown when the platform database is not configured (never a fake dashboard). */
export function PlatformUnavailable() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-canvas px-5">
      <div className="max-w-lg rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-950">
        <p className="text-xl font-bold">Accounts are temporarily unavailable</p>
        <p className="mt-2">
          Our online platform is being set up. Please call{" "}
          <a href={site.phoneHref} className="font-semibold underline">
            {site.phone}
          </a>{" "}
          or email{" "}
          <a href={site.emailHref} className="font-semibold underline">
            {site.email}
          </a>{" "}
          and our team will help right away.
        </p>
        <Link href="/" className="mt-6 inline-flex font-semibold text-teal-800 underline">
          Back to the website
        </Link>
      </div>
    </main>
  );
}
