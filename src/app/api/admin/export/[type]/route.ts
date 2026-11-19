import { NextResponse, type NextRequest } from "next/server";
import { getViewer, requestMeta } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { REPORTS, buildReport, toCsv } from "@/lib/reports";
import { audit, getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** CSV export — requires reports.export AND the permission for the data set. Every export is audited. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ type: string }> }) {
  const { type } = await ctx.params;
  const report = REPORTS[type];
  const v = await getViewer();
  if (!report || !v || !v.isStaff || !v.permissions.has("reports.export") || !v.permissions.has(report.permission)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const db = await getDb();
  const rows = await buildReport(type, req.nextUrl.searchParams, (await getSettings(db)).timezone);
  if (!rows) return new NextResponse("Not found", { status: 404 });
  await audit(db, { actorId: v.id, action: "report.export", entityType: "report", entityId: type, summary: `Exported ${report.label} CSV (${rows.length} rows)`, metadata: Object.fromEntries(req.nextUrl.searchParams), ip: (await requestMeta()).ip });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + toCsv(rows as Record<string, unknown>[]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ideal-service-staff-${type}-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
