import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Scroll-linked effects built on CSS scroll-driven animations
 * (`animation-timeline: view()`), see globals.css. They run on the compositor
 * with zero JavaScript and never force layout. Browsers without support — and
 * reduced-motion visitors — simply get the static (still beautiful) layout.
 */

/** Image that reveals with a clip-path wipe as it enters, then drifts with scroll. */
export function ParallaxImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  // Rendered ~124% of the box (parallax overscan) — keep sizes generous
  sizes = "(min-width: 1024px) 65vw, 130vw",
  strength = 10,
  position,
  reveal = true,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  sizes?: string;
  strength?: number;
  position?: string;
  reveal?: boolean;
}) {
  const clip = reveal && !priority;
  return (
    <div
      className={cn("relative overflow-hidden", clip && "reveal-clip", className)}
      {...(clip ? { "data-reveal": "", suppressHydrationWarning: true } : {})}
    >
      <div className="parallax-y absolute inset-[-12%]" style={{ "--px": `${strength}%` } as CSSProperties}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={cn("object-cover", imgClassName)}
          style={position ? { objectPosition: position } : undefined}
        />
      </div>
    </div>
  );
}

/** Layer that moves at a different rate while scrolling (depth). */
export function Drift({ children, className, distance = 60 }: { children: ReactNode; className?: string; distance?: number }) {
  return (
    <div className={cn("drift", className)} style={{ "--drift": `${distance}px` } as CSSProperties}>
      {children}
    </div>
  );
}

/** Vertical track + scroll-linked progress line (positioned by className). */
export function ScrollLine({ className }: { className?: string }) {
  return (
    <>
      <span aria-hidden className={cn("absolute w-px bg-line", className)} />
      <span aria-hidden className={cn("scroll-line absolute w-px origin-top bg-gradient-to-b from-teal-500 to-teal-300", className)} />
    </>
  );
}
