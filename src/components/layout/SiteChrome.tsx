import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CursorRing, MotionProvider, ScrollProgress, SmoothScroll } from "@/components/layout/Experience";
import { Intro } from "@/components/layout/Intro";
import { revealScript } from "@/components/motion/Reveal";
import { getContent } from "@/lib/content";

/** Marketing-site chrome: intro curtain, smooth scroll, header, footer, reveal observer. */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const notice = await getContent("announcement");
  return (
    <>
      {notice.enabled && notice.text && (
        <p role="status" className="relative z-[60] bg-teal-800 px-4 py-2 text-center text-sm font-medium text-white">
          {notice.text}{" "}
          {notice.href && (
            <a href={notice.href} className="font-semibold underline underline-offset-2">
              Learn more
            </a>
          )}
        </p>
      )}
      <Intro />
      <MotionProvider>
        <SmoothScroll />
        <ScrollProgress />
        <CursorRing />
        <Header />
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <Footer />
      </MotionProvider>
      <script dangerouslySetInnerHTML={{ __html: revealScript }} />
    </>
  );
}
