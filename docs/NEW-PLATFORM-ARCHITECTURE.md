# Ideal Service Staff platform: architecture

Written for the business owner and the developers who will maintain the platform. It describes where the project started, what was wrong with it, and how the new platform is built.

Progress is tracked phase by phase in [`PROGRESS.md`](PROGRESS.md).

## 1. Starting point (audit, November 2026)

| Area | Finding |
| --- | --- |
| Framework | Next.js 16.4 (App Router, Turbopack), React 19.3, TypeScript 5.9, Tailwind CSS 4.3 (CSS-first `@theme` tokens), framer-motion 14 through `LazyMotion`, Lenis, lucide-react, zod 4 |
| Hosting | Vercel (`ideal-service-staff.vercel.app`). **`idealservicestaff.com` still serves the old WordPress site** from Hostinger (`x-powered-by: PHP/8.2`, LiteSpeed). |
| Public site | 15+ marketing pages with all original content, images and URLs migrated. `trailingSlash: true` keeps the WordPress permalinks. ISR blog reads from the WordPress REST API, with a bundled snapshot as fallback. |
| Forms | One route handler, `/api/inquiry/`, shared by five forms. It applies zod validation, a honeypot, a fill-time check, a same-origin check and an in-memory IP rate limit. Delivery goes **only** to Resend email or a webhook. **Nothing is stored**: if email fails, the submission is lost. |
| Accounts | **None in the app.** `/sign-in/` was a hand-off page to the WordPress *User Registration* plugin. `/customer-panel/` and `/employee-panel/` were gateways to **Amelia, which is not installed**. Both dashboards and online booking were non-functional on the live site. |
| Database | None. No ORM, no migrations. |
| File storage | None. The résumé was attached to the delivery email only. |
| Docs | `docs/PORTAL-AUDIT.md`, `wordpress/README.md` and `wordpress/portal-skin.css` described the WordPress hand-off. They are **historical reference only** and superseded by this document. |

### Problems the new platform fixes

1. Customer and employee accounts, dashboards and booking depended on WordPress plugins that are missing or deliberately disabled.
2. Form submissions were not persisted: no history, no status tracking, no admin review.
3. There was no administration other than wp-admin, and no roles beyond WordPress defaults.
4. Business content (services) lived in TypeScript files, so every change needed a developer and a redeploy.

## 2. Target architecture

```
Browser ──► Vercel (Next.js 16, Node runtime)
              │
              ├─ (site)    public marketing pages (static / ISR; no DB needed to build)
              ├─ (auth)    sign-in, register, forgot / reset password, verify email
              ├─ customer  /customer/*  ┐
              ├─ employee  /employee/*  ├─ dynamic, server-rendered, session-checked
              ├─ admin     /admin/*     ┘
              ├─ Server Actions        all mutations (each re-checks session + permission)
              ├─ Route handlers        /api/files/[id] (authorised downloads), /api/inquiry,
              │                        /api/admin/export/[type] (CSV), /api/cron/emails
              └─ proxy.ts              optimistic cookie check → redirect to /sign-in/
                    │
                    ├─► PostgreSQL (Neon via Vercel Marketplace)   ← single source of truth
                    ├─► Vercel Blob (private store)               ← documents, photos
                    └─► Resend                                    ← transactional email
```

### Key decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Database | **PostgreSQL** (Neon in production) | Required. Neon is provisioned through the Vercel Marketplace, which gives preview branches. |
| ORM | **Drizzle ORM** + drizzle-kit migrations | SQL-first, typed and lightweight. The same schema runs on Neon, on node-postgres, and on **PGlite** (embedded Postgres 17) for local development and automated tests. |
| Local database | **PGlite** in `.data/pglite` when `DATABASE_URL` is unset (development only) | No Postgres or Docker is installed on the development machine. PGlite is the real Postgres engine compiled to WASM, so the same migrations, transactions and `btree_gist` exclusion constraints are exercised. The app warns loudly when it uses it. |
| Auth | **In-house session auth built from established primitives**: Argon2id (`@node-rs/argon2`), 256-bit random session tokens stored only as SHA-256 hashes, database-backed sessions, HttpOnly + SameSite=Lax + Secure cookies. This is the pattern recommended by the Next.js authentication guide and The Copenhagen Book. | Auth.js credential logins cannot use database sessions, and the requested schema (`user_sessions`, `password_reset_tokens`, `email_verification_tokens`, RBAC tables) maps 1:1 onto this design. There's no vendor lock-in and no WordPress. |
| Authorisation | **Role-based access control with permissions.** `roles`, `permissions` and `role_permissions` live in the database. *Super Admin* implicitly holds every permission, and custom staff roles can be created. | Admins can have different access levels. Every server action, route handler and data query calls `requirePermission()` / `requireRole()` in the data-access layer, not just the UI. |
| Booking concurrency | **Postgres exclusion constraint** `EXCLUDE USING gist (employee_id WITH =, tstzrange(starts_at, ends_at) WITH &&)` on `employee_schedules`, plus checks inside a transaction | Double-booking is impossible even under concurrent requests. The database rejects the second write. |
| Files | Private **Vercel Blob** (`access: 'private'`) in production, and the local filesystem (`.data/uploads`) in development. Downloads always go through `/api/files/[id]/`, which checks ownership or permission and writes `file_access_logs`. | There are no public URLs for sensitive documents. Storage keys are random, file types are verified by magic bytes, and executables are rejected. |
| Email | **Resend** REST API, with templates stored in the database and editable by admins. Every send is logged in `email_logs`, and failures are retried by a Vercel Cron job. | In development without a key, emails are recorded with status `dev_logged` and printed to the console, so tests can follow verification and reset links. They are never reported as "sent". |
| UI | Existing design system (navy/teal tokens, Fraunces + Plus Jakarta Sans, Lucide) extended with an app shell, data tables and form kit. **shadcn/ui was not added**: the project already has its own Tailwind 4 component layer, and the brief says not to replace working components. Dialogs use the native `<dialog>` element. | Visual consistency with the public site and a smaller bundle |

## 3. User roles

| Role | Area | Notes |
| --- | --- | --- |
| Super Admin | `/admin` | All permissions, including admin users, roles and settings. Created only with the `npm run admin:create` CLI. There is no default account and no hard-coded password. |
| Admin | `/admin` | Everything except managing admin users, roles and system settings (editable in *Roles & Permissions*) |
| Custom staff roles | `/admin` | Any subset of permissions, e.g. a "Scheduler" with only bookings and calendar |
| Customer | `/customer` | Own profile, addresses, dependents, bookings, notifications and support tickets only |
| Employee / Care Professional | `/employee` | Own profile, documents, availability, assignments and schedule. Sees **only** the booking details of assignments offered to or accepted by them. |

See [`ROLE-PERMISSIONS.md`](ROLE-PERMISSIONS.md).

## 4. Database

There are 47 tables in 10 groups: auth, customers, employees, services, bookings, applications, notifications, files, administration and content. See [`DATABASE-SCHEMA.md`](DATABASE-SCHEMA.md). The schema source is `src/lib/db/schema.ts`, and migrations are in `drizzle/`.

## 5. Booking engine

Bookings move through a state machine (`src/lib/booking/status.ts`). Each transition is allowed only for specific actors, and every change is written to `booking_status_history`. The steps:

1. The customer picks a slot inside business booking hours, at least the minimum lead time ahead, from the business time zone (America/Los_Angeles by default).
2. An admin assigns a professional who is eligible. Eligibility means the professional is:
   - approved;
   - approved for the requested service;
   - inside their weekly working hours;
   - not blocked by time off;
   - free of conflicts (checked by the exclusion constraint).
3. The professional accepts or declines the assignment.
4. The admin confirms the booking.
5. The professional starts and completes the visit.

See [`BOOKING-SYSTEM.md`](BOOKING-SYSTEM.md).

## 6. Implementation phases

| Phase | Scope |
| --- | --- |
| 1 | Audit, database, schema and migrations, authentication, roles and permissions |
| 2 | Registration (customer and employee), app shells, and the three dashboards |
| 3 | Services, job applications, employee verification, care requests, booking engine, availability and scheduling |
| 4 | Notifications, email, file storage, reports, CMS |
| 5 | Polish, performance, security tests, deployment |

## 7. What WordPress is still used for

Only **blog articles** are still read from the WordPress REST API, with a bundled snapshot as fallback, so the site works even if WordPress is switched off. Moving the blog into the platform's CMS is listed in `PROGRESS.md`.

No login, registration, dashboard, booking, form or admin function touches WordPress. The legacy WordPress URLs redirect to the new pages:

| Old URL | New URL |
| --- | --- |
| `/login/`, `/wp-login.php` | `/sign-in/` |
| `/my-account/` | `/account/` |
| `/registration/` | `/register/` |
| `/lost-password/` | `/forgot-password/` |
| `/customer-panel/` | `/customer/dashboard/` |
| `/employee-panel/` | `/employee/dashboard/` |
| `/wp-admin/` | `/admin/` |

## 8. Status

Every phase is implemented and tested (see `TEST-REPORT.md`). Connecting the production services needs your approval (see `DEPLOYMENT.md`). Remaining work is listed in `PROGRESS.md`.
