import { NextResponse, type NextRequest } from "next/server";
import { deliver, type Attachment } from "@/lib/forms/deliver";
import { SubmissionError, persistSubmission } from "@/lib/forms/persist";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { rateLimit } from "@/lib/auth/core";
import {
  RESUME_MAX_BYTES,
  RESUME_TYPES,
  flattenErrors,
  formDataToObject,
  schemas,
  type FormKind,
} from "@/lib/forms/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ── Lightweight abuse protection ───────────────────────────────────────────
   In-memory sliding window per IP (per server instance). For multi-region
   deployments, swap for a shared store such as Upstash Redis. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

const json = (body: unknown, status = 200) => NextResponse.json(body, { status });

export async function POST(req: NextRequest) {
  // Same-origin check (blocks cross-site form posting)
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && new URL(origin).host !== host) {
    return json({ ok: false, error: "Invalid origin." }, 403);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const limited = isDatabaseConfigured()
    ? !(await rateLimit(await getDb(), `inquiry:${ip}`, MAX_PER_WINDOW, WINDOW_MS / 1000)).ok // shared across instances
    : rateLimited(ip);
  if (limited) {
    return json({ ok: false, error: "Too many submissions. Please call us at (310) 462-1700." }, 429);
  }

  let fd: FormData;
  try {
    fd = await req.formData();
  } catch {
    return json({ ok: false, error: "Invalid submission." }, 400);
  }

  const kind = String(fd.get("kind") ?? "") as FormKind;
  const schema = schemas[kind];
  if (!schema) return json({ ok: false, error: "Unknown form." }, 400);

  // Honeypot + minimum fill time: quietly accept bots without delivering
  const startedAt = Number(fd.get("started_at") ?? 0);
  if (String(fd.get("company_website") ?? "") !== "" || (startedAt && Date.now() - startedAt < 2500)) {
    return json({ ok: true });
  }

  const parsed = schema.safeParse(formDataToObject(fd));
  if (!parsed.success) {
    return json({ ok: false, error: "Please correct the highlighted fields.", fields: flattenErrors(parsed.error) }, 422);
  }

  let attachment: Attachment | undefined;
  if (kind === "job-application") {
    const file = fd.get("resume");
    if (file instanceof File && file.size > 0) {
      if (file.size > RESUME_MAX_BYTES) return json({ ok: false, fields: { resume: "Résumé must be 4 MB or smaller." } }, 422);
      if (!RESUME_TYPES.includes(file.type)) return json({ ok: false, fields: { resume: "Upload a PDF or Word document." } }, 422);
      attachment = {
        filename: file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 120),
        contentType: file.type,
        size: file.size,
        base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
      };
    }
  }

  const meta = {
    submittedAt: new Date().toISOString(),
    page: req.headers.get("referer") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
    ip,
  };

  // 1. The platform database is the system of record: success only after it commits.
  if (isDatabaseConfigured()) {
    let reference: string;
    try {
      ({ reference } = await persistSubmission(kind, parsed.data as Record<string, unknown>, fd));
    } catch (err) {
      if (err instanceof SubmissionError) {
        return json({ ok: false, error: err.message, ...(err.field ? { fields: { [err.field]: err.message } } : {}) }, err.status);
      }
      console.error("[inquiry] persist failed", err);
      return json({ ok: false, error: "We couldn’t save your request just now. Please try again, or call (310) 462-1700." }, 500);
    }
    // 2. Optional copy to the office inbox / webhook — best effort, never blocks success.
    await deliver({ kind, data: { reference, ...(parsed.data as Record<string, unknown>) }, attachment, meta }).catch(() => undefined);
    return json({ ok: true, reference });
  }

  // No database (e.g. before launch): delivery channel is required.
  const result = await deliver({ kind, data: parsed.data as Record<string, unknown>, attachment, meta });

  if (!result.ok) {
    return json(
      {
        ok: false,
        error:
          result.reason === "not_configured"
            ? "Online requests are temporarily unavailable. Please call (310) 462-1700 or email Info@idealservicestaff.com."
            : "We couldn’t send your request just now. Please try again, or call (310) 462-1700.",
      },
      result.reason === "not_configured" ? 503 : 502,
    );
  }

  return json({ ok: true });
}
