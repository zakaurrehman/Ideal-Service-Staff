# Ideal Service Staff: website and staffing platform

The public website for **idealservicestaff.com**, plus a complete healthcare staffing platform:

- customer, employee and admin portals;
- a booking engine;
- job applications;
- notifications;
- private document storage.

It runs on Next.js and PostgreSQL. WordPress is no longer used for accounts, dashboards, booking or forms.

```
npm install
cp .env.example .env.local        # optional locally: without DATABASE_URL an embedded dev database is used
npm run dev                       # http://localhost:3000
npm run admin:create -- --email you@example.com --first You --last Admin   # prints a set-password link
```

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js 16 (Turbopack) |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Integration tests on a real PostgreSQL engine (PGlite) |
| `npm run test:e2e` | End-to-end browser journeys against the production build (`npm run build` first; uses Edge or Chrome) |
| `npm run db:generate` / `db:migrate` / `db:studio` | Drizzle migrations |
| `npm run admin:create` | Create the first Super Admin. There is no default admin. |
| `npm run assets` / `content:sync` | Image pipeline / WordPress content snapshot |

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL (Neon) · Drizzle ORM · Argon2id · Vercel Blob · Resend · Framer Motion · Lucide · Zod.

## Platform documentation

| Topic | Document |
| --- | --- |
| Architecture, audit, phases | [`docs/NEW-PLATFORM-ARCHITECTURE.md`](docs/NEW-PLATFORM-ARCHITECTURE.md) |
| Progress and remaining work | [`docs/PROGRESS.md`](docs/PROGRESS.md) |
| Database | [`docs/DATABASE-SCHEMA.md`](docs/DATABASE-SCHEMA.md) |
| Auth, roles | [`docs/AUTHENTICATION.md`](docs/AUTHENTICATION.md), [`docs/ROLE-PERMISSIONS.md`](docs/ROLE-PERMISSIONS.md) |
| Bookings | [`docs/BOOKING-SYSTEM.md`](docs/BOOKING-SYSTEM.md) |
| Running the business | [`docs/ADMIN-GUIDE.md`](docs/ADMIN-GUIDE.md) |
| Going live | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md), [`docs/ENVIRONMENT-VARIABLES.md`](docs/ENVIRONMENT-VARIABLES.md) |
| Security, tests | [`docs/SECURITY.md`](docs/SECURITY.md), [`docs/TEST-REPORT.md`](docs/TEST-REPORT.md) |

`docs/PORTAL-AUDIT.md` and `wordpress/` document the earlier WordPress hand-off and are kept for history only.

---

## Architecture (public website)

```
src/
  app/                      routes (one folder per URL), sitemap.ts, robots.ts, api/inquiry
  content/                  site.ts · services.ts · company.ts   ← all business copy lives here
  content/generated/        WordPress snapshot (legal pages, posts) + image manifest
  components/
    layout/                 Header, Footer, Intro curtain, Experience (Lenis, cursor, progress bar)
    motion/                 Reveal (scroll reveals), Parallax (CSS scroll-driven), Effects (Counter, Magnetic)
    sections/home/          the 13 homepage sections, reused across pages
    forms/                  Fields toolkit + five forms
    ui/                     Button, Primitives (Logo, SectionHeading, PageHero), Faq, icons
  lib/
    forms/                  options.ts (zod-free) · schema.ts (zod, lazy-loaded on the client) · deliver.ts
    wordpress.ts            blog fetch with hourly ISR and a snapshot fallback
    wp-html.ts              allow-list cleaner for WordPress HTML
    seo.tsx                 metadata helper and JSON-LD
```

- **Blog:** posts stay in WordPress and appear here within an hour (ISR). If WordPress is unreachable, the bundled snapshot is served.
- **Forms:** one route handler with the same Zod schemas as the browser. It adds a same-origin check, per-IP rate limiting (stored in PostgreSQL, so shared across server instances), a honeypot, a minimum fill-time check, and file checks by content type (résumé and documents, 4 MB in total). Submissions are **stored in PostgreSQL first** (visible in Admin → Care Requests / Job Applications); email or webhook copies are optional.
- **Animation and performance:**
  - Above-the-fold entrances are pure CSS (`.enter*`), so they start at first paint.
  - Scroll reveals use data attributes plus one inline IntersectionObserver, with no per-element React.
  - Parallax uses CSS scroll-driven animations.
  - Off-screen homepage sections use `content-visibility: auto`.
  - Framer Motion loads its features lazily.
  - Everything respects `prefers-reduced-motion`.
- **Images:** the original photos are restored and optimised by `scripts/optimize-assets.mjs`. Several Elementor banners had a white wash baked into the pixels, which is reversed mathematically, and several portraits had a red corner bracket baked in, which is cropped off.

## Public website quality checks

Lighthouse 13 against the production build, median of three runs:

| Page | Performance | Accessibility | Best practices | SEO |
| --- | --- | --- | --- | --- |
| Desktop `/` | 100 | 100 | 100 | 100 |
| Mobile `/` | 91 | 100 | 100 | 100 |
| Mobile `/services/` | 97 | 100 | 100 | 100 |
| Mobile `/get-care/` | 95 | 100 | 100 | 100 |
| Mobile About | 95 | 100 | 100 | 100 |
| Mobile `/how-it-works/` | 96 | 100 | 100 | 100 |
| Mobile blog post | 99 | 100 | 100 | 100 |

Accessibility, Best Practices and SEO are also 100 on `/contact/`, `/get-job/`, `/sign-in/`, `/services-booking/`, `/blog/`, the service detail pages and the legal pages.

CLS is 0 on every page. Other checks run:

- Automated browser checks of 13 pages at 390, 820 and 1440 px for horizontal overflow, broken images, missing alt text, unnamed controls, duplicate IDs, H1 count and canonical tags.
- End-to-end form tests: validation, honeypot, rate limit, cross-origin rejection, and webhook delivery including the résumé attachment.
- Interaction tests: the multi-step form, mobile menu, Services dropdown, service filters, testimonial carousel and reduced-motion mode.

---

## Content items for the owner to review ⚠️

These were **kept exactly as published** on the old site (no claims were added). Please confirm or correct them:

1. **Scope conflict.** The Services page says Post-Hospitalization Care includes "*skilled nursing, wound care*". The Legal Disclosure says licensed medical services, including wound care, are *excluded*.
2. **Response time.** The homepage says "*90-minute response for most inquiries*". The Services page says "*15-minute response guarantee for urgent inquiries*". The new site uses the 90-minute wording throughout.
3. **Training hours.** About says "*200+ hour certification program (vs. 75-hour state minimum)*". The Legal Disclosure says "*80-hour initial course (twice the state requirement of 40 hours)*".
4. **Contracts.** "*No long-term contracts*" (homepage) versus "*initial 30-day commitment*" (Legal Disclosure). The FAQ states both accurately.
5. **WhatsApp** links to the main number, (310) 462-1700, because the contact page invites visitors to "Make a Call / WhatsApp" there. Change `whatsappHref` in `src/content/site.ts` if WhatsApp uses another number.
6. **New copy:**
   - The old homepage listed the 13 specialties by title only. The short role descriptions and "Typical support includes" lists in `src/content/services.ts` are new plain-language copy written within the Legal Disclosure scope.
   - Several service pages and FAQ answers paraphrase existing content.

   Please review them.
7. **Theme demo posts.** Three finance/trading articles from the WordPress theme demo ("Mastering Market Volatility", "The Art of Risk Management", "Demystifying Technical Analysis") are hidden and 301-redirect to `/blog/`. Remove them from `LEGACY_DEMO_POSTS` in `next.config.ts` if they should stay.
8. **Blog.** The three remaining posts are generic customer-service articles. New care-focused articles published in WordPress appear automatically.
9. **Hours.** Sunday hours (9 AM – 6 PM) are longer than Saturday's (9 AM – 4 PM). This is copied as published; please confirm.
