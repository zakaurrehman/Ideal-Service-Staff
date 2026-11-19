/**
 * End-to-end test of the whole platform against a production build.
 *
 *   npm run build && npm run test:e2e
 *
 * Starts `next start` with a fresh, throw-away local PostgreSQL (PGlite) and
 * local upload folder, creates a Super Admin with the admin:create script, then
 * drives a real browser (Edge or Chrome via playwright-core) through every role.
 * Dev emails are read from the server log (they are never sent).
 */
import { spawn, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const PORT = 3200;
const B = `http://localhost:${PORT}`;
const dir = mkdtempSync(path.join(tmpdir(), "iss-e2e-"));
const env = { ...process.env, ALLOW_LOCAL_DB: "1", LOCAL_DB_DIR: path.join(dir, "db"), LOCAL_UPLOAD_DIR: path.join(dir, "uploads"), PORT: String(PORT) };
delete env.DATABASE_URL;
delete env.RESEND_API_KEY;
const FIX = path.join(process.cwd(), "tests", "e2e");
const ADMIN = { email: "owner@example.test", pw: "Admin-Pass-2026!" };
const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push(["PASS", name]);
    console.log("  ✔", name);
  } catch (err) {
    results.push(["FAIL", name, err.message]);
    if (process.env.E2E_VERBOSE) console.log(err.stack);
    console.log("  ✘", name, "\n     ", err.message.split("\n")[0]);
  }
};

execSync(`npx tsx scripts/admin-create.mts --email ${ADMIN.email} --first Olivia --last Owner --password-env E2E_ADMIN_PW`, { env: { ...env, E2E_ADMIN_PW: ADMIN.pw }, stdio: "inherit" });

let log = "";
const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, shell: true });
server.stdout.on("data", (d) => (log += d));
server.stderr.on("data", (d) => (log += d));
for (let i = 0; i < 60 && !log.includes("Ready"); i++) await new Promise((r) => setTimeout(r, 1000));

const lastLink = (pathPart) => {
  const m = [...log.matchAll(new RegExp(`https?://[^\\s]*${pathPart}\\?token=[\\w-]+(?:&invite=1)?`, "g"))];
  if (!m.length) throw new Error(`no ${pathPart} link in server log`);
  return B + new URL(m[m.length - 1][0]).pathname + new URL(m[m.length - 1][0]).search;
};

const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge", headless: true });
const ctx = async (vw = 1280) => {
  const c = await browser.newContext({ viewport: { width: vw, height: 900 } });
  await c.addInitScript(() => sessionStorage.setItem("iss-intro", "1"));
  const p = await c.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(e.message));
  return p;
};
const signIn = async (p, email, pw) => {
  await p.goto(`${B}/sign-in/`);
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="password"]', pw);
  await p.click('button[type="submit"]');
  await Promise.race([p.waitForURL((u) => !u.pathname.startsWith("/sign-in/"), { timeout: 20000 }), p.waitForSelector('form [role="alert"]', { timeout: 20000 })]).catch(() => {});
};
const register = async (p, type, first, email, pw = "Caring-Hands-2026") => {
  await p.goto(`${B}/register/${type === "employee" ? "?type=employee" : ""}`);
  await p.fill('input[name="firstName"]', first);
  await p.fill('input[name="lastName"]', "Tester");
  await p.fill('input[name="email"]', email);
  await p.fill('input[name="phone"]', "(310) 555-0101");
  if (type === "employee") await p.fill('input[name="city"]', "Inglewood");
  await p.fill('input[name="password"]', pw);
  await p.fill('input[name="confirmPassword"]', pw);
  await p.check('input[name="terms"]');
  await p.click('button[type="submit"]');
  await p.waitForURL(new RegExp(`/${type}/dashboard/`), { timeout: 30000 });
};
const submitForm = async (p, formHas, buttonText) => {
  const form = p.locator("form", { has: p.locator(formHas) }).first();
  await form.getByRole("button", { name: buttonText }).click();
  await p.waitForTimeout(400);
  await p.waitForLoadState("networkidle");
  return form;
};

const stamp = Date.now();
const SHOTS = process.env.E2E_SHOTS;
const shot = async (p, name) => SHOTS && p.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: true }).catch(() => {});
const cust = { email: `maria${stamp}@example.test`, pw: "Caring-Hands-2026" };
const cust2 = { email: `other${stamp}@example.test`, pw: "Caring-Hands-2026" };
const emp = { email: `james${stamp}@example.test`, pw: "Caring-Hands-2026" };
let bookingRef = "";
let bookingId = "";
let assignmentUrl = "";
let docFileUrl = "";

try {
  console.log("\nAuthentication");
  const c = await ctx();
  await check("customer registration → dashboard (unverified banner)", async () => {
    await register(c, "customer", "Maria", cust.email);
    assert.equal(await c.locator("text=Please confirm your email address").count(), 1);
  });
  await check("booking blocked until email is confirmed", async () => {
    await c.goto(`${B}/customer/book/`);
    assert.equal(await c.locator("text=Confirm your email to book").count(), 1);
  });
  await check("email verification link confirms the address", async () => {
    await c.goto(lastLink("/verify-email/"));
    assert.equal(await c.locator("h1", { hasText: "Email confirmed" }).count(), 1);
  });
  await check("logout then login with wrong password shows a generic error", async () => {
    await c.goto(`${B}/customer/dashboard/`);
    await c.locator("aside").getByRole("button", { name: "Logout" }).click();
    await c.waitForURL(/sign-in\/\?signed_out=1/);
    await signIn(c, cust.email, "Wrong-password-123");
    await c.waitForSelector("text=That email and password combination is incorrect", { timeout: 10000 });
  });
  await check("customer login lands on the customer dashboard", async () => {
    await signIn(c, cust.email, cust.pw);
    assert.match(c.url(), /\/customer\/dashboard\//);
  });

  console.log("\nCustomer portal");
  await check("add a saved address", async () => {
    await c.goto(`${B}/customer/addresses/`);
    const f = c.locator("form").last();
    await f.locator('input[name="label"]').fill("Mom’s house");
    await f.locator('input[name="line1"]').fill("330 W. Olive St");
    await f.locator('input[name="city"]').fill("Inglewood");
    await f.locator('input[name="postalCode"]').fill("90301");
    await f.getByRole("button", { name: "Add address" }).click();
    await c.waitForSelector("text=Address added.");
  });
  await check("add a family member", async () => {
    await c.goto(`${B}/customer/dependents/`);
    const f = c.locator("form").last();
    await f.locator('input[name="firstName"]').fill("Rosa");
    await f.locator('input[name="lastName"]').fill("Lopez");
    await f.locator('select[name="relationship"]').selectOption("Parent");
    await f.getByRole("button", { name: "Add family member" }).click();
    await c.waitForSelector("text=Family member added.");
  });
  await check("booking wizard creates a booking with a reference", async () => {
    await c.goto(`${B}/customer/book/`);
    await c.getByRole("radio").first().click();
    await c.getByRole("button", { name: "Continue" }).click();
    await c.getByRole("radio", { name: /One-time visit/ }).click();
    await c.getByRole("button", { name: "Continue" }).click();
    await c.getByRole("radio", { name: /Rosa Lopez/ }).click();
    await c.getByRole("button", { name: "Continue" }).click();
    await c.getByRole("radio", { name: /Mom’s house/ }).click();
    await c.getByRole("button", { name: "Continue" }).click();
    const day = c.locator('[role="grid"] button:not([disabled])').nth(3);
    await day.click();
    await c.getByRole("radio", { name: "10:00 AM" }).click();
    await c.getByRole("button", { name: "Continue" }).click();
    await c.getByRole("button", { name: "Continue" }).click(); // professional: no preference
    await c.fill("#instructions", "Please ring the side door.");
    await c.getByRole("button", { name: "Send booking request" }).click();
    await c.waitForSelector("text=Booking request received", { timeout: 20000 });
    bookingRef = (await c.locator("span.font-mono").first().textContent()).trim();
    assert.match(bookingRef, /^ISS-[A-Z2-9]{6}$/);
  });
  await check("booking appears in My Bookings with Pending review; search works", async () => {
    await c.goto(`${B}/customer/bookings/?q=${bookingRef}`);
    assert.equal(await c.locator(`text=${bookingRef}`).count(), 1);
    assert.ok(await c.locator("text=Pending review").count());
    await shot(c, "customer-bookings");
  });

  console.log("\nEmployee portal");
  const e = await ctx();
  await check("employee registration → employee dashboard", async () => {
    await register(e, "employee", "James", emp.email);
    assert.ok(await e.locator("text=Profile completion").count());
  });
  await check("set weekly availability", async () => {
    await e.goto(`${B}/employee/availability/`);
    for (let d = 0; d < 7; d++) await e.locator(`input[name="on-${d}"]`).check();
    for (let d = 0; d < 7; d++) {
      await e.locator(`input[name="start-${d}"]`).fill("07:00");
      await e.locator(`input[name="end-${d}"]`).fill("21:00");
    }
    await e.getByRole("button", { name: "Save working hours" }).click();
    await e.waitForSelector("text=Working hours saved.");
  });
  await check("request every service", async () => {
    await e.goto(`${B}/employee/services/`);
    for (let i = 0; i < 40; i++) {
      const before = await e.getByRole("button", { name: "I can provide this" }).count();
      if (!before) break;
      await e.getByRole("button", { name: "I can provide this" }).first().click();
      await e.waitForFunction((n) => document.querySelectorAll("button").length && [...document.querySelectorAll("button")].filter((b) => b.textContent?.includes("I can provide this")).length < n, before, { timeout: 10000 });
    }
    assert.equal(await e.getByRole("button", { name: "I can provide this" }).count(), 0);
  });
  await check("upload a document privately; a renamed executable is rejected", async () => {
    await e.goto(`${B}/employee/documents/`);
    await e.locator('select[name="docType"]').selectOption("tb_test");
    await e.locator('input[name="file"]').setInputFiles(path.join(FIX, "fake.pdf"));
    await e.getByRole("button", { name: "Upload securely" }).click();
    await e.waitForSelector("text=Upload a PDF, Word document or image.");
    await e.locator('select[name="docType"]').selectOption("tb_test");
    await e.locator('input[name="file"]').setInputFiles(path.join(FIX, "sample.pdf"));
    await e.getByRole("button", { name: "Upload securely" }).click();
    await e.waitForSelector("text=Document uploaded securely");
    docFileUrl = await e.locator('a[href^="/api/files/"]').first().getAttribute("href");
    const res = await e.request.get(B + docFileUrl);
    assert.equal(res.status(), 200, "owner can download");
  });

  console.log("\nSecurity");
  await check("customer cannot open the admin area or another role’s portal", async () => {
    await c.goto(`${B}/admin/`);
    assert.match(c.url(), /\/customer\/dashboard\//);
    await c.goto(`${B}/employee/dashboard/`);
    assert.match(c.url(), /\/customer\/dashboard\//);
  });
  await check("customer cannot download an employee’s document (404)", async () => {
    assert.equal((await c.request.get(B + docFileUrl)).status(), 404);
  });
  await check("anonymous users are redirected from portals and get 404 for files and exports", async () => {
    const a = await ctx();
    await a.goto(`${B}/customer/bookings/`);
    assert.match(a.url(), /\/sign-in\/\?next=/);
    assert.equal((await a.request.get(B + docFileUrl)).status(), 404);
    assert.equal((await a.request.get(`${B}/api/admin/export/customers/`)).status(), 404);
    await a.context().close();
  });
  await check("customer B cannot see customer A’s booking (404)", async () => {
    const b2 = await ctx();
    await register(b2, "customer", "Other", cust2.email);
    const res = await b2.goto(`${B}/customer/bookings/${bookingRef}/`);
    assert.equal(res.status(), 404);
    assert.equal((await b2.request.get(`${B}/api/admin/export/bookings/`)).status(), 404, "customer cannot export");
    await b2.context().close();
  });
  await check("cross-site POST to the forms API is rejected", async () => {
    const r = await c.request.post(`${B}/api/inquiry/`, { headers: { origin: "https://evil.example" }, multipart: { kind: "contact" } });
    assert.equal(r.status(), 403);
  });

  console.log("\nAdmin");
  const ad = await ctx();
  await check("admin login lands on the admin dashboard with live figures", async () => {
    await signIn(ad, ADMIN.email, ADMIN.pw);
    assert.match(ad.url(), /\/admin\/$/);
    assert.ok(await ad.locator("text=Booking requests per week").count());
  });
  await check("approve the employee and their service eligibility", async () => {
    await ad.goto(`${B}/admin/verification/`);
    await ad.getByRole("link", { name: /James Tester/ }).first().click();
    await ad.locator('select[name="status"]').selectOption("approved");
    await ad.getByRole("button", { name: "Save decision" }).click();
    await ad.waitForSelector("text=Status updated to Approved");
    for (let i = 0; i < 20; i++) {
      const btn = ad.getByRole("button", { name: "Approve", exact: true }).first();
      if (!(await btn.count())) break;
      await btn.click();
      await ad.waitForLoadState("networkidle");
      await ad.waitForTimeout(150);
    }
    assert.ok(await ad.getByRole("button", { name: "Revoke" }).count() >= 1);
  });
  await check("admin can open the employee document (and it is access-logged)", async () => {
    assert.equal((await ad.request.get(B + docFileUrl)).status(), 200);
  });
  await check("approve the booking, assign the professional", async () => {
    await ad.goto(`${B}/admin/bookings/?q=${bookingRef}`);
    await ad.getByRole("link", { name: bookingRef }).click();
    await ad.waitForURL(/admin\/bookings\/[0-9a-f-]{36}\//);
    bookingId = ad.url().match(/bookings\/([0-9a-f-]{36})/)[1];
    await ad.locator('select[name="to"]').selectOption("pending_assignment");
    await ad.getByRole("button", { name: "Update status" }).click();
    await ad.waitForSelector("text=Status changed to Pending assignment");
    await ad.reload();
    await ad.locator('input[name="employeeId"]:not([disabled])').first().check();
    await shot(ad, "admin-booking-assign");
    await ad.getByRole("button", { name: /Assign & notify/ }).click();
    await ad.waitForSelector("text=Professional assigned");
  });

  console.log("\nAssignment → confirmation");
  await check("employee sees the offer with limited details, accepts it", async () => {
    await e.goto(`${B}/employee/assignments/`);
    await e.getByRole("link", { name: /Respond/ }).first().click();
    await e.waitForURL(/employee\/assignments\/[0-9a-f-]{36}\//);
    assignmentUrl = e.url();
    assert.ok(await e.locator("text=Shown after you accept").count(), "private details hidden before acceptance");
    await e.getByRole("button", { name: "Accept" }).click();
    await e.waitForSelector("text=The office will confirm this visit with the client.");
    await e.reload();
    assert.ok(await e.locator("text=Please ring the side door.").count(), "instructions visible after acceptance");
  });
  await check("another employee cannot open this assignment (404)", async () => {
    const e2 = await ctx();
    await register(e2, "employee", "Nina", `nina${stamp}@example.test`);
    const res = await e2.goto(assignmentUrl);
    assert.equal(res.status(), 404);
    await e2.context().close();
  });
  await check("admin confirms; customer sees Confirmed and the professional", async () => {
    await ad.goto(`${B}/admin/bookings/${bookingId}/`);
    await ad.locator('select[name="to"]').selectOption("confirmed");
    await ad.getByRole("button", { name: "Update status" }).click();
    await ad.waitForSelector("text=Status changed to Confirmed");
    await c.goto(`${B}/customer/bookings/${bookingRef}/`);
    assert.ok(await c.locator("text=Confirmed").count());
    assert.ok(await c.locator("text=James T.").count());
    await shot(c, "customer-booking-confirmed");
    await c.goto(`${B}/customer/dashboard/`);
    await shot(c, "customer-dashboard");
    await e.goto(`${B}/employee/dashboard/`);
    await shot(e, "employee-dashboard");
    await e.goto(`${B}/employee/schedule/`);
    await shot(e, "employee-schedule");
    await ad.goto(`${B}/admin/`);
    await shot(ad, "admin-dashboard");
    await ad.goto(`${B}/admin/calendar/`);
    await shot(ad, "admin-calendar");
  });
  await check("customer notifications list the updates", async () => {
    await c.goto(`${B}/customer/notifications/`);
    assert.ok(await c.locator(`text=Booking ${bookingRef}: Confirmed`).count());
  });
  await check("customer requests a cancellation; admin sees it", async () => {
    await c.goto(`${B}/customer/bookings/${bookingRef}/`);
    await c.getByRole("button", { name: "Request cancellation" }).click();
    await c.waitForSelector("text=Our team will confirm the cancellation shortly.");
    await ad.goto(`${B}/admin/bookings/${bookingId}/`);
    assert.ok(await ad.locator("text=The customer asked to cancel").count());
  });
  await check("CSV export works for admin", async () => {
    const r = await ad.request.get(`${B}/api/admin/export/bookings/`);
    assert.equal(r.status(), 200);
    assert.match(await r.text(), new RegExp(bookingRef));
  });

  console.log("\nJob application");
  await check("five-step application with résumé → reference; visible to admin", async () => {
    const p = await ctx();
    await p.goto(`${B}/careers/apply/`);
    await p.fill('input[name="firstName"]', "Ana");
    await p.fill('input[name="lastName"]', "Applicant");
    await p.fill('input[name="email"]', `ana${stamp}@example.test`);
    await p.fill('input[name="phone"]', "(310) 555-0199");
    await p.fill('input[name="city"]', "Los Angeles");
    await p.getByRole("button", { name: "Continue" }).click();
    await p.locator('label:has(input[name="positions"])').first().click();
    await p.locator('label:has(input[name="employmentType"][value="part-time"])').click();
    await p.locator('label:has(input[name="availability"][value="weekdays"])').click();
    await p.locator('select[name="experience"]').selectOption("1-3");
    await p.getByRole("button", { name: "Continue" }).click();
    await p.locator('label:has(input[name="transportation"][value="yes"])').click();
    await p.locator('label:has(input[name="workAuthorized"][value="yes"])').click();
    await p.getByRole("button", { name: "Continue" }).click();
    await p.locator('input[name="resume"]').setInputFiles(path.join(FIX, "sample.pdf"));
    await p.getByRole("button", { name: "Continue" }).click();
    await p.locator('label:has(input[name="attest"])').click();
    await p.getByRole("button", { name: /Submit application/ }).click();
    await p.waitForSelector("text=/Application APP-[A-Z2-9]{6} received/", { timeout: 20000 });
    const ref = (await p.locator("strong.font-mono").first().textContent()).trim();
    await ad.goto(`${B}/admin/applications/?q=${ref}`);
    assert.equal(await ad.getByRole("link", { name: ref }).count(), 1);
    await p.context().close();
  });

  console.log("\nPassword recovery & brute-force protection");
  await check("forgot → reset → old sessions revoked → login with new password", async () => {
    const p = await ctx();
    await p.goto(`${B}/forgot-password/`);
    await p.fill('input[name="email"]', cust.email);
    await p.getByRole("button", { name: "Send reset link" }).click();
    await p.waitForSelector("text=If an account exists");
    await p.waitForTimeout(500);
    await p.goto(lastLink("/reset-password/"));
    if (!(await p.locator('input[name="password"]').count())) throw new Error("reset page: " + (await p.locator("h1").textContent()));
    await p.fill('input[name="password"]', "Brand-New-Pass-2026");
    await p.fill('input[name="confirmPassword"]', "Brand-New-Pass-2026");
    await p.getByRole("button", { name: "Save password" }).click();
    await p.waitForURL(/sign-in\/\?reset=1/);
    await c.goto(`${B}/customer/dashboard/`);
    assert.match(c.url(), /sign-in/, "existing session was revoked");
    await signIn(p, cust.email, "Brand-New-Pass-2026");
    assert.match(p.url(), /customer\/dashboard/);
    await p.context().close();
  });
  await check("repeated failures lock the account / rate-limit sign-in", async () => {
    const p = await ctx();
    let msg = "";
    for (let i = 0; i < 7; i++) {
      await signIn(p, cust2.email, `Wrong-${i}-password`);
      msg = (await p.locator('[role="alert"]').first().textContent()) ?? "";
    }
    assert.match(msg, /temporarily locked|Too many/);
    await p.context().close();
  });

  console.log("\nResponsive");
  await check("dashboards have no horizontal overflow at 390 px", async () => {
    const m = await ctx(390);
    await signIn(m, ADMIN.email, ADMIN.pw);
    for (const url of ["/admin/", "/admin/bookings/", `/admin/bookings/${bookingId}/`, "/admin/roles/"]) {
      await m.goto(B + url);
      const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(over <= 1, `${url} overflows by ${over}px`);
      if (url === "/admin/") await shot(m, "admin-mobile");
    }
    await m.context().close();
  });

  const pageErrors = [c, e, ad].flatMap((p) => p.errors);
  await check("no uncaught browser errors", async () => assert.deepEqual(pageErrors, [], pageErrors.join(" | ")));
} finally {
  await browser.close();
  try {
    execSync(process.platform === "win32" ? `taskkill /pid ${server.pid} /T /F` : `kill ${server.pid}`, { stdio: "ignore" });
  } catch {}
  rmSync(dir, { recursive: true, force: true });
  const failed = results.filter((r) => r[0] === "FAIL");
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log("\nServer log tail:\n" + log.split("\n").filter((l) => /error|⨯/i.test(l)).slice(-20).join("\n"));
    process.exitCode = 1;
  }
}
