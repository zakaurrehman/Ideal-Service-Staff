/**
 * Email delivery with logging + retry. Every attempt is recorded in email_logs.
 *  • RESEND_API_KEY set     → sent through Resend
 *  • not set, development   → status "dev_logged", printed to the console (never "sent")
 *  • not set, production    → status "failed" with a clear error (visible in Admin → Notifications)
 */
import { and, asc, eq, lte, sql } from "drizzle-orm";
import type { Queryable } from "../db/client";
import { emailLogs, emailTemplates } from "../db/schema";
import { TEMPLATES, renderEmail, type TemplateKey } from "./templates";

const MAX_ATTEMPTS = 5;
const BACKOFF_MIN = [5, 30, 120, 720];

export const emailFrom = () => process.env.EMAIL_FROM || process.env.INQUIRY_FROM_EMAIL || "";
const isDev = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_DB === "1";

export async function getTemplate(db: Queryable, key: TemplateKey) {
  const [override] = await db.select().from(emailTemplates).where(eq(emailTemplates.key, key));
  const def = TEMPLATES[key];
  return { subject: override?.subject ?? def.subject, body: override?.body ?? def.body, customised: Boolean(override) };
}

async function deliver(to: string, rendered: { subject: string; html: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (isDev()) {
      console.info(`\n[dev email → ${to}] ${rendered.subject}\n${rendered.text}\n`);
      return { status: "dev_logged" as const };
    }
    return { status: "failed" as const, error: "RESEND_API_KEY is not configured." };
  }
  if (!emailFrom()) return { status: "failed" as const, error: "EMAIL_FROM is not configured." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: emailFrom(), to: [to], subject: rendered.subject, html: rendered.html, text: rendered.text }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { status: "failed" as const, error: `Resend ${res.status}: ${body.message ?? "error"}`.slice(0, 500) };
    return { status: "sent" as const, id: body.id };
  } catch (err) {
    return { status: "failed" as const, error: (err as Error).message.slice(0, 500) };
  }
}

async function attempt(db: Queryable, logId: string, to: string, key: TemplateKey, vars: Record<string, string>, attempts: number) {
  const rendered = renderEmail(await getTemplate(db, key), vars);
  const result = await deliver(to, rendered);
  const n = attempts + 1;
  const retry = result.status === "failed" && n < MAX_ATTEMPTS && Boolean(process.env.RESEND_API_KEY);
  await db
    .update(emailLogs)
    .set({
      status: result.status,
      attempts: n,
      subject: rendered.subject,
      lastError: result.status === "failed" ? result.error : null,
      providerMessageId: result.status === "sent" ? (result.id ?? null) : null,
      sentAt: result.status === "sent" ? new Date() : null,
      nextAttemptAt: retry ? new Date(Date.now() + BACKOFF_MIN[n - 1] * 60_000) : null,
    })
    .where(eq(emailLogs.id, logId));
  return result.status;
}

/** Render + send a template; never throws (failures are logged and retried). */
export async function sendEmail(db: Queryable, opts: { to: string; template: TemplateKey; vars: Record<string, string>; userId?: string | null }) {
  try {
    const [log] = await db
      .insert(emailLogs)
      .values({ toEmail: opts.to, userId: opts.userId ?? null, templateKey: opts.template, subject: TEMPLATES[opts.template].subject, payload: opts.vars })
      .returning({ id: emailLogs.id });
    return await attempt(db, log.id, opts.to, opts.template, opts.vars, 0);
  } catch (err) {
    console.error("[email] could not send", opts.template, (err as Error).message);
    return "failed" as const;
  }
}

/** Retry failed emails whose backoff has elapsed (Vercel Cron + admin "Retry" button). */
export async function retryDueEmails(db: Queryable, limit = 25) {
  const due = await db
    .select()
    .from(emailLogs)
    .where(and(eq(emailLogs.status, "failed"), lte(emailLogs.nextAttemptAt, new Date()), sql`${emailLogs.attempts} < ${MAX_ATTEMPTS}`))
    .orderBy(asc(emailLogs.nextAttemptAt))
    .limit(limit);
  let sent = 0;
  for (const e of due) if ((await attempt(db, e.id, e.toEmail, e.templateKey as TemplateKey, e.payload, e.attempts)) === "sent") sent++;
  return { processed: due.length, sent };
}

export async function retryEmail(db: Queryable, id: string) {
  const [e] = await db.select().from(emailLogs).where(eq(emailLogs.id, id));
  if (!e || e.status === "sent") return null;
  return attempt(db, e.id, e.toEmail, e.templateKey as TemplateKey, e.payload, e.attempts);
}
