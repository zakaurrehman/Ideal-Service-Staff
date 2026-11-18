"use client";

import { AnimatePresence, m as motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
import { useRef, useState } from "react";
import { services } from "@/content/services";
import { cn } from "@/lib/utils";
import { ChoiceField, ErrorBanner, Honeypot, SubmitButton, SuccessPanel, TextAreaField, TextField, useInquiryForm, preloadValidation } from "./Fields";

const steps = [
  { title: "Care needs", fields: ["recipient", "organization", "services"] },
  { title: "Schedule & location", fields: ["startTiming", "schedule", "location"] },
  { title: "Your details", fields: ["name", "email", "phone", "preferredContact", "notes"] },
];

/**
 * Three-step care request. All steps stay mounted (only hidden), so a single
 * FormData captures every answer and the same schema validates per-step.
 */
export function CareRequestForm({ preselect }: { preselect?: string }) {
  const { status, errors, message, onSubmit, validate, clearError, reset } = useInquiryForm("care-request");
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [recipient, setRecipient] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const go = async (next: number) => {
    if (next > step && formRef.current && !(await validate(formRef.current, steps[step].fields))) return;
    setDir(next > step ? 1 : -1);
    setStep(next);
    requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  if (status === "success") {
    return (
      <SuccessPanel
        title="Request received — thank you."
        onReset={() => {
          reset();
          setStep(0);
        }}
        resetLabel="Start a new request"
      >
        A care coordinator will contact you shortly — most inquiries receive a response within 90 minutes during opening hours. If care is
        urgent, please call us now.
      </SuccessPanel>
    );
  }

  return (
    <form onFocusCapture={preloadValidation} ref={formRef} onSubmit={onSubmit} noValidate className="relative scroll-mt-32" aria-label="Request care">
      <Honeypot />

      {/* Progress */}
      <div className="mb-10">
        <ol className="grid grid-cols-3 gap-2" aria-label="Form progress">
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
                <span className="hidden sm:inline">{s.title}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <h2 ref={headingRef} tabIndex={-1} className="display-md mb-8 outline-none">
        {["What kind of care is needed?", "When and where?", "How can we reach you?"][step]}
      </h2>

      <div className="relative">
        {steps.map((s, i) => (
          <AnimatePresence key={s.title} initial={false} custom={dir}>
            <motion.div
              className={cn("grid gap-7", i !== step && "hidden")}
              aria-hidden={i !== step}
              initial={false}
              animate={i === step ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 * dir }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              {i === 0 && (
                <>
                  <ChoiceField
                    name="recipient"
                    label="Who is the care for?"
                    required
                    columns={3}
                    error={errors.recipient}
                    onChange={(n) => {
                      clearError(n);
                      const v = (formRef.current?.elements.namedItem("recipient") as RadioNodeList | null)?.value ?? "";
                      setRecipient(v);
                    }}
                    options={[
                      { value: "myself", label: "Myself" },
                      { value: "loved-one", label: "A loved one" },
                      { value: "organization", label: "My organization", description: "Facility or care provider" },
                    ]}
                  />
                  {recipient === "organization" && (
                    <TextField name="organization" label="Organization name" autoComplete="organization" error={errors.organization} onChange={clearError} />
                  )}
                  <ServicesChoice preselect={preselect} error={errors.services} onChange={clearError} />
                </>
              )}
              {i === 1 && (
                <>
                  <ChoiceField
                    name="startTiming"
                    label="When should care start?"
                    required
                    columns={4}
                    error={errors.startTiming}
                    onChange={clearError}
                    options={[
                      { value: "asap", label: "As soon as possible" },
                      { value: "this-week", label: "This week" },
                      { value: "this-month", label: "This month" },
                      { value: "planning", label: "Just planning ahead" },
                    ]}
                  />
                  <ChoiceField
                    name="schedule"
                    label="What schedule do you need?"
                    required
                    columns={3}
                    error={errors.schedule}
                    onChange={clearError}
                    options={[
                      { value: "few-hours", label: "A few hours a week" },
                      { value: "part-time", label: "Part-time" },
                      { value: "full-time", label: "Full-time" },
                      { value: "overnight", label: "Overnight" },
                      { value: "live-in", label: "Live-in" },
                      { value: "not-sure", label: "Not sure yet" },
                    ]}
                  />
                  <TextField
                    name="location"
                    label="City or ZIP code where care is needed"
                    required
                    autoComplete="postal-code"
                    error={errors.location}
                    onChange={clearError}
                  />
                </>
              )}
              {i === 2 && (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <TextField name="name" label="Full name" required autoComplete="name" error={errors.name} onChange={clearError} />
                    <TextField name="phone" label="Phone" type="tel" required autoComplete="tel" inputMode="tel" error={errors.phone} onChange={clearError} />
                  </div>
                  <TextField name="email" label="Email" type="email" required autoComplete="email" error={errors.email} onChange={clearError} />
                  <ChoiceField
                    name="preferredContact"
                    label="Preferred contact method"
                    required
                    columns={3}
                    defaultValue="phone"
                    error={errors.preferredContact}
                    onChange={clearError}
                    options={[
                      { value: "phone", label: "Phone call" },
                      { value: "email", label: "Email" },
                      { value: "whatsapp", label: "WhatsApp" },
                    ]}
                  />
                  <TextAreaField
                    name="notes"
                    label="Anything else we should know?"
                    rows={4}
                    placeholder="Conditions, routines, language preferences, mobility needs…"
                    hint="Please don’t include detailed medical records — we’ll cover health history during your needs assessment."
                    error={errors.notes}
                    onChange={clearError}
                  />
                  {status === "error" && message && <ErrorBanner message={message} />}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        ))}
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-7">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => go(step - 1)}
            className="inline-flex h-12 items-center gap-2 rounded-full px-4 font-semibold text-navy-900 hover:bg-navy-50"
          >
            <ArrowLeft aria-hidden className="size-4" /> Back
          </button>
        ) : (
          <span className="text-sm text-muted">Takes about 2 minutes</span>
        )}
        {step < steps.length - 1 ? (
          <button
            type="button"
            onClick={() => go(step + 1)}
            className="group inline-flex h-14 items-center gap-2.5 rounded-full bg-navy-900 px-8 font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Continue <ArrowRight aria-hidden className="size-4 transition-transform group-hover:translate-x-1" />
          </button>
        ) : (
          <SubmitButton status={status}>
            <Send aria-hidden className="size-4" /> Send request
          </SubmitButton>
        )}
      </div>
    </form>
  );
}

function ServicesChoice({ preselect, error, onChange }: { preselect?: string; error?: string; onChange: (n: string) => void }) {
  const options = [...services.map((s) => ({ value: s.title, label: s.title })), { value: "Not sure yet — please advise", label: "Not sure yet — please advise" }];
  return (
    <fieldset data-field className="min-w-0">
      <legend className="mb-2 block text-sm font-semibold text-navy-900">
        Which services are you interested in?<span className="ml-1 text-teal-600" aria-hidden>*</span>
      </legend>
      <p id="f-services-hint" className="-mt-1 mb-3 text-[0.82rem] text-muted">
        Choose all that apply.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-describedby={error ? "f-services-error f-services-hint" : "f-services-hint"}>
        {options.map((o, i) => (
          <label
            key={o.value}
            className={cn(
              "cursor-pointer rounded-full border bg-white px-4 py-2.5 text-sm font-medium text-navy-900 transition-all duration-200",
              "hover:border-navy-300 has-[:checked]:border-teal-700 has-[:checked]:bg-teal-700 has-[:checked]:text-white",
              "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-teal-500/25",
              error ? "border-red-300" : "border-line",
            )}
          >
            <input
              type="checkbox"
              name="services"
              value={o.value}
              defaultChecked={preselect === o.value}
              onChange={() => onChange("services")}
              className="sr-only"
              {...(i === 0 ? { id: "f-services" } : {})}
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id="f-services-error" role="alert" className="mt-2 text-[0.83rem] font-medium text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}
