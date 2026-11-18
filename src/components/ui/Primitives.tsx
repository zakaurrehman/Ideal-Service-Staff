import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal, SplitReveal } from "@/components/motion/Reveal";
import { ParallaxImage } from "@/components/motion/Parallax";

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group flex items-center gap-3", className)} aria-label="Ideal Service Staff — home">
      <Image
        src="/brand/logo-badge.webp"
        alt=""
        width={48}
        height={48}
        priority
        className="size-11 shrink-0 transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:rotate-[-8deg] sm:size-12"
      />
      <span className="flex flex-col leading-none">
        <span className={cn("whitespace-nowrap font-display text-[1.2rem] tracking-[-0.01em] sm:text-[1.28rem]", light ? "text-white" : "text-navy-900")}>
          Ideal Service Staff
        </span>
        <span className={cn("mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.2em]", light ? "text-teal-200/80" : "text-teal-700")}>
          Care &amp; Support
        </span>
      </span>
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "left",
  light = false,
  className,
  as = "h2",
}: {
  eyebrow?: string;
  title: (string | { text: string; className?: string })[];
  lede?: ReactNode;
  align?: "left" | "center";
  light?: boolean;
  className?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className={cn("max-w-3xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <Reveal y={12}>
          <p className={cn("eyebrow", light && "eyebrow-light", align === "center" && "justify-center")}>{eyebrow}</p>
        </Reveal>
      )}
      <SplitReveal as={as} lines={title} className={cn("display-lg mt-5", light && "text-white")} />
      {lede && (
        <Reveal delay={0.15}>
          <div className={cn("lede mt-6", light && "text-navy-200")}>{lede}</div>
        </Reveal>
      )}
    </div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-navy-800 backdrop-blur",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Interior page hero — editorial headline with an optional restored photograph. */
export function PageHero({
  eyebrow,
  title,
  lede,
  image,
  imageAlt = "",
  imagePosition,
  children,
  crumbs,
}: {
  eyebrow: string;
  title: (string | { text: string; className?: string })[];
  lede?: ReactNode;
  image?: string;
  imageAlt?: string;
  imagePosition?: string;
  children?: ReactNode;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <section className="relative overflow-hidden pb-14 pt-32 sm:pt-40 lg:pb-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 top-0 size-[38rem] rounded-full bg-teal-200/40 blur-3xl animate-blob" />
        <div className="absolute right-[-10rem] top-20 size-[30rem] rounded-full bg-navy-200/40 blur-3xl animate-blob [animation-delay:-6s]" />
        <div className="absolute inset-0 bg-dots [mask-image:linear-gradient(to_bottom,#000,transparent_70%)]" />
      </div>
      <div className="container-x">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="enter mb-8 text-sm text-muted">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="link-underline hover:text-navy-900">
                    Home
                  </Link>
                </li>
                {crumbs.map((c) => (
                  <li key={c.label} className="flex items-center gap-2">
                    <span aria-hidden className="text-line">/</span>
                    {c.href ? (
                      <Link href={c.href} className="link-underline hover:text-navy-900">
                        {c.label}
                      </Link>
                    ) : (
                      <span aria-current="page" className="text-navy-900">
                        {c.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
          </nav>
        )}
        <div className="max-w-4xl">
          <p className="enter eyebrow" style={{ "--d": "0.05s" } as CSSProperties}>
            {eyebrow}
          </p>
          <SplitReveal as="h1" immediate lines={title} className="display-xl mt-6" delay={0.1} />
          {lede && (
            <div className="enter lede mt-7 max-w-2xl" style={{ "--d": "0.3s" } as CSSProperties}>
              {lede}
            </div>
          )}
          {children && (
            <div className="enter mt-9" style={{ "--d": "0.4s" } as CSSProperties}>
              {children}
            </div>
          )}
        </div>
      </div>
      {image && (
        <div className="container-x mt-14 lg:mt-20">
          <HeroBanner src={image} alt={imageAlt} position={imagePosition} />
        </div>
      )}
    </section>
  );
}


function HeroBanner({ src, alt, position }: { src: string; alt: string; position?: string }) {
  return (
    <ParallaxImage
      src={src}
      alt={alt}
      priority
      position={position}
      sizes="(min-width: 1280px) 1600px, 200vw"
      className="aspect-[16/9] w-full rounded-[2rem] shadow-lift sm:aspect-[21/9] lg:rounded-[2.75rem]"
    />
  );
}
