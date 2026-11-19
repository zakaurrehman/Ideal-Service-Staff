import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { retryDueEmails } from "@/lib/email/send";
import { purgeExpiredSessions } from "@/lib/auth/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel Cron (see vercel.json): retries failed emails and purges expired sessions. Requires CRON_SECRET. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  if (!secret || got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isDatabaseConfigured()) return NextResponse.json({ ok: false, error: "database not configured" }, { status: 503 });
  const db = await getDb();
  const emails = await retryDueEmails(db, 50);
  await purgeExpiredSessions(db);
  return NextResponse.json({ ok: true, emails });
}
