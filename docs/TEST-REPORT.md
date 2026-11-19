# Test report

Run on 19 November 2026 against commit-ready code, on Windows 11 with Node 24 and Microsoft Edge (headless).

| Suite | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run typecheck` | ✅ no errors |
| Unit + integration (real PostgreSQL engine via PGlite, real migrations) | `npm test` | ✅ **19 / 19** |
| End-to-end, production build, every role in a real browser | `npm run build && npm run test:e2e` | ✅ **33 / 33** |
| Production build | `npm run build` | ✅ public pages static/ISR, portals dynamic, no warnings |
| Dependency audit | `npm audit --omit=dev` | ✅ 0 vulnerabilities |

## Unit and integration tests (`tests/*.test.mts`)

**Authentication**
- Argon2id hash format and verification.
- Password policy.
- Session tokens stored only as hashes.
- Expired and suspended sessions rejected.
- Revoking every session except the current one.
- Reset tokens are single-use, newest-only and expire.
- Email verification is bound to the address the link was sent to.
- Rate limiter.

**RBAC**
- Super Admin has every permission.
- Admin lacks access management.
- Customers and employees have no admin permissions.

**Booking engine**
- Status-machine actor rules.
- DST-safe time-zone conversion.
- Slots respect lead time, window and closing time.
- Customers can't use another customer's address or dependent.
- Eligibility reasons: not approved, not qualified, outside hours, time off.
- The full assign → accept → confirm → start → complete flow and its history.
- **Two concurrent assignments of one professional to overlapping visits: exactly one succeeds.**
- Decline releases the time; reschedule keeps or releases the professional.
- Ownership on cancellation; a declined cancellation request restores the previous status.

**Files and email**
- Type detection from bytes.
- Renamed EXE, ELF, shell scripts, HTML and plain ZIP files are rejected.
- Email variables are HTML-escaped; `javascript:` links are blocked.

## End-to-end journeys (`tests/e2e/run.mjs`)

**Authentication**
- Customer registration.
- Booking blocked until the email is confirmed; the verification link works.
- Logout.
- Wrong password gives a generic error.
- Login redirects to the right portal.

**Customer**
- Add an address and a family member.
- The 7-step booking wizard produces a reference.
- Booking list search.
- Cancellation request.
- Notifications.
- Confirmed booking shows the professional.

**Employee**
- Registration.
- Weekly availability.
- Service requests.
- Document upload; a renamed executable is rejected.
- Limited visit details before acceptance and full details after.
- Accept.

**Admin**
- Login and live dashboard.
- Verify an employee and approve services.
- Open an employee document.
- Approve and assign a booking.
- Confirm a booking.
- CSV export.

**Job application**
- The 5-step application with a résumé produces an `APP-` reference, which the admin can find.

**Security**
- Customer → `/admin/` and `/employee/` are redirected.
- Customer → employee document returns 404.
- Anonymous → portals redirect to sign-in.
- Anonymous → files and exports return 404.
- Customer B → customer A's booking returns 404.
- Customer → CSV export returns 404.
- Employee B → employee A's assignment returns 404.
- Cross-site POST returns 403.
- Repeated wrong passwords → lockout or rate limit.

**Password recovery**
- Forgot → reset link → existing sessions revoked → sign in with the new password.

**Responsive**
- No horizontal overflow at 390 px on the admin dashboard, bookings, booking detail and roles pages.
- No uncaught browser errors during the run.

## Bugs found and fixed by these tests

1. The admin dashboard weekly chart query used a parameterised expression in `GROUP BY`, which PostgreSQL rejected. It now groups by ordinal.
2. `/forgot-password/` was prerendered at build time without a database and showed "accounts being set up". It is now rendered per request.
3. Assignment rows nested a link inside a link (invalid HTML and hydration errors). Fixed.
4. PGlite's data folder wasn't created on first run. Fixed.
5. Upload-folder path tracing bundled the whole project into serverless functions. Fixed with a `turbopackIgnore` hint.

## Not covered by automation (needs real accounts)

- Real email delivery through Resend: tests confirm the emails are rendered and logged.
- Vercel Blob in production: tests use the local private store through the same authorised download route.
- Neon in production: tests use the same migrations on the PGlite Postgres engine.

Repeat the e2e journeys on a Preview deployment once those services are connected (`DEPLOYMENT.md`).
