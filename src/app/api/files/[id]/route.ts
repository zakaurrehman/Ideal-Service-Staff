import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured, t } from "@/lib/db";
import { getViewer, requestMeta } from "@/lib/auth/session";
import { logFileAccess, readStoredFile } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Authorised file download. Access rules:
 *  • service images            → public (marketing content)
 *  • profile photos             → any signed-in user (shown to clients and staff)
 *  • everything else            → the owner, or staff with documents.view
 *    (job-application files: staff with applications.view)
 * Sensitive downloads are recorded in file_access_logs.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isDatabaseConfigured()) return new NextResponse("Not found", { status: 404 });
  const db = await getDb();
  const [file] = await db.select().from(t.files).where(and(eq(t.files.id, id), isNull(t.files.deletedAt)));
  if (!file) return new NextResponse("Not found", { status: 404 });

  const viewer = file.purpose === "service_image" ? null : await getViewer();
  let allowed = file.purpose === "service_image";
  let sensitive = false;
  if (!allowed && viewer) {
    if (file.purpose === "avatar") allowed = true;
    else {
      sensitive = true;
      const appFile = file.purpose === "application_document";
      allowed =
        file.ownerUserId === viewer.id ||
        viewer.permissions.has("documents.view") ||
        (appFile && viewer.permissions.has("applications.view"));
    }
  }
  // 404 rather than 403 so file ids can't be probed.
  if (!allowed) return new NextResponse("Not found", { status: 404 });

  const body = await readStoredFile(file);
  if (!body) return new NextResponse("File unavailable", { status: 404 });
  if (sensitive) await logFileAccess(db, file.id, viewer?.id ?? null, "download", (await requestMeta()).ip);

  const inline = file.contentType.startsWith("image/") || file.contentType === "application/pdf";
  return new NextResponse(body as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${file.originalName.replace(/"/g, "")}"`,
      "Cache-Control": file.purpose === "service_image" ? "public, max-age=3600" : "private, no-store",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
