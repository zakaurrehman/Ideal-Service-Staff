/**
 * Secure initial administrator creation — there is no default admin account.
 *
 *   npm run admin:create -- --email owner@example.com --first Jane --last Doe [--role super_admin]
 *
 * Prints a single-use "set your password" link (valid 72 hours). The password
 * is never passed on the command line. For automated tests only, a password can
 * be supplied through an environment variable named with --password-env.
 */
import path from "node:path";
import { parseArgs } from "node:util";
import { eq } from "drizzle-orm";
import { createPglite, createPostgres, migrateDb } from "../src/lib/db/client";
import { seedReferenceData } from "../src/lib/db/seed";
import { assignRole, createPasswordResetToken, findUserByEmail, INVITE_TTL_MS } from "../src/lib/auth/core";
import { hashPassword, passwordProblem } from "../src/lib/auth/password";
import { userProfiles, users } from "../src/lib/db/schema";

const { values } = parseArgs({
  options: { email: { type: "string" }, first: { type: "string" }, last: { type: "string" }, role: { type: "string", default: "super_admin" }, "password-env": { type: "string" } },
});
const email = values.email?.trim().toLowerCase();
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !values.first || !values.last) {
  console.error("Usage: npm run admin:create -- --email you@example.com --first Jane --last Doe [--role super_admin|admin]");
  process.exit(1);
}
if (!["super_admin", "admin"].includes(values.role!)) {
  console.error("--role must be super_admin or admin (create custom roles in the admin UI).");
  process.exit(1);
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DIRECT_URL || process.env.DATABASE_URL;
const db = url ? await createPostgres(url) : await createPglite(process.env.LOCAL_DB_DIR || path.join(process.cwd(), ".data", "pglite"));
await migrateDb(db, url ? "postgres" : "pglite");
await seedReferenceData(db);

let user = await findUserByEmail(db, email);
if (!user) {
  [user] = await db.insert(users).values({ email, emailVerifiedAt: new Date() }).returning();
  await db.insert(userProfiles).values({ userId: user.id, firstName: values.first, lastName: values.last });
  console.log(`✓ Created ${email}`);
} else {
  console.log(`• ${email} already exists — adding the role`);
}
await assignRole(db, user.id, values.role!);

const envName = values["password-env"];
if (envName) {
  const pw = process.env[envName] ?? "";
  const problem = passwordProblem(pw, { email });
  if (problem) {
    console.error(`Password in $${envName} rejected: ${problem}`);
    process.exit(1);
  }
  await db.update(users).set({ passwordHash: await hashPassword(pw), passwordChangedAt: new Date(), emailVerifiedAt: new Date() }).where(eq(users.id, user.id));
  console.log(`✓ Password set from $${envName}`);
} else {
  const token = await createPasswordResetToken(db, user.id, INVITE_TTL_MS);
  const base = (process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  console.log(`\nSet the password within 72 hours (single use):\n  ${base}/reset-password/?token=${token}&invite=1\n`);
}
console.log(`✓ ${email} is now ${values.role}`);
process.exit(0);
