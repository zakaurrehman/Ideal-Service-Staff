import Image from "next/image";
import { Globe2, HeartHandshake } from "lucide-react";
import { affiliation } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/Primitives";

/** Affiliation with Hospitals Without Walls® (confirmed by Ideal Service Staff). */
export function Affiliation() {
  return (
    <section id="affiliation" aria-label="Our affiliation with Hospitals Without Walls" className="cv-auto section relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-40 top-1/3 -z-10 size-[30rem] rounded-full bg-teal-100/60 blur-3xl" />
      <div className="container-x grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-5">
          <SectionHeading
            eyebrow="Our network"
            title={["Proudly affiliated with", { text: affiliation.name, className: "italic text-teal-700" }]}
            lede={`Ideal Service Staff is a proud affiliate of ${affiliation.name}® — ${affiliation.tagline.toLowerCase()}.`}
          />
          <ul className="mt-8 space-y-4 text-[0.97rem] text-body">
            <li className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <Globe2 aria-hidden className="size-5" strokeWidth={1.7} />
              </span>
              <span className="self-center">Part of a global network of healthcare providers.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <HeartHandshake aria-hidden className="size-5" strokeWidth={1.7} />
              </span>
              <span className="self-center">A shared focus on patient-centered care.</span>
            </li>
          </ul>
        </Reveal>
        <Reveal delay={0.1} className="lg:col-span-7">
          <figure className="relative rounded-[2rem] border border-line bg-white p-3 shadow-lift sm:p-4">
            <Image
              src={affiliation.image}
              alt={`Ideal Select Care and Support Service Staff — proudly affiliated with ${affiliation.name}®, ${affiliation.tagline}`}
              width={1536}
              height={1024}
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="h-auto w-full rounded-[1.5rem]"
            />
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
