/**
 * Database connection factory — no `server-only` import so CLI scripts and
 * tests can use it. App code must import from "@/lib/db" instead.
 *
 *  • DATABASE_URL set  → PostgreSQL (Neon in production) via node-postgres
 *  • otherwise         → PGlite (embedded Postgres 17, development/tests only)
 */
import path from "node:path";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];
/** Anything that can run queries: the db or an open transaction. */
export type Queryable = DB | Tx;
export type Driver = "postgres" | "pglite";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

export async function createPostgres(url: string): Promise<DB> {
  const { Pool } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const pool = new Pool({ connectionString: url, max: Number(process.env.DATABASE_POOL_MAX ?? 5), idleTimeoutMillis: 10_000 });
  pool.on("error", (err) => console.error("[db] idle client error", err.message));
  return drizzle(pool, { schema });
}

/** `dataDir` undefined → in-memory database (tests). */
export async function createPglite(dataDir?: string): Promise<DB> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist");
  const { drizzle } = await import("drizzle-orm/pglite");
  if (dataDir) (await import("node:fs")).mkdirSync(dataDir, { recursive: true });
  const client = new PGlite({ dataDir, extensions: { btree_gist } });
  await client.waitReady;
  return drizzle(client, { schema }) as unknown as DB;
}

export async function migrateDb(db: DB, driver: Driver, migrationsFolder = MIGRATIONS_FOLDER) {
  if (driver === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(db as never, { migrationsFolder });
  } else {
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    await migrate(db, { migrationsFolder });
  }
}
