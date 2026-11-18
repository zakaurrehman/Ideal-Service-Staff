"use client";

import { ArrowRight } from "lucide-react";
import { serviceOptions } from "@/lib/forms/options";
import { ErrorBanner, Honeypot, SelectField, SubmitButton, SuccessPanel, TextAreaField, TextField, useInquiryForm, preloadValidation } from "./Fields";

export function ContactForm({ defaultService = "", compact = false }: { defaultService?: string; compact?: boolean }) {
  const { status, errors, message, onSubmit, clearError, reset } = useInquiryForm("contact");

  if (status === "success") {
    return (
      <SuccessPanel title="Thank you — we’ll be in touch." onReset={reset}>
        Your message has reached our care team. We respond to most inquiries within 90 minutes during opening hours.
      </SuccessPanel>
    );
  }

  return (
    <form onFocusCapture={preloadValidation} onSubmit={onSubmit} noValidate className="relative grid gap-5" aria-label="Contact form">
      <Honeypot />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Full name" required autoComplete="name" error={errors.name} onChange={clearError} />
        <TextField name="phone" label="Phone" type="tel" autoComplete="tel" inputMode="tel" error={errors.phone} onChange={clearError} />
      </div>
      <TextField name="email" label="Email" type="email" required autoComplete="email" error={errors.email} onChange={clearError} />
      <SelectField
        name="service"
        label="How can we help?"
        options={serviceOptions}
        defaultValue={defaultService}
        placeholder="Choose a service"
        error={errors.service}
        onChange={clearError}
      />
      <TextAreaField
        name="message"
        label="Message"
        required
        rows={compact ? 4 : 5}
        placeholder="Tell us about the care or staffing you need."
        error={errors.message}
        onChange={clearError}
      />
      {status === "error" && message && <ErrorBanner message={message} />}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted">
          By sending, you agree to our{" "}
          <a href="/privacy-policy/" className="underline hover:text-navy-900">
            Privacy Policy
          </a>
          .
        </p>
        <SubmitButton status={status}>
          Send message <ArrowRight aria-hidden className="size-4 transition-transform group-hover/btn:translate-x-1" />
        </SubmitButton>
      </div>
    </form>
  );
}
