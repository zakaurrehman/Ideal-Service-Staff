import "server-only";
import path from "node:path";
import { createPglite, createPostgres, migrateDb, type DB } from "./client";
import { seedReferenceData } from "./seed";

export type { DB, Tx, Queryable } from "./client";
export * as t from "./schema";

/** Thrown when the platform database is not configured (e.g. DATABASE_URL missing in production). */
export class DatabaseUnavailableError extends Error {
  constructor(message = "The platform database is not configured.") {
    super(message);
    this.name = "DatabaseUnavailableError";
  }
}

/**
 * The local embedded database is allowed in development, and in a local
 * production build only when ALLOW_LOCAL_DB=1 (used by the automated tests).
 * It is never used on Vercel.
 */
function localDbAllowed() {
  if (process.env.VERCEL) return false;
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_LOCAL_DB === "1";
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL) || localDbAllowed();
}

const g = globalThis as unknown as { __issDb?: Promise<DB> };

async function init(): Promise<DB> {
  const url = process.env.DATABASE_URL;
  if (url) return createPostgres(url);
  if (!localDbAllowed()) throw new DatabaseUnavailableError("DATABASE_URL is not set.");
  const dir = process.env.LOCAL_DB_DIR || path.join(process.cwd(), ".data", "pglite");
  console.warn(`\n⚠  DATABASE_URL is not set — using the LOCAL DEVELOPMENT database (PGlite) at ${dir}\n`);
  const db = await createPglite(dir);
  await migrateDb(db, "pglite");
  await seedReferenceData(db);
  return db;
}

/** Shared connection (one per server process, survives dev hot reloads). */
export function getDb(): Promise<DB> {
  if (!g.__issDb) {
    g.__issDb = init().catch((err) => {
      g.__issDb = undefined;
      throw err;
    });
  }
  return g.__issDb;
}
