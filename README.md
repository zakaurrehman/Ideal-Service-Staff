# Ideal Service Staff — website

The redesigned **idealservicestaff.com**: a Next.js front-end that keeps the existing WordPress install for the parts that already work there (accounts, blog editing).

```
npm install
cp .env.example .env.local        # then fill in a form-delivery channel
npm run dev                       # http://localhost:3000
npm run build && npm start        # production build
```

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js 16 (Turbopack) |
| `npm run typecheck` | TypeScript, no emit |
| `npm run assets` | Rebuilds every image in `public/images`, the app icons and the Open Graph image from `assets/source/` |
| `npm run content:sync` | Re-pulls the legal pages and blog posts from the WordPress REST API into `src/content/generated/` |

Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion (`LazyMotion`) · Lenis · Lucide · Zod.

---

## 1. What the audit of the old site found

The old site runs WordPress on Hostinger (Astra theme with Elementor). Its pages, posts and 88 media files were pulled through the WordPress REST API.

| Function | State on the live site | What the new site does |
| --- | --- | --- |
| Contact form (Forminator #869) | **Broken.** Plugin is inactive, so the page shows the raw shortcode. | New validated form → `/api/inquiry/` |
| Care request (Forminator #1284, `/get-care/`) | **Broken** | Three-step care request form |
| Job application (Forminator #1293, `/get-job/`) | **Broken** | Full application form with résumé upload and SMS consent |
| Newsletter (Arrow Forms #667, footer) | **Broken** | Newsletter field in the footer |
| Services booking (Amelia, `/services-booking/`) | **Broken.** Shows `[ameliastepbooking]`. | Consultation-request form, plus an optional link to a live booking calendar (`NEXT_PUBLIC_BOOKING_URL`) |
| Customer / employee panels (Amelia) | **Broken** | Linked from the account hub; they work again once Amelia is re-activated in WordPress |
| Sign-in, registration, lost password (User Registration plugin) | **Working** | Kept on WordPress. `/sign-in/` is a redesigned account hub that hands off to it. |

All original URLs are preserved, including blog posts at `/<post-slug>/` and About at `/non-medical-home-care-experts/`. `trailingSlash` matches the WordPress permalinks. Retired URLs redirect: `/about/`, `/home/`, `/online/`, `/under-construction/`.

## 2. Launch checklist (cutover)

1. **Move WordPress to a subdomain**, e.g. `portal.idealservicestaff.com`. In WordPress, update *Settings → General* (WordPress Address and Site Address) to that subdomain.
2. **Deploy this app** (Vercel, Netlify or any Node host) on `idealservicestaff.com` with:
   - `NEXT_PUBLIC_SITE_URL=https://idealservicestaff.com`
   - `NEXT_PUBLIC_PORTAL_URL=https://portal.idealservicestaff.com`
   - `WORDPRESS_URL=https://portal.idealservicestaff.com`

   The legacy account URLs (`/login/`, `/my-account/`, `/registration/`, `/lost-password/`, `/customer-panel/`, `/employee-panel/`) then forward to the portal automatically. Until the portal origin differs from the site origin, they point at `/sign-in/`, and the build prints a warning.
3. **Configure form delivery** (required; otherwise forms answer 503 and ask visitors to call):
   - **Email:** `RESEND_API_KEY`, `INQUIRY_TO_EMAIL`, `INQUIRY_FROM_EMAIL`. The sender domain must be verified in Resend first.
   - **And/or a webhook:** `FORMS_WEBHOOK_URL` (Zapier, Make, a CRM…) plus `FORMS_WEBHOOK_SECRET`, sent as the `X-Webhook-Secret` header.
4. **Booking:** re-activate Amelia in WordPress, then set `NEXT_PUBLIC_BOOKING_URL=https://portal.idealservicestaff.com/services-booking/` to show an "Instant online booking" card.
5. Submit `/sitemap.xml` in Google Search Console.

## 3. Architecture

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
- **Forms:** one route handler with the same Zod schemas as the browser. It adds a same-origin check, per-IP rate limiting (in-memory; use Redis or Upstash for multi-region), a honeypot, a minimum fill-time check, and a résumé type/size check (PDF or Word, 5 MB). It **never reports success unless a delivery channel accepted the message**.
- **Animation and performance:**
  - Above-the-fold entrances are pure CSS (`.enter*`), so they start at first paint.
  - Scroll reveals use data attributes plus one inline IntersectionObserver, with no per-element React.
  - Parallax uses CSS scroll-driven animations.
  - Off-screen homepage sections use `content-visibility: auto`.
  - Framer Motion loads its features lazily.
  - Everything respects `prefers-reduced-motion`.
- **Images:** the original photos are restored and optimised by `scripts/optimize-assets.mjs`. Several Elementor banners had a white wash baked into the pixels, which is reversed mathematically, and several portraits had a red corner bracket baked in, which is cropped off.

## 4. Quality checks run before handover

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

## 5. Content items for the owner to review ⚠️

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
