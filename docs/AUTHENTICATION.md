# Authentication

The platform has its own authentication. WordPress, the User Registration plugin and WordPress cookies are not used.

## Building blocks

| Concern | Implementation |
| --- | --- |
| Password hashing | **Argon2id** via `@node-rs/argon2`: 19 MiB memory, 2 iterations, 1 lane (OWASP baseline). Hashes are PHC strings, so parameters can be raised later. When an account doesn't exist, a real hash is still verified so response timing doesn't reveal which emails are registered. |
| Password policy | 10–128 characters, not a common password, not built from the email, and either 3 character classes or 14+ characters (passphrases are welcome). Defined in `src/lib/auth/password.ts`. |
| Sessions | **Database-backed** (`user_sessions`). The browser receives a 256-bit random token in an `HttpOnly`, `SameSite=Lax` cookie; in production it is `Secure` and named `__Host-iss_session`. The database stores only `SHA-256(token)`, so a database leak can't be replayed. |
| Lifetime | "Keep me signed in": 30-day sliding expiry. Otherwise a browser-session cookie with a 12-hour sliding expiry. Expired sessions are deleted on use and by the daily cron. |
| Revocation | Sign out deletes the session. A password change revokes all other sessions; a password reset revokes all of them. Suspending a user revokes all of theirs. Users can see and end their sessions in Settings. |
| Brute force | Rate limits are stored in Postgres, so they're shared across serverless instances: 30 sign-ins per IP and 10 per email per 15 minutes. **5 consecutive failures lock the account for 15 minutes.** Lockouts are audit-logged. |
| Email verification | Registration sends a one-time link: a 256-bit token stored as a hash, valid for 24 hours. It only verifies if the account still has that email. Booking requires a verified email (a setting in Admin → Settings). |
| Password reset | `/forgot-password/` always gives the same answer, so it can't be used to discover accounts. The link is valid for 1 hour, single-use, and only the newest link works. It's rate-limited per IP and per email. |
| Staff invitations | Admins invite staff by email. The invitee receives a 72-hour single-use link to set their own password. Nobody is ever given a default password. |
| CSRF | Server Actions only accept same-origin requests (Next.js checks Origin against Host), and cookies are `SameSite=Lax`. The forms API rejects cross-origin `Origin` headers with 403. |

## Where checks happen

`src/lib/auth/session.ts` is the Data Access Layer.

| Call | Enforces |
| --- | --- |
| `getViewer()` | Validates the cookie against the database once per request (memoised with React `cache`) and loads roles and permissions. |
| `requireViewer()` | Signed in |
| `requireCustomer()` | Customer role |
| `requireEmployee()` | Employee role |
| `requireStaff(permission?)` | Staff role, optionally with a specific permission |

These calls are made by **every** page, Server Action and route handler that touches private data.

Data queries are also scoped to the viewer: `WHERE customer_id = viewer.id`, or `WHERE employee_id = viewer.id`. Changing an ID in a URL therefore returns 404 rather than someone else's data.

`src/proxy.ts` only redirects visitors without a session cookie away from `/customer`, `/employee` and `/admin`. Per Next.js guidance it's an optimisation, not the security boundary.

## Pages

| URL | Purpose |
| --- | --- |
| `/sign-in/` | Every role signs in here and is sent to their own area |
| `/register/` | Customer registration |
| `/register/?type=employee` | Care-professional registration |
| `/forgot-password/` | Request a reset link |
| `/reset-password/?token=…` | Choose a new password |
| `/verify-email/?token=…` | Confirm an email address |
| `/account/` | Redirects to the signed-in user's area |
| `/customer/settings/`, `/employee/settings/`, `/admin/account/` | Password change, sessions, notification preferences |

Legacy WordPress URLs redirect here:

| Old URL | New URL |
| --- | --- |
| `/login/` | `/sign-in/` |
| `/registration/` | `/register/` |
| `/lost-password/` | `/forgot-password/` |
| `/my-account/` | `/account/` |
| `/wp-login.php` | `/sign-in/` |
| `/wp-admin/` | `/admin/` |

## Existing WordPress accounts

WordPress password hashes are not migrated: WordPress isn't connected and the hashes weren't exported. Existing WordPress users create a new account, and the email they used before can be reused. If the hashes are exported later, a one-off import with a forced reset is possible.
