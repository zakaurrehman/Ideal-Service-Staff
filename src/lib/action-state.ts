/** Shape returned by every form Server Action (used with React's useActionState). */
export type ActionState =
  | {
      ok?: boolean;
      message?: string;
      error?: string;
      fields?: Record<string, string>;
      /** Echoed (non-secret) values so the form can be re-filled after React resets it. */
      values?: Record<string, string>;
      /** Arbitrary success payload, e.g. a generated booking reference. */
      data?: Record<string, unknown>;
    }
  | undefined;

/** Flatten zod issues into { field: message } (first message per field). */
export function zodFields(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const i of error.issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}

/** Non-secret string values of a FormData, for re-filling forms. */
export function echo(fd: FormData, omit: string[] = []) {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string" || omit.includes(k) || /password/i.test(k) || k.startsWith("$ACTION")) continue;
    out[k] = out[k] ? `${out[k]},${v}` : v;
  }
  return out;
}

export const fdString = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
