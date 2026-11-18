"use client";

import { AnimatePresence, m as motion } from "framer-motion";
import { AlertCircle, Check, CircleCheck, FileText, LoaderCircle, Phone, Upload, X } from "lucide-react";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FieldErrors, FormKind } from "@/lib/forms/options";
import { site } from "@/content/site";

/** Validation (zod) is code-split: fetched on first interaction, not on page load. */
const loadSchemas = () => import("@/lib/forms/schema");
export const preloadValidation = () => void loadSchemas();

/* ─── Submission hook ──────────────────────────────────────────────────── */

export type Status = "idle" | "submitting" | "success" | "error";

export function useInquiryForm(kind: FormKind) {
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState("");
  const startedAt = useRef(Date.now());

  const focusFirstError = (form: HTMLFormElement, errs: FieldErrors) => {
    const first = Object.keys(errs)[0];
    const el = form.querySelector<HTMLElement>(`[name="${first}"]`);
    el?.focus({ preventScroll: true });
    el?.closest("[data-field]")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /** Validate a subset of fields (multi-step forms). Returns true when valid. */
  const validate = useCallback(
    async (form: HTMLFormElement, fields?: string[]) => {
      const { schemas, formDataToObject, flattenErrors } = await loadSchemas();
      const result = schemas[kind].safeParse(formDataToObject(new FormData(form)));
      let errs = result.success ? {} : flattenErrors(result.error);
      if (fields) errs = Object.fromEntries(Object.entries(errs).filter(([k]) => fields.includes(k)));
      setErrors((prev) => {
        const next = { ...prev };
        for (const f of fields ?? Object.keys(prev)) delete next[f];
        return { ...next, ...errs };
      });
      if (Object.keys(errs).length) {
        focusFirstError(form, errs);
        return false;
      }
      return true;
    },
    [kind],
  );

  const clearError = useCallback((name: string) => {
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      if (!(await validate(form))) return;

      const fd = new FormData(form);
      fd.set("kind", kind);
      fd.set("started_at", String(startedAt.current));
      setStatus("submitting");
      setMessage("");
      try {
        const res = await fetch("/api/inquiry/", { method: "POST", body: fd });
        const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: FieldErrors };
        if (res.ok && body.ok) {
          setStatus("success");
          form.reset();
          return;
        }
        if (body.fields) {
          setErrors(body.fields);
          focusFirstError(form, body.fields);
        }
        setMessage(body.error ?? "Something went wrong. Please try again.");
        setStatus("error");
      } catch {
        setMessage(`We couldn’t reach the server. Please check your connection or call ${site.phone}.`);
        setStatus("error");
      }
    },
    [kind, validate],
  );

  const reset = () => {
    setStatus("idle");
    setErrors({});
    setMessage("");
    startedAt.current = Date.now();
  };

  return { status, errors, message, onSubmit, validate, clearError, reset };
}

/** Hidden anti-spam field. Real users never see or fill it. */
export function Honeypot() {
  return (
    <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Company website
        <input type="text" name="company_website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/* ─── Field primitives ─────────────────────────────────────────────────── */

const inputBase =
  "block w-full rounded-2xl border bg-white px-4 py-3.5 text-[0.98rem] text-navy-950 placeholder:text-muted/70 transition-[border-color,box-shadow] duration-200 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15";

const inputState = (error?: string) => (error ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "border-line hover:border-navy-300");

type FieldProps = {
  name: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  onChange?: (name: string) => void;
};

function FieldShell({
  id,
  label,
  error,
  hint,
  required,
  className,
  children,
  as = "div",
}: {
  id: string;
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
  as?: "div" | "fieldset";
}) {
  const Label = as === "fieldset" ? "legend" : "label";
  const Wrapper = as;
  return (
    <Wrapper className={cn("min-w-0", className)} data-field>
      <Label {...(as === "div" ? { htmlFor: id } : {})} className="mb-2 block text-sm font-semibold text-navy-900">
        {label}
        {required ? (
          <span className="ml-1 text-teal-600" aria-hidden>
            *
          </span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-muted">(optional)</span>
        )}
      </Label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-1 mb-2 text-[0.82rem] text-muted">
          {hint}
        </p>
      )}
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 flex items-center gap-1.5 text-[0.83rem] font-medium text-red-600"
          >
            <AlertCircle aria-hidden className="size-4 shrink-0" />
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </Wrapper>
  );
}

const describedBy = (id: string, error?: string, hint?: ReactNode) =>
  [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;

export function TextField({
  name,
  label,
  error,
  hint,
  required,
  className,
  onChange,
  type = "text",
  autoComplete,
  placeholder,
  inputMode,
  min,
}: FieldProps & {
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: string;
}) {
  const id = `f-${name}`;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        min={min}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={() => onChange?.(name)}
        className={cn(inputBase, inputState(error))}
      />
    </FieldShell>
  );
}

export function TextAreaField({ name, label, error, hint, required, className, onChange, placeholder, rows = 5 }: FieldProps & { placeholder?: string; rows?: number }) {
  const id = `f-${name}`;
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <textarea
        id={id}
        name={name}
        rows={rows}
        placeholder={placeholder}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        onChange={() => onChange?.(name)}
        className={cn(inputBase, inputState(error), "resize-y")}
      />
    </FieldShell>
  );
}

export function SelectField({
  name,
  label,
  error,
  hint,
  required,
  className,
  onChange,
  options,
  placeholder = "Select…",
  defaultValue = "",
}: FieldProps & { options: { value: string; label: string }[] | string[]; placeholder?: string; defaultValue?: string }) {
  const id = `f-${name}`;
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  return (
    <FieldShell id={id} label={label} error={error} hint={hint} required={required} className={className}>
      <div className="relative">
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          onChange={() => onChange?.(name)}
          className={cn(inputBase, inputState(error), "appearance-none pr-11")}
        >
          <option value="">{placeholder}</option>
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg aria-hidden viewBox="0 0 20 20" className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted" fill="currentColor">
          <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
        </svg>
      </div>
    </FieldShell>
  );
}

/** Radio / checkbox group rendered as tappable cards (≥44px targets). */
export function ChoiceField({
  name,
  label,
  error,
  hint,
  required,
  className,
  onChange,
  options,
  multiple = false,
  columns = 2,
  defaultValue,
}: FieldProps & {
  options: { value: string; label: string; description?: string }[] | string[];
  multiple?: boolean;
  columns?: 1 | 2 | 3 | 4;
  defaultValue?: string;
}) {
  const id = `f-${name}`;
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const cols = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];
  return (
    <FieldShell id={id} as="fieldset" label={label} error={error} hint={hint} required={required} className={className}>
      <div
        className={cn("grid gap-2.5", cols)}
        role={multiple ? "group" : "radiogroup"}
        aria-describedby={describedBy(id, error, hint)}
        aria-invalid={error ? true : undefined}
      >
        {opts.map((o, i) => (
          <label
            key={o.value}
            className={cn(
              "group/choice relative flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border bg-white px-4 py-3 transition-all duration-200",
              "hover:border-navy-300 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/70 has-[:checked]:shadow-[0_0_0_3px_rgb(22_163_142/0.12)]",
              "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-teal-500/20",
              error ? "border-red-300" : "border-line",
            )}
          >
            <input
              type={multiple ? "checkbox" : "radio"}
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
              onChange={() => onChange?.(name)}
              className="peer sr-only"
              {...(i === 0 ? { id } : {})}
            />
            <span
              aria-hidden
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center border border-navy-300 bg-white text-white transition-colors peer-checked:border-teal-500 peer-checked:bg-teal-500",
                multiple ? "rounded-md" : "rounded-full",
              )}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
            <span className="flex flex-col">
              <span className="text-[0.95rem] font-medium leading-snug text-navy-900">{o.label}</span>
              {o.description && <span className="mt-0.5 text-[0.8rem] text-muted">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
    </FieldShell>
  );
}

export function CheckboxField({ name, label, error, onChange, children }: FieldProps & { children?: ReactNode }) {
  const id = `f-${name}`;
  return (
    <div data-field>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-body">
        <input
          id={id}
          type="checkbox"
          name={name}
          onChange={() => onChange?.(name)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-navy-300 accent-teal-600"
        />
        <span>{children ?? label}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 flex items-center gap-1.5 text-[0.83rem] font-medium text-red-600">
          <AlertCircle aria-hidden className="size-4" />
          {error}
        </p>
      )}
    </div>
  );
}

export function FileField({ name, label, error, hint, onChange, accept }: FieldProps & { accept: string }) {
  const id = `f-${name}`;
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <label
        htmlFor={id}
        className={cn(
          "flex min-h-24 cursor-pointer items-center gap-4 rounded-2xl border border-dashed bg-white px-5 py-4 transition-colors hover:border-teal-500 hover:bg-teal-50/40",
          "has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-teal-500/20",
          error ? "border-red-400" : "border-navy-200",
        )}
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
          {file ? <FileText aria-hidden className="size-5" /> : <Upload aria-hidden className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-navy-900">{file ? file.name : "Upload your résumé"}</span>
          <span className="block text-xs text-muted">
            {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF or Word · up to 5 MB"}
          </span>
        </span>
        {file && (
          <button
            type="button"
            aria-label="Remove file"
            onClick={(e) => {
              e.preventDefault();
              if (inputRef.current) inputRef.current.value = "";
              setFile(null);
              onChange?.(name);
            }}
            className="grid size-9 place-items-center rounded-full text-muted hover:bg-navy-50 hover:text-navy-900"
          >
            <X aria-hidden className="size-4" />
          </button>
        )}
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept={accept}
          className="sr-only"
          aria-describedby={describedBy(id, error, hint)}
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            onChange?.(name);
          }}
        />
      </label>
    </FieldShell>
  );
}

/* ─── Feedback ─────────────────────────────────────────────────────────── */

export function SubmitButton({ status, children, className }: { status: Status; children: ReactNode; className?: string }) {
  const busy = status === "submitting";
  return (
    <button
      type="submit"
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "group/btn inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-teal-700 px-8 text-base font-semibold text-white shadow-glow transition-all duration-300 hover:bg-teal-800 active:scale-[0.98] disabled:opacity-70",
        className,
      )}
    >
      {busy ? (
        <>
          <LoaderCircle aria-hidden className="size-5 animate-spin" /> Sending…
        </>
      ) : (
        children
      )}
    </button>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <motion.div
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 text-sm text-red-800"
    >
      <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0" />
      <p>
        {message}{" "}
        <a href={site.phoneHref} className="font-semibold underline">
          Call {site.phone}
        </a>
      </p>
    </motion.div>
  );
}

export function SuccessPanel({ title, children, onReset, resetLabel = "Send another" }: { title: string; children: ReactNode; onReset?: () => void; resetLabel?: string }) {
  return (
    <motion.div
      role="status"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center px-4 py-10 text-center"
    >
      <span className="relative grid size-20 place-items-center">
        <span className="absolute inset-0 rounded-full bg-teal-400/30 animate-pulse-ring" />
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.15 }}
          className="relative grid size-20 place-items-center rounded-full bg-teal-500 text-white shadow-glow"
        >
          <CircleCheck aria-hidden className="size-10" strokeWidth={1.6} />
        </motion.span>
      </span>
      <h3 className="display-md mt-7">{title}</h3>
      <div className="mt-3 max-w-md text-body">{children}</div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a href={site.phoneHref} className="inline-flex h-12 items-center gap-2 rounded-full bg-navy-900 px-6 font-semibold text-white hover:bg-navy-800">
          <Phone aria-hidden className="size-4" /> {site.phone}
        </a>
        {onReset && (
          <button type="button" onClick={onReset} className="inline-flex h-12 items-center rounded-full border border-line px-6 font-semibold text-navy-900 hover:bg-white">
            {resetLabel}
          </button>
        )}
      </div>
    </motion.div>
  );
}
