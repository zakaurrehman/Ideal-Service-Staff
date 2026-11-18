import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Magnetic } from "@/components/motion/Effects";

type Variant = "primary" | "accent" | "outline" | "light" | "ghost" | "outline-light";
type Size = "md" | "lg" | "sm";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2.5 overflow-hidden rounded-full font-semibold tracking-[-0.005em] transition-[background-color,color,box-shadow,border-color,transform] duration-300 ease-[var(--ease-out-expo)] disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-navy-900 text-white hover:bg-navy-800 shadow-[0_10px_30px_-12px_rgb(11_27_56/0.6)]",
  accent: "bg-teal-700 text-white hover:bg-teal-800 shadow-glow",
  outline: "border border-navy-900/15 bg-white/60 text-navy-900 backdrop-blur hover:border-navy-900/40 hover:bg-white",
  light: "bg-white text-navy-900 hover:bg-teal-50 shadow-soft",
  "outline-light": "border border-white/25 text-white hover:bg-white/10 hover:border-white/50",
  ghost: "text-navy-900 hover:text-teal-700 px-0!",
};

const sizes: Record<Size, string> = {
  sm: "h-10 px-4 text-sm",
  md: "h-12 px-6 text-[0.95rem]",
  lg: "h-14 px-7 text-base",
};

type Common = {
  variant?: Variant;
  size?: Size;
  arrow?: boolean;
  magnetic?: boolean;
  className?: string;
  children: ReactNode;
};

function Inner({ children, arrow }: { children: ReactNode; arrow?: boolean }) {
  return (
    <>
      <span className="relative z-10">{children}</span>
      {arrow && (
        <span className="relative z-10 -mr-1 grid size-6 place-items-center overflow-hidden rounded-full">
          <ArrowUpRight
            aria-hidden
            className="size-4 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:-translate-y-5 group-hover/btn:translate-x-5"
          />
          <ArrowUpRight
            aria-hidden
            className="absolute size-4 -translate-x-5 translate-y-5 transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/btn:translate-x-0 group-hover/btn:translate-y-0"
          />
        </span>
      )}
    </>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  arrow,
  magnetic,
  className,
  children,
  external,
  ...rest
}: Common & { href: string; external?: boolean } & Omit<ComponentProps<"a">, "href" | "className" | "children">) {
  const cls = cn(base, variants[variant], sizes[size], className);
  const isExternal = external ?? /^(https?:|tel:|mailto:)/.test(href);
  const el = isExternal ? (
    <a href={href} className={cls} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...rest}>
      <Inner arrow={arrow}>{children}</Inner>
    </a>
  ) : (
    <Link href={href} className={cls} {...rest}>
      <Inner arrow={arrow}>{children}</Inner>
    </Link>
  );
  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}

export function Button({
  variant = "primary",
  size = "md",
  arrow,
  className,
  children,
  ...rest
}: Common & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      <Inner arrow={arrow}>{children}</Inner>
    </button>
  );
}
