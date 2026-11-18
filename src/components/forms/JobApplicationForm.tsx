"use client";

import Link from "next/link";
import { Send } from "lucide-react";
import type { ReactNode } from "react";
import { certificationOptions, positionOptions } from "@/lib/forms/options";
import {
  CheckboxField,
  ChoiceField,
  ErrorBanner,
  FileField,
  Honeypot,
  SelectField,
  SubmitButton,
  SuccessPanel,
  TextAreaField,
  TextField,
  useInquiryForm,
  preloadValidation,
} from "./Fields";

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section className="grid gap-6 border-t border-line pt-10 first:border-t-0 first:pt-0 lg:grid-cols-[13rem_1fr] lg:gap-10">
      <header>
        <span className="font-display text-sm tabular-nums text-teal-700">{n}</span>
        <h3 className="mt-1 text-lg font-bold text-navy-900">{title}</h3>
      </header>
      <div className="grid gap-6">{children}</div>
    </section>
  );
}

export function JobApplicationForm() {
  const { status, errors, message, onSubmit, clearError, reset } = useInquiryForm("job-application");

  if (status === "success") {
    return (
      <SuccessPanel title="Application received — thank you!" onReset={reset} resetLabel="Submit another application">
        Our recruiting team reviews every application personally. If your experience matches an open role, we’ll contact you to schedule an
        interview — the first step of our 5-step screening process.
      </SuccessPanel>
    );
  }

  return (
    <form onFocusCapture={preloadValidation} onSubmit={onSubmit} noValidate encType="multipart/form-data" className="relative grid gap-10" aria-label="Caregiver employment application">
      <Honeypot />

      <Section n="01" title="About you">
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="firstName" label="First name" required autoComplete="given-name" error={errors.firstName} onChange={clearError} />
          <TextField name="lastName" label="Last name" required autoComplete="family-name" error={errors.lastName} onChange={clearError} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="email" label="Email" type="email" required autoComplete="email" error={errors.email} onChange={clearError} />
          <TextField name="phone" label="Mobile phone" type="tel" required autoComplete="tel" inputMode="tel" error={errors.phone} onChange={clearError} />
        </div>
        <TextField name="city" label="City you live in" required autoComplete="address-level2" error={errors.city} onChange={clearError} />
      </Section>

      <Section n="02" title="The role">
        <ChoiceField name="positions" label="Positions you’re applying for" required multiple columns={2} options={positionOptions} error={errors.positions} onChange={clearError} />
        <ChoiceField
          name="employmentType"
          label="Employment type"
          required
          columns={4}
          error={errors.employmentType}
          onChange={clearError}
          options={[
            { value: "full-time", label: "Full-time" },
            { value: "part-time", label: "Part-time" },
            { value: "per-diem", label: "Per diem" },
            { value: "live-in", label: "Live-in" },
          ]}
        />
        <ChoiceField
          name="availability"
          label="Availability"
          required
          multiple
          columns={4}
          error={errors.availability}
          onChange={clearError}
          options={[
            { value: "weekdays", label: "Weekdays" },
            { value: "weekends", label: "Weekends" },
            { value: "evenings", label: "Evenings" },
            { value: "overnights", label: "Overnights" },
          ]}
        />
      </Section>

      <Section n="03" title="Experience & credentials">
        <SelectField
          name="experience"
          label="Caregiving / healthcare experience"
          required
          error={errors.experience}
          onChange={clearError}
          options={[
            { value: "none", label: "No professional experience yet" },
            { value: "under-1", label: "Less than 1 year" },
            { value: "1-3", label: "1 – 3 years" },
            { value: "3-5", label: "3 – 5 years" },
            { value: "5-plus", label: "5+ years" },
          ]}
        />
        <ChoiceField name="certifications" label="Certifications & registrations" multiple columns={2} options={certificationOptions} error={errors.certifications} onChange={clearError} />
        <div className="grid gap-6 sm:grid-cols-2">
          <ChoiceField
            name="transportation"
            label="Reliable transportation?"
            required
            columns={2}
            error={errors.transportation}
            onChange={clearError}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
          <ChoiceField
            name="workAuthorized"
            label="Authorized to work in the U.S.?"
            required
            columns={2}
            error={errors.workAuthorized}
            onChange={clearError}
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
          />
        </div>
        <FileField
          name="resume"
          label="Résumé"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          error={errors.resume}
          onChange={clearError}
        />
        <TextAreaField
          name="about"
          label="Tell us about yourself"
          rows={5}
          placeholder="Why caregiving? Specialties (dementia, rehabilitation…), languages spoken, anything else."
          error={errors.about}
          onChange={clearError}
        />
      </Section>

      <Section n="04" title="Confirm & submit">
        <CheckboxField name="smsConsent" label="SMS consent" onChange={clearError}>
          I agree to receive SMS messages from Ideal Service Staff about staffing opportunities, job openings and recruitment updates. Message
          frequency varies. Message &amp; data rates may apply. Reply STOP to opt out, HELP for help. See our{" "}
          <Link href="/sms-terms-conditions/" className="font-semibold text-teal-700 underline">
            SMS Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy/" className="font-semibold text-teal-700 underline">
            Privacy Policy
          </Link>
          . Consent is not a condition of employment.
        </CheckboxField>
        <CheckboxField name="attest" label="Attestation" error={errors.attest} onChange={clearError}>
          I confirm the information in this application is accurate and complete, and I understand that employment is subject to
          interviews, background checks (including Live Scan fingerprinting) and skills testing.
          <span className="ml-1 text-teal-600" aria-hidden>
            *
          </span>
        </CheckboxField>
        {status === "error" && message && <ErrorBanner message={message} />}
        <div>
          <SubmitButton status={status} className="w-full sm:w-auto">
            <Send aria-hidden className="size-4" /> Submit application
          </SubmitButton>
        </div>
      </Section>
    </form>
  );
}
