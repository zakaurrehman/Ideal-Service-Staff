import { defineConfig } from "drizzle-kit";

/** Migrations are generated from src/lib/db/schema.ts into ./drizzle (npm run db:generate). */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DIRECT_URL || process.env.DATABASE_URL || "" },
  strict: true,
});
