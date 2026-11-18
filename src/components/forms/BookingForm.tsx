"use client";

import { CalendarCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { serviceOptions } from "@/lib/forms/options";
import { ChoiceField, ErrorBanner, Honeypot, SelectField, SubmitButton, SuccessPanel, TextAreaField, TextField, useInquiryForm, preloadValidation } from "./Fields";

export function BookingForm() {
  const { status, errors, message, onSubmit, clearError, reset } = useInquiryForm("booking");
  // Local "today" for the date picker minimum (computed client-side to match the visitor's timezone)
  const [today, setToday] = useState<string>();
  useEffect(() => {
    const d = new Date();
    setToday(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10));
  }, []);

  if (status === "success") {
    return (
      <SuccessPanel title="Your consultation request is in." onReset={reset} resetLabel="Book another">
        We’ll call or email to confirm a time that works. Consultations are complimentary and carry no obligation.
      </SuccessPanel>
    );
  }

  return (
    <form onFocusCapture={preloadValidation} onSubmit={onSubmit} noValidate className="relative grid gap-6" aria-label="Consultation booking form">
      <Honeypot />
      <ChoiceField
        name="consultationType"
        label="Consultation type"
        required
        columns={3}
        error={errors.consultationType}
        onChange={clearError}
        options={[
          { value: "phone", label: "Phone call", description: "Quick and convenient" },
          { value: "video", label: "Video call", description: "Meet face to face, remotely" },
          { value: "in-home", label: "In-home visit", description: "Includes home safety review" },
        ]}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="preferredDate" label="Preferred date" type="date" min={today} required error={errors.preferredDate} onChange={clearError} />
        <SelectField
          name="preferredTime"
          label="Preferred time"
          required
          error={errors.preferredTime}
          onChange={clearError}
          options={[
            { value: "morning", label: "Morning (8 AM – 12 PM)" },
            { value: "afternoon", label: "Afternoon (12 – 4 PM)" },
            { value: "evening", label: "Evening (4 – 8 PM)" },
          ]}
        />
      </div>
      <SelectField name="service" label="Service of interest" options={serviceOptions} error={errors.service} onChange={clearError} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="name" label="Full name" required autoComplete="name" error={errors.name} onChange={clearError} />
        <TextField name="phone" label="Phone" type="tel" required autoComplete="tel" inputMode="tel" error={errors.phone} onChange={clearError} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField name="email" label="Email" type="email" required autoComplete="email" error={errors.email} onChange={clearError} />
        <TextField name="location" label="City or ZIP code" autoComplete="postal-code" error={errors.location} onChange={clearError} />
      </div>
      <TextAreaField name="notes" label="Anything we should know?" rows={4} error={errors.notes} onChange={clearError} />
      {status === "error" && message && <ErrorBanner message={message} />}
      <SubmitButton status={status} className="w-full sm:w-auto">
        <CalendarCheck aria-hidden className="size-5" /> Request consultation
      </SubmitButton>
      <p className="text-xs text-muted">
        This is a request — our team confirms every appointment personally by phone or email.
      </p>
    </form>
  );
}
