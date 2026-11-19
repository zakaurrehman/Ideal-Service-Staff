# Database schema

PostgreSQL. The source of truth is `src/lib/db/schema.ts` (Drizzle ORM). Migrations are in `drizzle/`:

- `0000_init.sql`: every table, enum, index and foreign key.
- `0001_booking_overlap_guard.sql`: enables `btree_gist` and adds the no-overlap exclusion constraint.

Every table uses UUID primary keys and `timestamptz` timestamps (stored in UTC). Foreign keys cascade, restrict or set null depending on what the data means. There are **47 tables**.

## Tables by area

| Area | Tables | Notes |
| --- | --- | --- |
| Auth & access | `users`, `user_profiles`, `user_sessions`, `password_reset_tokens`, `email_verification_tokens`, `roles`, `permissions`, `role_permissions`, `user_roles`, `rate_limits` | Emails are unique ignoring case (`lower(email)` unique index). Passwords are stored only as Argon2id hashes. Session and token IDs are SHA-256 hashes of the secret. |
| Customers | `customer_profiles`, `customer_addresses`, `customer_preferences`, `customer_dependents`, `customer_notes` | Addresses and dependents are archived, never hard-deleted, so past bookings stay intact. `customer_notes` are staff-only. |
| Employees | `employee_profiles`, `employee_documents`, `employee_certifications`, `employee_experience`, `employee_skills`, `employee_service_areas`, `employee_services`, `employee_availability`, `availability_blocks` | `employee_profiles.verification_status` uses the 7 required states. `employee_services` holds per-service eligibility, which admins approve. `employee_availability` holds weekly hours as minutes from midnight, with a CHECK that start < end. |
| Services | `service_categories`, `services`, `service_pricing`, `service_requests` | Seeded from the original website’s 13 services. A CHECK ensures min ≤ max duration. Prices are optional and nothing is invented. `service_requests` stores every public form submission (care requests, consultations, contact, newsletter). |
| Bookings | `bookings`, `booking_services`, `booking_assignments`, `employee_schedules`, `booking_status_history` | The address and recipient are snapshotted onto each booking. Only one live assignment per booking (partial unique index). **`employee_schedules` has a GiST exclusion constraint `(employee_id =, tstzrange(starts_at, ends_at) &&)`, so overlapping reservations for one employee are impossible.** |
| Applications | `job_applications`, `application_documents`, `application_status_history`, `internal_notes` | Each application gets a unique reference (`APP-XXXXXX`). Files are linked through `files`. |
| Notifications | `notifications`, `notification_preferences`, `email_templates`, `email_logs` | `email_logs` keeps the template variables so failed emails can be re-rendered and retried. |
| Files | `files`, `file_access_logs` | Metadata only. Bytes live in private object storage. Every sensitive download is logged. |
| Administration | `audit_logs`, `system_settings`, `support_messages`, `content_blocks` | Support threads: the root row has `parent_id NULL`. `content_blocks` stores the CMS content (JSON validated with zod). |

## Enums

- `user_status`: active, suspended, disabled
- `employee_verification_status`: application_received, under_review, documents_required, verification_pending, approved, rejected, suspended
- `booking_status`: draft, pending_review, pending_assignment, assigned, accepted, confirmed, in_progress, completed, cancellation_requested, cancelled, rejected
- `assignment_status`: offered, accepted, declined, withdrawn
- `application_status`: submitted, under_review, interview, documents_requested, approved, rejected, withdrawn
- `review_status` (documents and certifications): pending_review, approved, rejected, expired
- `request_status`: new, in_review, contacted, converted, closed
- `support_status`: open, in_progress, resolved, closed
- `email_status`: queued, sent, failed, dev_logged
- `eligibility_status`: requested, approved, revoked

## Changing the schema

1. Edit `src/lib/db/schema.ts`.
2. Run `npm run db:generate`. Review the generated SQL in `drizzle/` and commit it.
3. Deploy. `vercel-build` runs `npm run db:migrate` before `next build`.

Never edit an applied migration. Add a new one instead.

## Reference data

`src/lib/db/seed.ts` runs on every migration and is idempotent. It never overwrites admin edits. It creates:
- the system roles and permissions;
- default grants for a **newly created** Admin role;
- the original service catalogue.

**No demo customers, bookings or statistics are ever seeded.**

## Backups and retention

- **Backups:** Neon keeps point-in-time history: 6 hours of restore window on Free, up to 30 days on paid plans. Before risky changes, create a Neon branch. Also take a periodic logical dump: `pg_dump "$DATABASE_URL_UNPOOLED" > backup.sql`.
- **Retention (to be confirmed by the owner):**
  - Expired sessions are purged by the daily cron.
  - Email logs and audit logs are kept indefinitely for now. A retention period, such as 2 years, is a business and legal decision to make.
