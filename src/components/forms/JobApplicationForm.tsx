"use client";

import Link from "next/link";
import { m as motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pencil, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { certificationOptions, positionOptions } from "@/lib/forms/options";
import { cn } from "@/lib/utils";
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

/**
 * Four-step employment application. Every step stays mounted (only hidden),
 * so one FormData — including the résumé file — is submitted at the end, and
 * the shared schema validates each step before moving on.
 */
const steps = [
  { title: "About you", fields: ["firstName", "lastName", "email", "phone", "city"] },
  { title: "The role", fields: ["positions", "employmentType", "availability"] },
  { title: "Experience", fields: ["experience", "certifications", "transportation", "workAuthorized", "resume", "about"] },
  { title: "Review & submit", fields: ["smsConsent", "attest"] },
];

const labels: Record<string, string> = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  "per-diem": "Per diem",
  "live-in": "Live-in",
  none: "No professional experience yet",
  "under-1": "Less than 1 year",
  "1-3": "1 – 3 years",
  "3-5": "3 – 5 years",
  "5-plus": "5+ years",
  yes: "Yes",
  no: "No",
  weekdays: "Weekdays",
  weekends: "Weekends",
  evenings: "Evenings",
  overnights: "Overnights",
};

type Summary = { step: number; rows: { label: string; value: string }[] }[];

function buildSummary(form: HTMLFormElement): Summary {
  const fd = new FormData(form);
  const v = (k: string) => String(fd.get(k) ?? "").trim();
  const all = (k: string) => fd.getAll(k).map((x) => labels[String(x)] ?? String(x)).join(", ");
  const file = fd.get("resume");
  return [
    {
      step: 0,
      rows: [
        { label: "Name", value: `${v("firstName")} ${v("lastName")}`.trim() },
        { label: "Email", value: v("email") },
        { label: "Phone", value: v("phone") },
        { label: "City", value: v("city") },
      ],
    },
    {
      step: 1,
      rows: [
        { label: "Positions", value: all("positions") },
        { label: "Employment type", value: labels[v("employmentType")] ?? v("employmentType") },
        { label: "Availability", value: all("availability") },
      ],
    },
    {
      step: 2,
      rows: [
        { label: "Experience", value: labels[v("experience")] ?? v("experience") },
        { label: "Certifications", value: all("certifications") || "None listed" },
        { label: "Transportation", value: labels[v("transportation")] ?? "" },
        { label: "Authorized to work", value: labels[v("workAuthorized")] ?? "" },
        { label: "Résumé", value: file instanceof File && file.size ? file.name : "Not attached" },
      ],
    },
  ];
}

export function JobApplicationForm() {
  const { status, errors, message, onSubmit, validate, clearError, reset } = useInquiryForm("job-application");
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState<Summary>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const focusStep = () =>
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

  const go = async (next: number) => {
    if (next > step && formRef.current && !(await validate(formRef.current, steps[step].fields))) return;
    if (next === steps.length - 1 && formRef.current) setSummary(buildSummary(formRef.current));
    setStep(next);
    focusStep();
  };

  // Server-side errors (e.g. résumé type) → jump to the step that owns the field
  useEffect(() => {
    const first = Object.keys(errors)[0];
    if (!first || status !== "error") return;
    const owner = steps.findIndex((s) => s.fields.includes(first));
    if (owner >= 0 && owner !== step) {
      setStep(owner);
      focusStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors, status]);

  if (status === "success") {
    return (
      <SuccessPanel
        title="Application received — thank you!"
        onReset={() => {
          reset();
          setStep(0);
        }}
        resetLabel="Submit another application"
      >
        Our recruiting team reviews every application personally. If your experience matches an open role, we’ll contact you to schedule an
        interview — the first step of our 5-step screening process.
      </SuccessPanel>
    );
  }

  const last = step === steps.length - 1;

  return (
    <form
      ref={formRef}
      onFocusCapture={preloadValidation}
      onSubmit={onSubmit}
      onKeyDown={(e) => {
        // Enter in a text field advances the step instead of submitting early
        if (e.key === "Enter" && !last && e.target instanceof HTMLInputElement) {
          e.preventDefault();
          void go(step + 1);
        }
      }}
      noValidate
      encType="multipart/form-data"
      className="relative scroll-mt-32"
      aria-label="Caregiver employment application"
    >
      <Honeypot />

      {/* Progress */}
      <ol className="mb-10 grid grid-cols-4 gap-2" aria-label="Application progress">
        {steps.map((s, i) => (
          <li key={s.title} className="flex flex-col gap-3">
            <span className="relative h-1.5 overflow-hidden rounded-full bg-navy-100">
              <motion.span
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-teal-500 to-teal-300"
                initial={false}
                animate={{ width: i <= step ? "100%" : "0%" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              />
            </span>
            <span className={cn("text-xs font-semibold sm:text-sm", i === step ? "text-navy-900" : "text-muted")} aria-current={i === step ? "step" : undefined}>
              <span className="mr-1.5 tabular-nums text-teal-700">0{i + 1}</span>
              <span className="hidden md:inline">{s.title}</span>
            </span>
          </li>
        ))}
      </ol>

      <h3 ref={headingRef} tabIndex={-1} className="display-md mb-8 outline-none">
        {["Tell us about yourself", "Which role are you looking for?", "Your experience & credentials", "Review and submit"][step]}
      </h3>

      {/* Step 1 */}
      <div className={cn("grid gap-6", step !== 0 && "hidden")}>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="firstName" label="First name" required autoComplete="given-name" error={errors.firstName} onChange={clearError} />
          <TextField name="lastName" label="Last name" required autoComplete="family-name" error={errors.lastName} onChange={clearError} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField name="email" label="Email" type="email" required autoComplete="email" error={errors.email} onChange={clearError} />
          <TextField name="phone" label="Mobile phone" type="tel" required autoComplete="tel" inputMode="tel" error={errors.phone} onChange={clearError} />
        </div>
        <TextField name="city" label="City you live in" required autoComplete="address-level2" error={errors.city} onChange={clearError} />
      </div>

      {/* Step 2 */}
      <div className={cn("grid gap-7", step !== 1 && "hidden")}>
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
      </div>

      {/* Step 3 */}
      <div className={cn("grid gap-7", step !== 2 && "hidden")}>
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
      </div>

      {/* Step 4 — review */}
      <div className={cn("grid gap-7", !last && "hidden")}>
        <div className="divide-y divide-line overflow-hidden rounded-[1.5rem] border border-line">
          {summary.map((group) => (
            <div key={group.step} className="bg-canvas/50 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">{steps[group.step].title}</p>
                <button
                  type="button"
                  onClick={() => {
                    setStep(group.step);
                    focusStep();
                  }}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-navy-900 hover:bg-white"
                >
                  <Pencil aria-hidden className="size-3.5" /> Edit<span className="sr-only"> {steps[group.step].title}</span>
                </button>
              </div>
              <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                {group.rows.map((r) => (
                  <div key={r.label} className="min-w-0">
                    <dt className="text-xs text-muted">{r.label}</dt>
                    <dd className="truncate text-sm font-medium text-navy-900">{r.value || "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>

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
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-7">
        {step > 0 ? (
          <button type="button" onClick={() => go(step - 1)} className="inline-flex h-12 items-center gap-2 rounded-full px-4 font-semibold text-navy-900 hover:bg-navy-50">
            <ArrowLeft aria-hidden className="size-4" /> Back
          </button>
        ) : (
          <span className="text-sm text-muted">Takes about 5 minutes</span>
        )}
        {last ? (
          <SubmitButton status={status}>
            <Send aria-hidden className="size-4" /> Submit application
          </SubmitButton>
        ) : (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className="group inline-flex h-14 items-center gap-2.5 rounded-full bg-navy-900 px-8 font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Continue <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
          </button>
        )}
      </div>
    </form>
  );
}
