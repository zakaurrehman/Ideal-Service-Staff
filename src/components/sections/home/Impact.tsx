import Image from "next/image";
import { TrendingUp } from "lucide-react";
import { impactStories, protocols } from "@/content/company";
import { Counter } from "@/components/motion/Effects";
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/Primitives";

/** Section H — "Real Impact Stories" + evidence-based protocol outcomes (as published on the original site). */
export function Impact() {
  return (
    <section className="cv-auto section relative overflow-hidden">
      <div aria-hidden className="absolute left-1/2 top-40 -z-10 size-[50rem] -translate-x-1/2 rounded-full bg-teal-100/50 blur-3xl" />
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading eyebrow="Our impact" title={["Real stories.", { text: "Measurable outcomes.", className: "italic text-teal-700" }]} />
          <Reveal delay={0.1} className="max-w-sm">
            <p className="text-body">Evidence-based protocols and attentive caregivers — here’s what that looks like in real homes.</p>
          </Reveal>
        </div>

        <RevealGroup className="mt-14 grid gap-6 lg:grid-cols-2">
          {impactStories.map((s) => (
            <RevealItem as="article" key={s.title} className="group overflow-hidden rounded-[2rem] border border-line bg-white shadow-soft">
              <div className="grid sm:grid-cols-5">
                <div className="relative aspect-[4/3] overflow-hidden sm:col-span-2 sm:aspect-auto">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 40vw, 100vw"
                    className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105"
                  />
                </div>
                <div className="p-7 sm:col-span-3 sm:p-8">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Impact story</p>
                  <h3 className="mt-2 font-display text-2xl text-navy-900">{s.title}</h3>
                  <ul className="mt-5 space-y-2.5">
                    {s.actions.map((a) => (
                      <li key={a} className="flex gap-3 text-[0.95rem] text-body">
                        <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-navy-300" />
                        {a}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 flex items-start gap-3 rounded-2xl bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-800">
                    <TrendingUp aria-hidden className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <span className="sr-only">Result: </span>
                      {s.result}
                    </span>
                  </p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>

        <RevealGroup className="mt-6 grid gap-6 md:grid-cols-2">
          {protocols.map((p) => (
            <RevealItem key={p.title} className="relative overflow-hidden rounded-[2rem] bg-navy-900 p-8 text-navy-200 sm:p-10">
              <div aria-hidden className="absolute -right-20 -top-20 size-64 rounded-full bg-teal-500/20 blur-3xl" />
              <div className="relative flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">{p.title}</h3>
                  <ul className="mt-4 space-y-2 text-sm">
                    {p.items.map((it) => (
                      <li key={it}>— {it}</li>
                    ))}
                  </ul>
                </div>
                <p className="shrink-0 sm:text-right">
                  <span className="block font-display text-6xl leading-none text-teal-300">
                    <Counter value={p.result.value} suffix={p.result.suffix} />
                  </span>
                  <span className="mt-2 block max-w-[11rem] text-sm text-navy-200 sm:ml-auto">{p.result.label}</span>
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
