import { test } from "node:test";
import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { testDb, makeUser } from "./helpers";
import * as t from "../src/lib/db/schema";
import {
  consumeEmailVerificationToken,
  consumePasswordResetToken,
  createEmailVerificationToken,
  createPasswordResetToken,
  createSession,
  hashToken,
  invalidateUserSessions,
  loadAccess,
  rateLimit,
  validateSessionToken,
} from "../src/lib/auth/core";
import { hashPassword, passwordProblem, verifyPassword } from "../src/lib/auth/password";

const db = await testDb();

test("passwords: Argon2id hash, verify, reject wrong / missing hash", async () => {
  const h = await hashPassword("Caring-Hands-2026");
  assert.match(h, /^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  assert.equal(await verifyPassword(h, "Caring-Hands-2026"), true);
  assert.equal(await verifyPassword(h, "caring-hands-2026"), false);
  assert.equal(await verifyPassword(null, "anything"), false);
});

test("password policy", () => {
  assert.ok(passwordProblem("short"));
  assert.ok(passwordProblem("password123"));
  assert.ok(passwordProblem("aaaaaaaaaaaa"));
  assert.ok(passwordProblem("maria.lopez-2026x", { email: "maria.lopez@example.com" }));
  assert.equal(passwordProblem("Caring-Hands-2026"), null);
  assert.equal(passwordProblem("a long simple passphrase"), null);
});

test("sessions: token stored only as hash; validate; suspended and expired users rejected; revocation", async () => {
  const u = await makeUser(db, "customer");
  const { token } = await createSession(db, u.id, { persistent: false });
  const [row] = await db.select().from(t.userSessions).where(eq(t.userSessions.userId, u.id));
  assert.equal(row.id, hashToken(token));
  assert.notEqual(row.id, token);
  assert.equal((await validateSessionToken(db, token))?.id, u.id);
  assert.equal(await validateSessionToken(db, token + "x"), null);

  await db.update(t.users).set({ status: "suspended" }).where(eq(t.users.id, u.id));
  assert.equal(await validateSessionToken(db, token), null, "suspended user");
  await db.update(t.users).set({ status: "active" }).where(eq(t.users.id, u.id));

  await db.update(t.userSessions).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(t.userSessions.id, row.id));
  assert.equal(await validateSessionToken(db, token), null, "expired session");
  assert.equal((await db.select().from(t.userSessions).where(eq(t.userSessions.id, row.id))).length, 0, "expired session deleted");

  const a = await createSession(db, u.id, { persistent: true });
  const b = await createSession(db, u.id, { persistent: true });
  await invalidateUserSessions(db, u.id, hashToken(a.token));
  assert.ok(await validateSessionToken(db, a.token));
  assert.equal(await validateSessionToken(db, b.token), null);
});

test("password reset tokens are single-use, newest-only and expire", async () => {
  const u = await makeUser(db, "customer");
  const old = await createPasswordResetToken(db, u.id);
  const fresh = await createPasswordResetToken(db, u.id);
  assert.equal(await consumePasswordResetToken(db, old), null, "older link invalidated");
  assert.equal(await consumePasswordResetToken(db, fresh), u.id);
  assert.equal(await consumePasswordResetToken(db, fresh), null, "single use");
  const expired = await createPasswordResetToken(db, u.id, -1000);
  assert.equal(await consumePasswordResetToken(db, expired), null, "expired");
});

test("email verification only verifies the address the link was sent to", async () => {
  const u = await makeUser(db, "customer");
  await db.update(t.users).set({ emailVerifiedAt: null }).where(eq(t.users.id, u.id));
  const tok = await createEmailVerificationToken(db, u.id, u.email);
  await db.update(t.users).set({ email: `changed-${u.email}` }).where(eq(t.users.id, u.id));
  assert.equal(await consumeEmailVerificationToken(db, tok), null);
  await db.update(t.users).set({ email: u.email }).where(eq(t.users.id, u.id));
  const tok2 = await createEmailVerificationToken(db, u.id, u.email);
  assert.equal(await consumeEmailVerificationToken(db, tok2), u.id);
  const [after] = await db.select().from(t.users).where(eq(t.users.id, u.id));
  assert.ok(after.emailVerifiedAt);
});

test("RBAC: super admin has all permissions; admin lacks access management; customer/employee have none", async () => {
  const sa = await loadAccess(db, (await makeUser(db, "super_admin")).id);
  const ad = await loadAccess(db, (await makeUser(db, "admin")).id);
  const cu = await loadAccess(db, (await makeUser(db, "customer")).id);
  const em = await loadAccess(db, (await makeUser(db, "employee")).id);
  assert.equal(sa.isSuperAdmin, true);
  assert.ok(sa.permissions.has("roles.manage") && sa.permissions.has("admins.manage"));
  assert.equal(ad.isStaff, true);
  assert.ok(ad.permissions.has("bookings.assign"));
  assert.ok(!ad.permissions.has("roles.manage") && !ad.permissions.has("admins.manage") && !ad.permissions.has("settings.manage"));
  for (const x of [cu, em]) {
    assert.equal(x.isStaff, false);
    assert.equal(x.permissions.size, 0);
  }
});

test("rate limiter blocks after the limit within the window", async () => {
  const key = `test:${Date.now()}`;
  for (let i = 0; i < 3; i++) assert.equal((await rateLimit(db, key, 3, 60)).ok, true);
  const blocked = await rateLimit(db, key, 3, 60);
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterSec > 0 && blocked.retryAfterSec <= 60);
});
