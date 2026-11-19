/**
 * Private file storage. Files are NEVER served from a public URL:
 *  • production → Vercel Blob with access: "private" (BLOB_READ_WRITE_TOKEN)
 *  • development / tests → .data/uploads on the local disk
 * Every download goes through /api/files/[id]/, which checks permissions and
 * writes file_access_logs. Types are detected from the file's bytes (not the
 * browser-supplied MIME type), names are random, executables are rejected.
 */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import type { Queryable } from "./db/client";
import { fileAccessLogs, files } from "./db/schema";

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

type Kind = "pdf" | "doc" | "docx" | "jpg" | "png" | "webp";
const MIME: Record<Kind, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const RULES = {
  resume: { maxBytes: 4 * 1024 * 1024, kinds: ["pdf", "doc", "docx"] as Kind[], label: "PDF or Word document" },
  document: { maxBytes: 4 * 1024 * 1024, kinds: ["pdf", "doc", "docx", "jpg", "png", "webp"] as Kind[], label: "PDF, Word document or image" },
  image: { maxBytes: 2 * 1024 * 1024, kinds: ["jpg", "png", "webp"] as Kind[], label: "JPG, PNG or WebP image" },
} as const;
export type RuleName = keyof typeof RULES;
export const acceptFor = (rule: RuleName) => RULES[rule].kinds.map((k) => `.${k === "jpg" ? "jpg,.jpeg" : k}`).join(",");

/** Identify a file by its magic bytes. */
export function sniff(buf: Buffer, declaredName = ""): Kind | null {
  const b = buf;
  if (b.length < 8) return null;
  if (b.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (b[0] === 0x89 && b.subarray(1, 4).toString("latin1") === "PNG") return "png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  if (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "doc";
  // DOCX is a ZIP container that must contain word/document.xml
  if (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) {
    return b.includes(Buffer.from("word/")) || /\.docx$/i.test(declaredName) ? "docx" : null;
  }
  return null;
}

// Development-only folder. The turbopackIgnore hint stops output tracing from bundling the whole project.
const localDir = () => process.env.LOCAL_UPLOAD_DIR || path.join(/* turbopackIgnore: true */ process.cwd(), ".data", "uploads");
const driver = () => {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "vercel-blob" as const;
  if (!process.env.VERCEL && (process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_DB === "1")) return "local" as const;
  return null;
};
export const storageConfigured = () => driver() !== null;

export async function storeFile(db: Queryable, file: File, opts: { purpose: string; ownerUserId: string | null; rule: RuleName }) {
  const rule = RULES[opts.rule];
  if (!(file instanceof File) || file.size === 0) throw new UploadError("Choose a file to upload.");
  if (file.size > rule.maxBytes) throw new UploadError(`Files must be ${Math.round(rule.maxBytes / 1024 / 1024)} MB or smaller.`);
  const d = driver();
  if (!d) throw new UploadError("File uploads are temporarily unavailable. Please email your document to our team.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf, file.name);
  if (!kind || !rule.kinds.includes(kind)) throw new UploadError(`Upload a ${rule.label}.`);

  const now = new Date();
  const key = `${opts.purpose}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}.${kind}`;
  if (d === "vercel-blob") {
    const { put } = await import("@vercel/blob");
    await put(key, buf, { access: "private", contentType: MIME[kind], addRandomSuffix: false });
  } else {
    const target = path.join(localDir(), key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, buf);
  }
  const originalName = (file.name || `upload.${kind}`).replace(/[^\w.\- ()]+/g, "_").slice(0, 150);
  const [row] = await db
    .insert(files)
    .values({ ownerUserId: opts.ownerUserId, driver: d, storageKey: key, purpose: opts.purpose, originalName, contentType: MIME[kind], sizeBytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex") })
    .returning();
  return row;
}

/** Raw bytes of a stored file (authorisation must already have been checked). */
export async function readStoredFile(row: { driver: string; storageKey: string }): Promise<ReadableStream<Uint8Array> | Buffer | null> {
  if (row.driver === "vercel-blob") {
    const { get } = await import("@vercel/blob");
    const res = await get(row.storageKey, { access: "private" });
    return res && res.statusCode === 200 ? res.stream : null;
  }
  if (row.driver === "local") {
    const p = path.join(localDir(), row.storageKey);
    if (!p.startsWith(localDir())) return null;
    return readFile(p).catch(() => null);
  }
  return null;
}

export async function deleteStoredFile(db: Queryable, fileId: string) {
  const [row] = await db.update(files).set({ deletedAt: new Date() }).where(eq(files.id, fileId)).returning();
  if (!row) return;
  try {
    if (row.driver === "vercel-blob") {
      const { del } = await import("@vercel/blob");
      await del(row.storageKey);
    } else if (row.driver === "local") {
      await unlink(path.join(localDir(), row.storageKey));
    }
  } catch (err) {
    console.error("[storage] delete failed", (err as Error).message);
  }
}

export async function logFileAccess(db: Queryable, fileId: string, userId: string | null, action: string, ip: string | null) {
  await db.insert(fileAccessLogs).values({ fileId, userId, action, ip });
}
