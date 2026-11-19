# Deployment (Vercel + Neon)

The app already deploys on Vercel. The steps below connect the platform services. **Steps 1–3 need you to approve them in your Vercel account.**

## 1. Database: Neon via the Vercel Marketplace (you approve)

1. Go to Vercel → your project → **Storage** → **Create Database** → **Neon (Postgres)**.
2. Choose a region close to your users (e.g. `us-west`), connect it to **Production and Preview**, and approve the Marketplace terms.
3. Vercel adds `DATABASE_URL` and `DATABASE_URL_UNPOOLED`. Preview deployments get their own Neon branch.

Nothing else is needed. On the next deploy, the `vercel-build` script runs `npm run db:migrate`, which creates every table and seeds roles, permissions and the service catalogue. Then it builds.

## 2. File storage: Vercel Blob (you approve)

Go to **Storage** → **Create** → **Blob**, connect it to the project, and choose private access when asked. Vercel adds `BLOB_READ_WRITE_TOKEN`.

## 3. Email: Resend (you create the account)

1. Create a Resend account, add and verify `idealservicestaff.com` (DNS records), and create an API key.
2. Add `RESEND_API_KEY` and `EMAIL_FROM` to Vercel.

## 4. Cron

`vercel.json` schedules `/api/cron/emails/` once a day; this is compatible with the Hobby plan. Add `CRON_SECRET` (any long random string). On a Pro plan you can raise the frequency.

## 5. First administrator

Run this locally, with the production database URL in your shell for this one command:

```
DATABASE_URL="postgres://…unpooled…" APP_URL=https://idealservicestaff.com \
  npm run admin:create -- --email you@yourdomain.com --first Your --last Name
```

Open the printed link to set your password.

## 6. Domain cutover

`idealservicestaff.com` still points to WordPress on Hostinger. When you're ready:
1. Add the domain in Vercel → **Domains**.
2. Update DNS as Vercel instructs.
3. Set `NEXT_PUBLIC_SITE_URL=https://idealservicestaff.com`.

The old WordPress account URLs redirect automatically (see `AUTHENTICATION.md`). Keep WordPress reachable on another hostname only if you still want its blog posts. Otherwise remove `WORDPRESS_URL`; the bundled snapshot is served.

## Staging

Push to a branch other than `main` to get a Vercel Preview deployment with its own Neon branch database. Test there before merging to `main`.

## Error logging

Server errors appear in Vercel → **Logs**. Users see a friendly error page showing only a reference code, which matches the log. A third-party error tracker (e.g. Sentry) is optional and needs your account.

## Rolling back

- **Code:** Vercel → Deployments → *Promote* a previous deployment.
- **Data:** Neon → *Restore* to a point in time, or branch from it.

Migrations only move forward, so test them on a Preview branch first.
