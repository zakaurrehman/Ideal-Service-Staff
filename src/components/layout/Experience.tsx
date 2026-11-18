"use client";

import Lenis from "lenis";
import { LazyMotion, MotionConfig, m as motion, useMotionValue, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const loadFeatures = () => import("@/components/motion/features").then((r) => r.default);

/**
 * Framer Motion with the lightweight `m` component: animation/gesture/layout
 * features are fetched asynchronously, so they don't block first load.
 * reducedMotion="user" honours the OS "reduce motion" setting everywhere.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Lenis inertial scrolling — disabled for reduced-motion users. */
export function SmoothScroll() {
  const pathname = usePathname();
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const instance = new Lenis({ duration: 1.1, smoothWheel: true, anchors: { offset: -96 } });
    let raf = 0;
    const loop = (t: number) => {
      instance.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    setLenis(instance);
    return () => {
      cancelAnimationFrame(raf);
      instance.destroy();
    };
  }, []);

  // New page → start at the top immediately
  useEffect(() => {
    lenis?.scrollTo(0, { immediate: true });
  }, [pathname, lenis]);

  return null;
}

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-teal-500 via-teal-300 to-gold-400"
      style={{ scaleX }}
    />
  );
}

/** Soft cursor ring that grows over interactive elements. Mouse + motion-OK users only. */
export function CursorRing() {
  const reduce = useReducedMotion();
  const [enabled, setEnabled] = useState(false);
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.5 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.5 });

  useEffect(() => {
    if (reduce || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    setEnabled(true);
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      setVisible(true);
      const t = e.target as HTMLElement | null;
      setActive(!!t?.closest("a, button, [role='button'], input, select, textarea, label"));
    };
    const leave = () => setVisible(false);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [reduce, x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      aria-hidden
      className="cursor-ring pointer-events-none fixed left-0 top-0 z-[80] -translate-x-1/2 -translate-y-1/2 rounded-full border border-teal-500/60"
      style={{ x: sx, y: sy }}
      animate={{
        width: active ? 52 : 26,
        height: active ? 52 : 26,
        opacity: visible ? 1 : 0,
        backgroundColor: active ? "rgba(22,163,142,0.10)" : "rgba(22,163,142,0)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    />
  );
}
