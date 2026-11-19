import Link from "next/link";
import { ClipboardCheck, Lock, Phone } from "lucide-react";
import { site } from "@/content/site";
import { JobApplicationForm } from "@/components/forms/JobApplicationForm";
import { Enter } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/Primitives";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Apply for a Position",
  description: "Apply to join Ideal Service Staff as a caregiver, aide, CNA or support professional. A five-step application with secure résumé upload.",
  path: "/careers/apply/",
  image: "/images/caregiver-greeting.webp",
});

export default function ApplyPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Careers", path: "/get-job/" }, { name: "Apply", path: "/careers/apply/" }])} />
      <PageHero
        crumbs={[{ label: "Careers", href: "/get-job/" }, { label: "Apply" }]}
        eyebrow="Join our team"
        title={["Apply for a", { text: "position.", className: "italic text-teal-700" }]}
        lede="Five short steps. Your answers are saved on this device as you go, and your documents are stored privately."
      />
      <section className="pb-24 lg:pb-32">
        <div className="container-x grid gap-10 lg:grid-cols-12">
          <Enter className="lg:col-span-8">
            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-lift sm:p-10 lg:p-12">
              <JobApplicationForm />
            </div>
          </Enter>
          <aside className="space-y-5 lg:col-span-4">
            <Enter delay={0.05} className="card p-7">
              <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <ClipboardCheck aria-hidden className="size-5" />
              </span>
              <p className="mt-5 font-bold text-navy-900">What happens next</p>
              <p className="mt-1 text-sm text-muted">You’ll receive an application reference by email. Our recruitment team reviews every application and contacts you about next steps.</p>
            </Enter>
            <Enter delay={0.1} className="card p-7">
              <span className="grid size-11 place-items-center rounded-xl bg-navy-50 text-navy-700">
                <Lock aria-hidden className="size-5" />
              </span>
              <p className="mt-5 font-bold text-navy-900">Already approved?</p>
              <p className="mt-1 text-sm text-muted">Create your care professional account to complete your profile and upload documents.</p>
              <Link href="/register/?type=employee" className="mt-4 inline-flex text-sm font-semibold text-teal-700 underline underline-offset-4">
                Create employee account →
              </Link>
            </Enter>
            <Enter delay={0.15} className="rounded-[2rem] bg-navy-900 p-8 text-navy-200">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-300">Questions?</p>
              <a href={site.phoneHref} className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-teal-700 px-6 font-semibold text-white hover:bg-teal-800">
                <Phone aria-hidden className="size-4" /> {site.phone}
              </a>
            </Enter>
          </aside>
        </div>
      </section>
    </>
  );
}
