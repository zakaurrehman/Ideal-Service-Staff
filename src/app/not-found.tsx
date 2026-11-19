import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { SiteChrome } from "@/components/layout/SiteChrome";

export default function NotFound() {
  return (
    <SiteChrome>
    <section className="relative flex min-h-[80vh] items-center overflow-hidden pt-32">
      <div aria-hidden className="absolute -right-40 top-10 -z-10 size-[36rem] rounded-full bg-teal-200/40 blur-3xl" />
      <div className="container-x">
        <p className="eyebrow">Error 404</p>
        <h1 className="display-xl mt-6 max-w-3xl">
          This page has moved — <span className="italic text-teal-700">we’re still here for you.</span>
        </h1>
        <p className="lede mt-6 max-w-xl">The page you’re looking for doesn’t exist or has a new address. Try one of these instead.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/" variant="primary" arrow>
            Back to home
          </ButtonLink>
          <ButtonLink href="/services/" variant="outline">
            Our services
          </ButtonLink>
          <ButtonLink href="/contact/" variant="outline">
            Contact us
          </ButtonLink>
        </div>
        <p className="mt-10 text-sm text-muted">
          Looking for your account?{" "}
          <Link href="/sign-in/" className="font-semibold text-teal-700 underline">
            Sign in here
          </Link>
          .
        </p>
      </div>
    </section>
    </SiteChrome>
  );
}
