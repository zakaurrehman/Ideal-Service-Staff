/**
 * Transactional email templates. These are the defaults; admins can override
 * subject/body per template (stored in email_templates). Markup:
 *   {{var}}                  → escaped variable
 *   [button:Label]({{url}})  → call-to-action button (own line)
 *   blank line               → new paragraph
 */
import { site, SITE_URL } from "../../content/site";

export type TemplateDef = { name: string; category: string; vars: string[]; subject: string; body: string };

export const TEMPLATES = {
  "auth.verify_email": {
    name: "Welcome & confirm email",
    category: "account",
    vars: ["firstName", "url"],
    subject: "Welcome to Ideal Service Staff — please confirm your email",
    body: "Hi {{firstName}},\n\nThank you for creating your Ideal Service Staff account. Please confirm your email address so we can keep you updated about your bookings and account.\n\n[button:Confirm my email]({{url}})\n\nThis link expires in 24 hours. If you didn’t create an account, you can ignore this email.",
  },
  "auth.password_reset": {
    name: "Password reset",
    category: "account",
    vars: ["firstName", "url"],
    subject: "Reset your Ideal Service Staff password",
    body: "Hi {{firstName}},\n\nWe received a request to reset the password for your account.\n\n[button:Choose a new password]({{url}})\n\nThis link expires in 1 hour and can be used once. If you didn’t ask for a reset, ignore this email — your password stays the same.",
  },
  "auth.password_changed": {
    name: "Password changed",
    category: "account",
    vars: ["firstName"],
    subject: "Your password was changed",
    body: "Hi {{firstName}},\n\nThe password for your Ideal Service Staff account was just changed and your other sessions were signed out.\n\nIf this wasn’t you, reset your password immediately and call us at " + site.phone + ".",
  },
  "auth.staff_invite": {
    name: "Staff invitation",
    category: "account",
    vars: ["firstName", "roleName", "url"],
    subject: "You’ve been invited to the Ideal Service Staff admin",
    body: "Hi {{firstName}},\n\nYou’ve been given {{roleName}} access to the Ideal Service Staff administration platform.\n\n[button:Set your password]({{url}})\n\nThis invitation expires in 72 hours.",
  },
  "booking.submitted": {
    name: "Booking request received (customer)",
    category: "bookings",
    vars: ["firstName", "reference", "service", "when", "url"],
    subject: "We received your booking request {{reference}}",
    body: "Hi {{firstName}},\n\nThank you — your request for {{service}} on {{when}} has been received. Our team will review it and assign a care professional. You’ll be notified as soon as it is confirmed.\n\n[button:View booking]({{url}})",
  },
  "booking.updated": {
    name: "Booking update (customer)",
    category: "bookings",
    vars: ["firstName", "reference", "status", "when", "message", "url"],
    subject: "Booking {{reference}}: {{status}}",
    body: "Hi {{firstName}},\n\nYour booking {{reference}} ({{when}}) is now: {{status}}.\n\n{{message}}\n\n[button:View booking]({{url}})",
  },
  "booking.cancelled": {
    name: "Booking cancelled (customer)",
    category: "bookings",
    vars: ["firstName", "reference", "when", "url"],
    subject: "Booking {{reference}} has been cancelled",
    body: "Hi {{firstName}},\n\nYour booking {{reference}} for {{when}} has been cancelled. If you have any questions or would like to rebook, we’re happy to help.\n\n[button:View booking]({{url}})",
  },
  "booking.assignment": {
    name: "New assignment (employee)",
    category: "bookings",
    vars: ["firstName", "reference", "service", "when", "url"],
    subject: "New assignment offered: {{service}} on {{when}}",
    body: "Hi {{firstName}},\n\nYou’ve been offered an assignment ({{reference}}): {{service}} on {{when}}. Please accept or decline it in your dashboard.\n\n[button:Review assignment]({{url}})",
  },
  "staff.alert": {
    name: "Staff alert",
    category: "staff",
    vars: ["firstName", "title", "body", "url"],
    subject: "{{title}}",
    body: "Hi {{firstName}},\n\n{{body}}\n\n[button:Open in admin]({{url}})",
  },
  "application.received": {
    name: "Application received (applicant)",
    category: "applications",
    vars: ["firstName", "reference"],
    subject: "We received your application {{reference}}",
    body: "Hi {{firstName}},\n\nThank you for applying to join Ideal Service Staff. Your application reference is {{reference}}. Our recruitment team reviews every application and will contact you about next steps.",
  },
  "application.approved": {
    name: "Application approved (applicant)",
    category: "applications",
    vars: ["firstName", "reference", "url"],
    subject: "Next steps for your application {{reference}}",
    body: "Hi {{firstName}},\n\nGood news — your application {{reference}} has been approved to move forward. Please create your employee account so you can complete your profile and upload your documents.\n\n[button:Create employee account]({{url}})",
  },
  "application.rejected": {
    name: "Application not progressed (applicant)",
    category: "applications",
    vars: ["firstName", "reference"],
    subject: "Your application {{reference}}",
    body: "Hi {{firstName}},\n\nThank you for your interest in Ideal Service Staff. After reviewing application {{reference}}, we won’t be moving forward at this time. We appreciate the time you took to apply.",
  },
  "employee.status": {
    name: "Employee verification update",
    category: "account",
    vars: ["firstName", "status", "message", "url"],
    subject: "Your verification status: {{status}}",
    body: "Hi {{firstName}},\n\nYour employee verification status is now: {{status}}.\n\n{{message}}\n\n[button:Open my dashboard]({{url}})",
  },
  "support.reply": {
    name: "Support reply",
    category: "support",
    vars: ["firstName", "reference", "subject", "url"],
    subject: "New reply on {{reference}}: {{subject}}",
    body: "Hi {{firstName}},\n\nOur team replied to your support conversation “{{subject}}”.\n\n[button:Read the reply]({{url}})",
  },
  "support.received": {
    name: "Support request received",
    category: "support",
    vars: ["firstName", "reference", "subject"],
    subject: "We received your message {{reference}}",
    body: "Hi {{firstName}},\n\nThanks for contacting us about “{{subject}}”. Our team will reply in your account’s Help & Support section and by email.",
  },
  announcement: {
    name: "Announcement",
    category: "announcements",
    vars: ["firstName", "title", "body"],
    subject: "{{title}}",
    body: "Hi {{firstName}},\n\n{{body}}",
  },
} satisfies Record<string, TemplateDef>;

export type TemplateKey = keyof typeof TEMPLATES;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fill = (s: string, vars: Record<string, string>, escape: boolean) =>
  s.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => (escape ? esc(vars[k] ?? "") : (vars[k] ?? "")));
const safeUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : "#");

export function renderEmail(tpl: { subject: string; body: string }, vars: Record<string, string>) {
  const subject = fill(tpl.subject, vars, false).replace(/[\r\n]+/g, " ").slice(0, 200);
  const blocks = tpl.body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const text: string[] = [];
  const html: string[] = [];
  for (const block of blocks) {
    const btn = block.match(/^\[button:([^\]]+)\]\(([^)]+)\)$/);
    if (btn) {
      const label = fill(btn[1], vars, false);
      const url = safeUrl(fill(btn[2], vars, false));
      text.push(`${label}: ${url}`);
      html.push(
        `<p style="margin:28px 0"><a href="${esc(url)}" style="display:inline-block;background:#0f695f;color:#ffffff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:999px">${esc(label)}</a></p>`,
      );
      continue;
    }
    const plain = fill(block, vars, false).trim();
    if (!plain) continue;
    text.push(plain);
    html.push(`<p style="margin:0 0 16px;line-height:1.6">${fill(block, vars, true).replace(/\n/g, "<br>")}</p>`);
  }
  const footer = `${site.name} · ${site.address.street}, ${site.address.city}, ${site.address.region} ${site.address.postalCode} · ${site.phone}`;
  return {
    subject,
    text: `${text.join("\n\n")}\n\n—\n${footer}\n${SITE_URL}`,
    html: `<!doctype html><html><body style="margin:0;background:#f3efe7;font-family:Arial,Helvetica,sans-serif;color:#0b1b38">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0b1b38;padding:22px 32px;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:.2px">Ideal Service Staff</td></tr>
<tr><td style="padding:32px;font-size:15px;color:#3e4c63">${html.join("")}</td></tr>
<tr><td style="padding:20px 32px;background:#faf8f4;font-size:12px;color:#5b677d">${esc(footer)}<br><a href="${SITE_URL}" style="color:#0f695f">${esc(SITE_URL.replace(/^https?:\/\//, ""))}</a></td></tr>
</table></td></tr></table></body></html>`,
  };
}
