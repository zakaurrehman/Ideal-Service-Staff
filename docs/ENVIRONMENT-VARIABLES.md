# Environment variables

Set these in Vercel → Project → Settings → Environment Variables, and locally in `.env.local`. **Never commit real values.** Only names prefixed with `NEXT_PUBLIC_` reach the browser, and none of those are secret.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Yes**, for the platform | PostgreSQL connection (Neon pooled URL). Added automatically by the Neon integration. Without it, the public website still works and the portals show "temporarily unavailable". |
| `DATABASE_URL_UNPOOLED` (or `DIRECT_URL`) | Recommended | Direct connection used for migrations. Added by the Neon integration. |
| `RESEND_API_KEY` | **Yes**, for email | Transactional email. Without it, emails are logged and not sent: verification, password reset and notifications won't reach inboxes. |
| `EMAIL_FROM` | Yes, with Resend | e.g. `Ideal Service Staff <no-reply@idealservicestaff.com>`. The domain must be verified in Resend. Falls back to `INQUIRY_FROM_EMAIL`. |
| `BLOB_READ_WRITE_TOKEN` | **Yes**, for uploads | Vercel Blob store used for **private** files: résumés, documents, photos. Added when you connect a Blob store. Without it, uploads are refused with a clear message. |
| `CRON_SECRET` | Recommended | Protects `/api/cron/emails/`, the daily email retry and session clean-up. Vercel sends it automatically to cron jobs. |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical origin, used in emails, SEO and links. e.g. `https://idealservicestaff.com` |
| `APP_URL` | Optional | Origin printed by `admin:create` links. Defaults to `NEXT_PUBLIC_SITE_URL`. |
| `WORDPRESS_URL` | Optional | Blog posts are still read from WordPress, with a bundled snapshot as fallback. Remove it once the blog moves. |
| `INQUIRY_TO_EMAIL`, `INQUIRY_FROM_EMAIL`, `FORMS_WEBHOOK_URL`, `FORMS_WEBHOOK_SECRET` | Optional | An extra copy of website form submissions sent to the office inbox or a webhook. The database is now the system of record. |
| `DATABASE_POOL_MAX` | Optional | Postgres pool size per server instance (default 5) |

**Local development and tests only.** Never set these on Vercel; the code ignores them there.

| Variable | Purpose |
| --- | --- |
| `ALLOW_LOCAL_DB=1` | Allows the embedded PGlite database in a local production build (used by `npm run test:e2e`) |
| `LOCAL_DB_DIR`, `LOCAL_UPLOAD_DIR` | Locations of the local database and uploads (default `.data/`) |

Auth.js variables (`AUTH_SECRET`, `AUTH_URL`) are **not needed**. Sessions are random tokens stored in the database, so there is no signing secret to manage.
