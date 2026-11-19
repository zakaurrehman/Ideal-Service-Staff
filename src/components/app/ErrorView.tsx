"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

/** Friendly error boundary for the portals — never exposes internal details. */
export function ErrorView({ error, reset, home }: { error: Error & { digest?: string }; reset: () => void; home: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="mx-auto my-16 max-w-lg rounded-3xl border border-line bg-white p-8 text-center shadow-soft">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
        <AlertTriangle aria-hidden className="size-7" />
      </span>
      <h1 className="mt-5 font-display text-2xl font-semibold text-navy-950">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted">
        We couldn’t complete that just now. Please try again — if it keeps happening, call us at (310) 462-1700.
        {error.digest && <span className="mt-2 block font-mono text-xs">Reference: {error.digest}</span>}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-full bg-navy-900 px-5 text-sm font-semibold text-white hover:bg-navy-800">
          <RotateCw aria-hidden className="size-4" /> Try again
        </button>
        <Link href={home} className="inline-flex h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-navy-900 hover:border-navy-300">
          Go back
        </Link>
      </div>
    </div>
  );
}
