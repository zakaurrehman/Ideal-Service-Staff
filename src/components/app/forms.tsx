"use client";

import { createContext, useActionState, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import type { ActionState } from "@/lib/action-state";
import { cn } from "@/lib/utils";

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;
const Ctx = createContext<{ state: ActionState }>({ state: undefined });
export const useFormState = () => useContext(Ctx).state;

export function ActionForm({ action, children, className, id, onDone }: { action: Action; children: ReactNode; className?: string; id?: string; onDone?: (s: ActionState) => void }) {
  const [state, formAction] = useActionState(action, undefined);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    onDone?.(state);
    // Move focus to the first invalid field for keyboard and screen-reader users.
    if (state?.fields && Object.keys(state.fields).length) {
      const el = document.querySelector<HTMLElement>(`[aria-invalid="true"]`);
      el?.focus();
    }
  }, [state, onDone]);
  return (
    <Ctx value={{ state }}>
      <form id={id} action={formAction} className={className} noValidate>
        {children}
      </form>
    </Ctx>
  );
}

export function FormMessage({ className }: { className?: string }) {
  const state = useFormState();
  if (!state?.error && !state?.message) return null;
  const err = Boolean(state.error);
  return (
    <div
      key={(state.error ?? "") + (state.message ?? "")}
      role={err ? "alert" : "status"}
      className={cn(
        "enter flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm",
        err ? "border-red-200 bg-red-50 text-red-900" : "border-teal-200 bg-teal-50 text-teal-950",
        className,
      )}
    >
      {err ? <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 aria-hidden className="mt-0.5 size-4 shrink-0" />}
      <span>{state.error ?? state.message}</span>
    </div>
  );
}

const inputBase =
  "w-full rounded-2xl border bg-white px-4 text-[15px] text-navy-950 outline-none transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 disabled:cursor-not-allowed disabled:bg-canvas";

type Common = { name: string; label: ReactNode; hint?: ReactNode; required?: boolean; className?: string; defaultValue?: string | number | null; disabled?: boolean };

function useField(name: string, defaultValue?: string | number | null) {
  const state = useFormState();
  const id = useId();
  const error = state?.fields?.[name];
  const value = state?.values?.[name] ?? (defaultValue === null || defaultValue === undefined ? "" : String(defaultValue));
  return { id, error, value, describedBy: error ? `${id}-err` : undefined };
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-navy-900">
      {children}
      {required && (
        <span aria-hidden className="text-teal-700">
          {" "}
          *
        </span>
      )}
    </label>
  );
}
const Err = ({ id, children }: { id: string; children?: string }) =>
  children ? (
    <p id={id} className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-red-700">
      <AlertCircle aria-hidden className="size-3.5 shrink-0" /> {children}
    </p>
  ) : null;
const Hint = ({ children }: { children?: ReactNode }) => (children ? <p className="mt-1.5 text-xs text-muted">{children}</p> : null);

export function Field({
  name,
  label,
  hint,
  required,
  className,
  defaultValue,
  disabled,
  type = "text",
  ...rest
}: Common & { type?: string; autoComplete?: string; placeholder?: string; inputMode?: "text" | "email" | "tel" | "numeric" | "decimal"; accept?: string; min?: string | number; max?: string | number; step?: string | number; maxLength?: number }) {
  const f = useField(name, defaultValue);
  return (
    <div className={className}>
      <Label htmlFor={f.id} required={required}>
        {label}
      </Label>
      <input
        id={f.id}
        name={name}
        type={type}
        defaultValue={f.value}
        required={required}
        disabled={disabled}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.describedBy}
        className={cn(inputBase, "h-12", f.error ? "border-red-400" : "border-line")}
        {...rest}
      />
      <Err id={`${f.id}-err`}>{f.error}</Err>
      <Hint>{hint}</Hint>
    </div>
  );
}

export function TextArea({ name, label, hint, required, className, defaultValue, disabled, rows = 4, placeholder, maxLength }: Common & { rows?: number; placeholder?: string; maxLength?: number }) {
  const f = useField(name, defaultValue);
  return (
    <div className={className}>
      <Label htmlFor={f.id} required={required}>
        {label}
      </Label>
      <textarea
        id={f.id}
        name={name}
        rows={rows}
        defaultValue={f.value}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.describedBy}
        className={cn(inputBase, "py-3 leading-relaxed", f.error ? "border-red-400" : "border-line")}
      />
      <Err id={`${f.id}-err`}>{f.error}</Err>
      <Hint>{hint}</Hint>
    </div>
  );
}

export function Select({ name, label, hint, required, className, defaultValue, disabled, options, placeholder }: Common & { options: { value: string; label: string; disabled?: boolean }[]; placeholder?: string }) {
  const f = useField(name, defaultValue);
  return (
    <div className={className}>
      <Label htmlFor={f.id} required={required}>
        {label}
      </Label>
      <select
        id={f.id}
        name={name}
        defaultValue={f.value}
        required={required}
        disabled={disabled}
        aria-invalid={f.error ? true : undefined}
        aria-describedby={f.describedBy}
        className={cn(inputBase, "h-12 appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 fill=%22none%22 stroke=%22%235b677d%22 stroke-width=%222%22><path d=%22m4 6 4 4 4-4%22/></svg>')] bg-[right_1rem_center] bg-no-repeat pr-10", f.error ? "border-red-400" : "border-line")}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>
      <Err id={`${f.id}-err`}>{f.error}</Err>
      <Hint>{hint}</Hint>
    </div>
  );
}

export function Checkbox({ name, label, hint, defaultChecked, className, value = "on" }: { name: string; label: ReactNode; hint?: ReactNode; defaultChecked?: boolean; className?: string; value?: string }) {
  const state = useFormState();
  const id = useId();
  const error = state?.fields?.[name];
  const echoed = state?.values ? (state.values[name] ?? "").split(",").includes(value) : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm text-navy-900">
        <input
          id={id}
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={echoed ?? defaultChecked}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-line accent-teal-700"
        />
        <span>
          {label}
          {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
        </span>
      </label>
      <Err id={`${id}-err`}>{error}</Err>
    </div>
  );
}

function strength(pw: string) {
  if (!pw) return 0;
  let s = Math.min(2, Math.floor(pw.length / 7));
  s += [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length >= 3 ? 1 : 0;
  s += pw.length >= 14 ? 1 : 0;
  return Math.min(4, s);
}

export function PasswordField({ name, label, hint, required, className, autoComplete = "current-password", meter }: Omit<Common, "defaultValue"> & { autoComplete?: string; meter?: boolean }) {
  const f = useField(name);
  const [show, setShow] = useState(false);
  const [score, setScore] = useState(0);
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];
  return (
    <div className={className}>
      <Label htmlFor={f.id} required={required}>
        {label}
      </Label>
      <div className="relative">
        <input
          id={f.id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={f.error ? true : undefined}
          aria-describedby={[f.describedBy, meter ? `${f.id}-meter` : ""].filter(Boolean).join(" ") || undefined}
          onChange={meter ? (e) => setScore(strength(e.target.value)) : undefined}
          className={cn(inputBase, "h-12 pr-12", f.error ? "border-red-400" : "border-line")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-full text-muted hover:text-navy-900"
          aria-label={show ? "Hide password" : "Show password"}
          aria-pressed={show}
        >
          {show ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        </button>
      </div>
      {meter && (
        <div id={`${f.id}-meter`} className="mt-2" aria-live="polite">
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors duration-300", score >= i ? (score >= 3 ? "bg-teal-500" : "bg-amber-500") : "bg-line")} />
            ))}
          </div>
          <p className="mt-1 text-xs text-muted">Strength: {labels[score]}</p>
        </div>
      )}
      <Err id={`${f.id}-err`}>{f.error}</Err>
      <Hint>{hint}</Hint>
    </div>
  );
}

export function Submit({ children, className, variant = "primary", pendingLabel, name, value }: { children: ReactNode; className?: string; variant?: "primary" | "teal" | "secondary" | "danger"; pendingLabel?: string; name?: string; value?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600",
        variant === "primary" && "bg-navy-900 text-white hover:bg-navy-800",
        variant === "teal" && "bg-teal-700 text-white shadow-glow hover:bg-teal-800",
        variant === "secondary" && "border border-line bg-white text-navy-900 hover:border-navy-300",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className,
      )}
    >
      {pending && <Loader2 aria-hidden className="size-4 animate-spin" />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

/** Small inline button for a bound Server Action, with optional confirmation dialog. */
export function ActionButton({
  action,
  children,
  confirm,
  variant = "secondary",
  className,
  hidden,
}: {
  action: (fd: FormData) => Promise<void> | void;
  children: ReactNode;
  confirm?: { title: string; body?: string; cta?: string };
  variant?: "primary" | "secondary" | "danger" | "teal" | "ghost";
  className?: string;
  hidden?: Record<string, string>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const cls = cn(
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-colors disabled:opacity-60",
    variant === "primary" && "bg-navy-900 text-white hover:bg-navy-800",
    variant === "teal" && "bg-teal-700 text-white hover:bg-teal-800",
    variant === "secondary" && "border border-line bg-white text-navy-900 hover:border-navy-300",
    variant === "danger" && "border border-red-200 bg-white text-red-700 hover:bg-red-50",
    variant === "ghost" && "text-teal-700 hover:bg-teal-50",
    className,
  );
  return (
    <form ref={form} action={action} className="inline">
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {confirm ? (
        <>
          <button type="button" className={cls} onClick={() => dialog.current?.showModal()}>
            {children}
          </button>
          <dialog ref={dialog} className="app-dialog" aria-labelledby={`${confirm.title}-t`} onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
            <div className="p-6">
              <p id={`${confirm.title}-t`} className="text-lg font-bold text-navy-950">
                {confirm.title}
              </p>
              {confirm.body && <p className="mt-2 text-sm text-muted">{confirm.body}</p>}
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" className="h-10 rounded-full border border-line px-4 text-sm font-semibold text-navy-900" onClick={() => dialog.current?.close()}>
                  Cancel
                </button>
                <PendingButton className={cn(cls, "h-10")} onClick={() => setTimeout(() => dialog.current?.close(), 0)}>
                  {confirm.cta ?? "Confirm"}
                </PendingButton>
              </div>
            </div>
          </dialog>
        </>
      ) : (
        <PendingButton className={cls}>{children}</PendingButton>
      )}
    </form>
  );
}

function PendingButton({ children, className, onClick }: { children: ReactNode; className: string; onClick?: () => void }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending || undefined} onClick={onClick}>
      {pending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}
