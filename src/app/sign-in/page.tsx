import type { CSSProperties } from "react";
import Image from "next/image";
import { Briefcase, HeartHandshake, KeyRound, LayoutDashboard, Lock, LogIn, Stethoscope, UserPlus, UsersRound } from "lucide-react";
import { portal, portalIsSeparate } from "@/content/site";
import { getPortalStatus } from "@/lib/portal";
import { ActionRow, PortalStatusCard, SupportStrip } from "@/components/portal/Portal";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

/** Account gateway — re-checks portal status every 5 minutes. */
export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Sign In — Client & Staff Portal",
  description: "Access your Ideal Service Staff account, customer dashboard or employee dashboard.",
  path: "/sign-in/",
  noindex: true,
});

const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

export default async function SignInPage() {
  const status = await getPortalStatus();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Sign In", path: "/sign-in/" }])} />
      <section className="relative overflow-hidden pb-20 pt-28 sm:pt-32 lg:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -right-40 top-10 size-[38rem] rounded-full bg-teal-200/40 blur-3xl animate-blob" />
          <div className="absolute -left-40 bottom-0 size-[30rem] rounded-full bg-navy-200/40 blur-3xl animate-blob [animation-delay:-8s]" />
          <div className="absolute inset-0 bg-dots [mask-image:linear-gradient(to_bottom,#000,transparent_60%)]" />
        </div>

        <div className="container-x grid gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Brand panel */}
          <aside className="enter grain relative isolate overflow-hidden rounded-[2.25rem] bg-navy-950 p-7 text-navy-200 sm:p-10 lg:col-span-5" style={d(0)}>
            <Image src="/images/caregiver-senior-smile.webp" alt="" fill sizes="(min-width: 1024px) 40vw, 100vw" className="-z-20 object-cover object-[60%_30%] opacity-70" priority />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-navy-950 via-navy-950/90 to-navy-950/25" />
            <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-72 rounded-full bg-teal-500/25 blur-3xl" />

            <p className="eyebrow eyebrow-light">Client &amp; staff portal</p>
            <h1 className="display-lg mt-5 text-white">
              Welcome to Your <span className="italic text-teal-300">Ideal Service Staff</span> Portal
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-navy-200">
              Access your account, manage your services, and stay connected with the Ideal Service Staff team.
            </p>

            <div className="mt-8">
              <PortalStatusCard status={status} light />
            </div>

            <p className="mt-6 flex items-start gap-3 text-sm text-navy-300">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-300" />
              <span>
                Sign-in happens on our secure account portal. Your existing username and password work as before — we never ask for your password
                anywhere else.
              </span>
            </p>
          </aside>

          {/* Action panels */}
          <div className="grid gap-6 lg:col-span-7">
            <section aria-labelledby="clients-heading" className="enter rounded-[2.25rem] border border-line bg-canvas p-6 shadow-soft sm:p-8" style={d(0.12)}>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <UsersRound aria-hidden className="size-5" />
                </span>
                <div>
                  <h2 id="clients-heading" className="text-xl font-bold text-navy-900">
                    Clients &amp; Families
                  </h2>
                  <p className="text-sm text-muted">Manage care for yourself or a loved one.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <ActionRow
                  primary
                  external
                  href={portal.signIn}
                  icon={<LogIn aria-hidden className="size-5" />}
                  title="Client Sign In"
                  description="Sign in with your username or email and password."
                />
                <ActionRow
                  href="/customer-panel/"
                  icon={<LayoutDashboard aria-hidden className="size-5" />}
                  title="Customer Dashboard"
                  description="View and manage your appointments and bookings."
                  status={status.customerPanel}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ActionRow
                    external
                    href={portal.register}
                    icon={<UserPlus aria-hidden className="size-5" />}
                    title="Create an Account"
                    description="New here? Register in under a minute."
                  />
                  <ActionRow
                    external
                    href={portal.lostPassword}
                    icon={<KeyRound aria-hidden className="size-5" />}
                    title="Forgot Password"
                    description="Get reset instructions by email."
                  />
                </div>
              </div>
            </section>

            <section aria-labelledby="staff-heading" className="enter rounded-[2.25rem] border border-line bg-canvas p-6 shadow-soft sm:p-8" style={d(0.24)}>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-navy-50 text-navy-800">
                  <Stethoscope aria-hidden className="size-5" />
                </span>
                <div>
                  <h2 id="staff-heading" className="text-xl font-bold text-navy-900">
                    Care Professionals &amp; Employees
                  </h2>
                  <p className="text-sm text-muted">Your schedule, assignments and career with us.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3">
                <ActionRow
                  href="/employee-panel/"
                  icon={<LayoutDashboard aria-hidden className="size-5" />}
                  title="Employee Dashboard"
                  description="Your assigned appointments and schedule."
                  status={status.employeePanel}
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ActionRow
                    external
                    href={portal.signIn}
                    icon={<HeartHandshake aria-hidden className="size-5" />}
                    title="Employee Sign In"
                    description="Sign in with your employee username and password."
                  />
                  <ActionRow
                    href="/get-job/"
                    icon={<Briefcase aria-hidden className="size-5" />}
                    title="Apply for a Position"
                    description="Join our caregiving team."
                  />
                </div>
                <p className="px-1 text-sm text-muted">
                  New team member without a login yet?{" "}
                  <a href="/contact/" className="font-semibold text-teal-700 underline underline-offset-2">
                    Contact our team
                  </a>
                  .
                </p>
              </div>
            </section>

            <div className="enter" style={d(0.36)}>
              <SupportStrip />
            </div>

            {!portalIsSeparate && process.env.NODE_ENV === "development" && (
              <p role="note" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <strong>Development note:</strong> NEXT_PUBLIC_PORTAL_URL shares this site&rsquo;s origin, so account links point to {portal.origin}. Set it to the
                WordPress portal subdomain before launch.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
