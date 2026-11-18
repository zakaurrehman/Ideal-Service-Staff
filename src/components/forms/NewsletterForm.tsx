"use client";

import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { Honeypot, useInquiryForm, preloadValidation } from "./Fields";

export function NewsletterForm() {
  const { status, errors, message, onSubmit, clearError } = useInquiryForm("newsletter");

  if (status === "success") {
    return (
      <p role="status" className="mt-4 flex items-center gap-2 text-sm font-medium text-teal-300">
        <Check aria-hidden className="size-4" /> Thanks — you’re on the list.
      </p>
    );
  }

  const err = errors.email || (status === "error" ? message : "");
  return (
    <form onFocusCapture={preloadValidation} onSubmit={onSubmit} noValidate className="relative mt-4" aria-labelledby="newsletter-label">
      <Honeypot />
      <div className="flex rounded-full border border-white/15 bg-white/5 p-1.5 focus-within:border-teal-400">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Your email"
          aria-invalid={err ? true : undefined}
          aria-describedby={err ? "newsletter-error" : undefined}
          onChange={() => clearError("email")}
          className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white placeholder:text-navy-300 outline-none"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          aria-label="Subscribe"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-teal-500 text-white transition-colors hover:bg-teal-400"
        >
          {status === "submitting" ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : <ArrowRight aria-hidden className="size-4" />}
        </button>
      </div>
      {err && (
        <p id="newsletter-error" role="alert" className="mt-2 text-xs text-red-300">
          {err}
        </p>
      )}
    </form>
  );
}
