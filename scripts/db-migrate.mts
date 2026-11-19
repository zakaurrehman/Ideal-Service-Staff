/**
 * Applies migrations in ./drizzle and the idempotent reference data
 * (roles, permissions, original service catalogue).
 *
 *   npm run db:migrate            (uses DATABASE_URL_UNPOOLED / DIRECT_URL / DATABASE_URL)
 *
 * On Vercel this runs before `next build` (see the vercel-build script).
 * Without a database URL it skips with a warning so the public website still deploys.
 */
import path from "node:path";
import { createPglite, createPostgres, migrateDb } from "../src/lib/db/client";
import { seedReferenceData } from "../src/lib/db/seed";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url && process.env.VERCEL) {
  console.warn("\n⚠  No DATABASE_URL — skipping migrations. The public website deploys, but accounts, dashboards and booking stay unavailable until a database is connected (see docs/DEPLOYMENT.md).\n");
  process.exit(0);
}

const started = Date.now();
const db = url ? await createPostgres(url) : await createPglite(process.env.LOCAL_DB_DIR || path.join(process.cwd(), ".data", "pglite"));
console.log(url ? `→ Migrating PostgreSQL (${new URL(url).host})` : "→ Migrating LOCAL development database (PGlite)");
await migrateDb(db, url ? "postgres" : "pglite");
await seedReferenceData(db);
console.log(`✓ Database ready in ${Date.now() - started} ms`);
process.exit(0);
