import { careerBenefits, screeningSteps } from "@/content/company";
import { JobApplicationForm } from "@/components/forms/JobApplicationForm";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/Primitives";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { Award, GraduationCap, HeartHandshake, TrendingUp } from "lucide-react";

export const metadata = pageMetadata({
  title: "Careers — Caregiver Employment Application",
  description:
    "Join a team that treats caregiving as the skilled profession it is: specialized training, a 5-level career lattice and meaningful client matches. Apply for PCA, HHA, CNA, companion and support roles.",
  path: "/get-job/",
  image: "/images/careers-handshake.webp",
});

const benefitIcons = [TrendingUp, GraduationCap, Award, HeartHandshake];

export default function GetJobPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Careers", path: "/get-job/" }])} />
      <PageHero
        crumbs={[{ label: "Careers" }]}
        eyebrow="Caregiver employment application"
        title={["Build a career that", { text: "changes lives.", className: "italic text-teal-700" }]}
        lede="We’re leading the charge to recognize non-medical caregiving as the skilled profession it truly is — with training, advancement and the respect you deserve."
        image="/images/careers-handshake.webp"
        imageAlt="A new team member being welcomed with a handshake"
        imagePosition="60% 40%"
      />

      <section className="pb-8">
        <div className="container-x">
          <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {careerBenefits.map((b, i) => {
              const I = benefitIcons[i];
              return (
                <RevealItem key={b.title} className="card p-7">
                  <span className="grid size-12 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                    <I aria-hidden className="size-5" strokeWidth={1.7} />
                  </span>
                  <h2 className="mt-6 text-lg font-bold text-navy-900">{b.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{b.text}</p>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      <section className="section">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          <aside className="lg:col-span-4">
            <div className="space-y-6 lg:sticky lg:top-28">
              <Reveal>
                <p className="eyebrow">Our hiring process</p>
                <h2 className="display-md mt-5">What to expect after you apply.</h2>
              </Reveal>
              <Reveal delay={0.1}>
                <ol className="space-y-4">
                  {screeningSteps.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-teal-200 bg-white font-display text-teal-700">
                        {i + 1}
                      </span>
                      <span>
                        <span className="block font-semibold text-navy-900">{s.title}</span>
                        <span className="block text-sm text-muted">{s.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Reveal>
              <Reveal delay={0.15} className="rounded-[1.5rem] bg-navy-900 p-6 text-sm text-navy-200">
                <p className="font-semibold text-white">Already part of the team?</p>
                <p className="mt-1">Access your schedule and appointments in the employee dashboard.</p>
                <a href="/employee/dashboard/" className="mt-4 inline-flex font-semibold text-teal-300 underline underline-offset-4 hover:text-teal-200">
                  Login to Employee Dashboard →
                </a>
              </Reveal>
            </div>
          </aside>

          <Reveal delay={0.05} className="lg:col-span-8">
            <div className="rounded-[2rem] border border-line bg-white p-6 shadow-lift sm:p-10 lg:p-12">
              <h2 className="display-md">Apply for a position</h2>
              <p className="mt-2 text-muted">Takes about 5 minutes. Fields marked * are required.</p>
              <div className="mt-10">
                <JobApplicationForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
