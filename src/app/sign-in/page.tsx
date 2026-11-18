import Image from "next/image";
import { ArrowUpRight, Briefcase, KeyRound, LayoutDashboard, Lock, LogIn, UserPlus, UsersRound } from "lucide-react";
import type { ReactNode } from "react";
import { portal } from "@/content/site";
import { Enter } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/Primitives";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sign In — My Account",
  description: "Sign in to your Ideal Service Staff account, access the customer dashboard, or log in to the employee dashboard.",
  path: "/sign-in/",
});

/**
 * Account hub. Authentication, registration and the dashboards are provided by
 * the existing WordPress install (User Registration + Amelia plugins); these
 * links hand off to it so accounts and sessions keep working unchanged.
 */
function ActionLink({ href, icon, title, text, primary }: { href: string; icon: ReactNode; title: string; text: string; primary?: boolean }) {
  return (
    <a
      href={href}
      className={
        primary
          ? "group flex items-center gap-4 rounded-2xl bg-navy-900 p-5 text-white transition-all duration-300 hover:bg-navy-800 hover:shadow-lift"
          : "group flex items-center gap-4 rounded-2xl border border-line bg-white p-5 transition-all duration-300 hover:border-teal-200 hover:shadow-soft"
      }
    >
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${primary ? "bg-teal-500 text-white" : "bg-teal-50 text-teal-700"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className={`block font-bold ${primary ? "text-white" : "text-navy-900"}`}>{title}</span>
        <span className={`block text-sm ${primary ? "text-navy-200" : "text-muted"}`}>{text}</span>
      </span>
      <ArrowUpRight
        aria-hidden
        className={`size-5 shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 ${primary ? "text-teal-300" : "text-navy-400"}`}
      />
    </a>
  );
}

export default function SignInPage() {
  return (
    <>
      <PageHero
        crumbs={[{ label: "Sign In" }]}
        eyebrow="Login / My Account"
        title={["Welcome back.", { text: "Choose your account.", className: "italic text-teal-700" }]}
        lede="Clients and families manage bookings in the customer dashboard. Care professionals access schedules and appointments in the employee dashboard."
      />

      <section className="pb-24 lg:pb-32">
        <div className="container-x grid gap-6 lg:grid-cols-12">
          <Enter className="lg:col-span-5">
            <div className="h-full rounded-[2rem] border border-line bg-canvas p-7 sm:p-9">
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-teal-800">
                <UsersRound aria-hidden className="size-3.5" /> Clients &amp; families
              </span>
              <h2 className="display-md mt-5">Your care account</h2>
              <div className="mt-8 grid gap-3">
                <ActionLink primary href={portal.signIn} icon={<LogIn aria-hidden className="size-5" />} title="Sign in" text="Username or email and password" />
                <ActionLink href={portal.customerPanel} icon={<LayoutDashboard aria-hidden className="size-5" />} title="Customer Dashboard" text="Appointments and bookings" />
                <ActionLink href={portal.register} icon={<UserPlus aria-hidden className="size-5" />} title="Create an account" text="Not a member yet? Register now" />
                <ActionLink href={portal.lostPassword} icon={<KeyRound aria-hidden className="size-5" />} title="Lost your password?" text="We’ll email you reset instructions" />
              </div>
            </div>
          </Enter>

          <Enter delay={0.1} className="lg:col-span-4">
            <div className="h-full rounded-[2rem] border border-line bg-canvas p-7 sm:p-9">
              <span className="inline-flex items-center gap-2 rounded-full bg-navy-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-navy-800">
                <Briefcase aria-hidden className="size-3.5" /> Care professionals
              </span>
              <h2 className="display-md mt-5">Team access</h2>
              <div className="mt-8 grid gap-3">
                <ActionLink primary href={portal.employeePanel} icon={<LayoutDashboard aria-hidden className="size-5" />} title="Employee Dashboard" text="Schedules and appointments" />
                <ActionLink href="/get-job/" icon={<Briefcase aria-hidden className="size-5" />} title="Apply for a position" text="Join our caregiving team" />
              </div>
            </div>
          </Enter>

          <Enter delay={0.15} className="relative min-h-80 overflow-hidden rounded-[2rem] lg:col-span-3">
            <Image src="/images/caregiver-senior-smile.webp" alt="" fill sizes="(min-width: 1024px) 25vw, 100vw" className="object-cover" />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/90 to-transparent" />
            <p className="absolute inset-x-0 bottom-0 flex items-start gap-3 p-7 text-sm text-white">
              <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-teal-300" />
              Sign-in happens on our secure account portal. Your existing username and password work as before.
            </p>
          </Enter>
        </div>
      </section>
    </>
  );
}
