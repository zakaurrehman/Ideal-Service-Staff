import "server-only";
import { formLabels, type FormKind } from "./schema";

/**
 * Delivery integration point for website form submissions.
 *
 * Why this exists: the original WordPress site embedded Forminator forms
 * (#869 contact, #1284 care request, #1293 job application) and an Arrow
 * Forms newsletter (#667), but those plugins are inactive — the live pages
 * print the raw shortcodes, so no submissions currently arrive. This module
 * replaces them with a channel you control:
 *
 *   • RESEND_API_KEY + INQUIRY_TO_EMAIL  → email to the office inbox
 *   • FORMS_WEBHOOK_URL                  → JSON POST to Zapier / Make / CRM / WordPress
 *
 * If neither is configured in production, delivery fails loudly (503) so the
 * visitor is told to call — the site never pretends a message was received.
 */

export type Attachment = { filename: string; contentType: string; base64: string; size: number };

export type Submission = {
  kind: FormKind;
  data: Record<string, unknown>;
  attachment?: Attachment;
  meta: { submittedAt: string; page?: string; userAgent?: string; ip?: string };
};

export type DeliveryResult =
  | { ok: true; channels: string[] }
  | { ok: false; reason: "not_configured" | "delivery_failed"; detail?: string };

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const humanize = (key: string) =>
  key
    .replace(/([A-Z])/g, " $1")
    .replace(/[-_]/g, " ")
    .replace(/^./, (c) => c.toUpperCase());

const valueToText = (v: unknown) => (Array.isArray(v) ? v.join(", ") : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v ?? ""));

function summaryLine(s: Submission) {
  const d = s.data as Record<string, string>;
  const who = d.name || [d.firstName, d.lastName].filter(Boolean).join(" ") || d.email || "Website visitor";
  return `${formLabels[s.kind]} — ${who}`;
}

function renderEmail(s: Submission) {
  const rows = Object.entries(s.data).filter(([, v]) => valueToText(v).trim() !== "");
  const text = [
    summaryLine(s),
    "",
    ...rows.map(([k, v]) => `${humanize(k)}: ${valueToText(v)}`),
    "",
    `Submitted: ${s.meta.submittedAt}`,
    s.meta.page ? `Page: ${s.meta.page}` : "",
  ].join("\n");

  const html = `<!doctype html><html><body style="margin:0;background:#f3efe7;font-family:Arial,Helvetica,sans-serif;color:#0b1b38">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden">
    <tr><td style="background:#0b1b38;padding:24px 28px;color:#fff">
      <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#5cd8c0">Ideal Service Staff · Website</div>
      <div style="font-size:22px;margin-top:6px">${esc(summaryLine(s))}</div>
    </td></tr>
    <tr><td style="padding:12px 28px 28px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${rows
        .map(
          ([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e6e0d5;width:38%;font-size:13px;color:#66738a;vertical-align:top">${esc(humanize(k))}</td>
          <td style="padding:10px 0;border-bottom:1px solid #e6e0d5;font-size:14px;white-space:pre-wrap">${esc(valueToText(v))}</td></tr>`,
        )
        .join("")}
      </table>
      <p style="font-size:12px;color:#66738a;margin-top:20px">Submitted ${esc(s.meta.submittedAt)}${s.meta.page ? ` from ${esc(s.meta.page)}` : ""}${
        s.attachment ? ` · Attachment: ${esc(s.attachment.filename)}` : ""
      }</p>
    </td></tr>
  </table></td></tr></table></body></html>`;

  return { text, html };
}

async function sendResend(s: Submission) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.INQUIRY_TO_EMAIL;
  if (!key || !to) return null;
  const from = process.env.INQUIRY_FROM_EMAIL || "Ideal Service Staff Website <onboarding@resend.dev>";
  const { text, html } = renderEmail(s);
  const replyTo = typeof s.data.email === "string" ? s.data.email : undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: to.split(",").map((x) => x.trim()),
      subject: summaryLine(s),
      text,
      html,
      ...(replyTo ? { reply_to: replyTo } : {}),
      ...(s.attachment ? { attachments: [{ filename: s.attachment.filename, content: s.attachment.base64 }] } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return "email";
}

async function sendWebhook(s: Submission) {
  const url = process.env.FORMS_WEBHOOK_URL;
  if (!url) return null;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.FORMS_WEBHOOK_SECRET ? { "X-Webhook-Secret": process.env.FORMS_WEBHOOK_SECRET } : {}),
    },
    body: JSON.stringify({
      source: "idealservicestaff-website",
      kind: s.kind,
      label: formLabels[s.kind],
      data: s.data,
      attachment: s.attachment ?? null,
      meta: s.meta,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Webhook ${res.status}`);
  return "webhook";
}

export async function deliver(s: Submission): Promise<DeliveryResult> {
  const configured = Boolean((process.env.RESEND_API_KEY && process.env.INQUIRY_TO_EMAIL) || process.env.FORMS_WEBHOOK_URL);

  if (!configured) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `\n[forms] No delivery channel configured — logging ${s.kind} submission locally.\n` +
          `        Set RESEND_API_KEY + INQUIRY_TO_EMAIL or FORMS_WEBHOOK_URL (see .env.example).\n`,
        { ...s.data, attachment: s.attachment ? `${s.attachment.filename} (${s.attachment.size} bytes)` : undefined },
      );
      return { ok: true, channels: ["dev-log"] };
    }
    return { ok: false, reason: "not_configured" };
  }

  const results = await Promise.allSettled([sendResend(s), sendWebhook(s)]);
  const channels = results.flatMap((r) => (r.status === "fulfilled" && r.value ? [r.value] : []));
  const errors = results.flatMap((r) => (r.status === "rejected" ? [String(r.reason)] : []));
  if (errors.length) console.error("[forms] delivery error", errors);

  return channels.length ? { ok: true, channels } : { ok: false, reason: "delivery_failed", detail: errors.join("; ") };
}
