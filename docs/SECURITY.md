# Security and privacy

## Controls in place

| Area | Control |
| --- | --- |
| Authentication | Argon2id passwords, database sessions with hashed tokens, `__Host-` HttpOnly Secure SameSite cookies, account lockout, rate limits, single-use expiring tokens. See `AUTHENTICATION.md`. |
| Authorisation | Server-side checks on every page, Server Action and route handler (`requireCustomer` / `requireEmployee` / `requireStaff(permission)`). Queries are scoped to the owner. IDs from other users return 404. The proxy is not relied on. |
| Least privilege | 24 granular permissions; custom staff roles; employees see client details only after accepting; customers see only first name and initial of professionals. |
| Input validation | zod schemas on the server for every form (the client uses the same schemas for convenience). Strict UUID and date parsing. Length limits everywhere. |
| SQL injection | Drizzle ORM parameterises every query. Raw SQL fragments use tagged templates, which are also parameterised. |
| XSS | React escapes all output. No user HTML is rendered (WordPress blog HTML goes through an allow-list cleaner). Email templates escape variables and only allow `http(s)` button links. The email preview renders in a sandboxed iframe. |
| CSRF | Server Actions enforce same origin. SameSite=Lax cookies. The forms API rejects foreign `Origin`. |
| Files | Private Vercel Blob storage; nothing is public except service images. Type is detected from the file's bytes (PDF, Word, JPG, PNG, WebP only), so renamed executables, scripts and HTML are rejected. Size limits apply. Names are random UUIDs. Downloads go through an authorised route with `Content-Security-Policy: sandbox` and `nosniff`, and are logged in `file_access_logs`. |
| CSV exports | Require `reports.export` plus the data set's permission. Cells are escaped against formula injection. Every export is audited. |
| Abuse | Honeypot and minimum fill-time on public forms. Database-backed rate limits on sign-in, registration, password reset, forms, uploads, support and bookings. |
| Headers | HSTS (preload), X-Content-Type-Options, X-Frame-Options SAMEORIGIN, Referrer-Policy, Permissions-Policy (from `next.config.ts`) |
| Secrets | Server-only modules (`server-only`). No secret uses a `NEXT_PUBLIC_` name. `.env*` files are git-ignored. |
| Audit | `audit_logs` records sign-ins, lockouts, resets, status changes, assignments, role and permission edits, settings, exports and content changes, with IP addresses. |
| Errors | Users see a generic message with a reference code. Details stay in the server logs. |
| Dependencies | `npm audit --omit=dev` reports 0 vulnerabilities. A vulnerable transitive `zod` inside `@vercel/blob` is pinned via `overrides`. |

## Data minimisation

- No medical records, diagnoses, Social Security numbers or ID numbers are requested. Forms warn people not to include them.
- Care notes are limited to routines and preferences.
- Identity documents are uploaded only when staff ask for them.

## Compliance

**No compliance claim is made**, including HIPAA. The platform stores contact details, care preferences and employment records for a *non-medical* home-care service. Before storing any protected health information, carry out a legal, technical and operational assessment. That would cover:
- Business Associate Agreements with Vercel, Neon and Resend;
- access reviews;
- incident response;
- a retention policy.

## Owner actions

1. Enable 2-step verification on the Vercel, Neon, Resend and GitHub accounts.
2. Decide retention periods for audit and email logs, and for rejected applications.
3. Review staff roles regularly (Admin Users) and suspend leavers immediately.
4. Consider adding multi-factor authentication for staff accounts. It's not implemented yet; see `PROGRESS.md`.
