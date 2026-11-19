# Platform progress

Last updated: 19 November 2026. Each phase lists what was built and what remains. Read this first when continuing the work.

## Phase 1: audit, database, authentication, RBAC ✅

- Audit in `NEW-PLATFORM-ARCHITECTURE.md`.
- PostgreSQL schema: 47 tables, migrations, double-booking exclusion constraint, idempotent seed. See `DATABASE-SCHEMA.md`.
- Own authentication: Argon2id, database sessions, verification, reset, lockout, rate limits. See `AUTHENTICATION.md`.
- Roles and 24 permissions, editable in the admin. See `ROLE-PERMISSIONS.md`.
- The Neon connection is **prepared but not connected**: it needs your approval in Vercel (`DEPLOYMENT.md` §1). Development and tests use PGlite, an embedded PostgreSQL engine.

## Phase 2: registration and the three portals ✅

- Customer and employee registration.
- `/customer/*`: 12 sections plus Logout, matching the requested sidebar.
- `/employee/*`: 14 sections plus Logout.
- `/admin/*`: all 18 sections. The sidebar is filtered by permission.
- Every figure comes from the database. Empty states are used when there's no data; nothing is fabricated.

## Phase 3: services, applications, verification, requests, bookings, scheduling ✅

- Service management (CRUD, archive, categories, images, optional pricing). Public `/services/` pages read from the database, with the original content as fallback.
- `/careers/apply/`: a 5-step application with a résumé and up to 3 documents, private storage, an `APP-` reference and a draft saved on the device. `/get-job/` uses the same form.
- Employee verification: 7 statuses, document and certification review, per-service eligibility.
- Care requests: every public form is stored, with staff status and notes.
- Booking engine with the state machine, eligibility, assignment, accept/decline, reschedule and cancellation requests, a calendar, and weekly availability with time off. See `BOOKING-SYSTEM.md`.

## Phase 4: notifications, email, files, reports, CMS ✅ (partial CMS)

- In-app notification centre with preferences.
- Resend email, with templates editable in the admin, logs and retries (daily cron and a manual button).
- Private file storage (Vercel Blob in production) with authorised, logged downloads.
- Reports for any date range, with CSV exports.
- CMS: site announcement banner, FAQs, homepage testimonials and services.

## Phase 5: polish, security tests, deployment ✅ (deployment needs your accounts)

- Test suites: 19 integration and 33 end-to-end (see `TEST-REPORT.md`).
- Production build is clean.
- Security review summary in `SECURITY.md`.

## Remaining work (in priority order)

1. **You:**
   - Connect Neon, Vercel Blob and Resend.
   - Run `admin:create`.
   - Confirm the booking-rule defaults (`BOOKING-SYSTEM.md`) and the content items listed in the root README.
2. Re-run the e2e journeys on a Preview deployment with the real services.
3. CMS, not yet editable in the admin:
   - homepage hero copy, contact details and opening hours (still in `src/content/site.ts`);
   - blog articles (still read from WordPress, with a bundled snapshot).

   Next step: add content blocks for `contact` and `hero`, a `posts` table with an editor, and an import of the existing posts.
4. Multi-factor authentication for staff accounts (TOTP).
5. Recurring bookings (a weekly schedule generating visits). Today, "Start of ongoing care" books the first visit and the office plans the rest.
6. Direct-to-storage uploads for files larger than about 4 MB (Vercel's request limit).
7. Payments and invoicing, if wanted: a business decision. Revenue reports would follow.
8. Data-retention jobs, once retention periods are decided.
