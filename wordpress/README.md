# WordPress portal setup

The new website keeps WordPress for everything that involves accounts. This folder holds what to change **inside WordPress**. None of it can be applied from this repository: it needs WordPress admin access.

## 1. Move WordPress to the portal subdomain (at launch)

1. Create `portal.idealservicestaff.com` at your host (Hostinger) and point it at the existing WordPress install.
2. In WordPress, go to **Settings → General**. Set both **WordPress Address** and **Site Address** to `https://portal.idealservicestaff.com`.
3. Replace old URLs in the database (for example with the *Better Search Replace* plugin): `https://idealservicestaff.com` → `https://portal.idealservicestaff.com`.
4. In **Settings → Reading**, tick **Discourage search engines**. The old Elementor marketing pages would otherwise appear on Google twice. Account pages don't need to rank.
5. Deploy the Next.js site on `idealservicestaff.com` with `NEXT_PUBLIC_PORTAL_URL=https://portal.idealservicestaff.com`.

What keeps working automatically:
- Usernames, passwords, roles and existing accounts. They live in the same WordPress database.
- Login cookies. They are set by WordPress on the portal domain; nothing cross-domain is needed.
- Old bookmarks. The new site forwards `/login/`, `/my-account/`, `/registration/`, `/lost-password/`, `/wp-admin/`, `/wp-login.php` and `/wp-content/uploads/…` to the portal.

## 2. Apply the brand skin

Go to **Appearance → Customize → Additional CSS** and paste the whole of [`portal-skin.css`](portal-skin.css). It restyles these pages to match the new site without changing any field, rule or behaviour:

- Sign in, Login and My Account: the User Registration login form
- Registration: the User Registration form (#1620)
- Lost Password: the User Registration reset form

## 3. Recommended User Registration settings

All of these live under **User Registration → Settings / Forms**:

| Setting | Recommendation |
| --- | --- |
| Registration form → **Enable strong password** | On. It turns on the strength meter the skin already styles. |
| Login → **reCAPTCHA** | The site already has reCAPTCHA v2 configured. Enable it on the **registration** form as well to block bot sign-ups. |
| Login → **Redirect after login** | `/my-account/` (or `/customer-panel/` once Amelia is running) |
| General → **Lost password page** | Confirm it is `/lost-password/`. That's the page linked from the new site. |

## 4. Amelia (required for both dashboards and online booking)

Amelia is **not installed** on the current site: the plugin files return 404 and the pages print raw shortcodes. Until it is installed:

- `/customer-panel/` and `/employee-panel/` on the new site show an honest "temporarily unavailable" state.
- `/services-booking/` uses the consultation-request form.

To restore it:

1. Install and activate Amelia. Customer and employee panels are paid-plan features, so confirm your licence covers them.
2. The existing pages already contain the right shortcodes, so no page edits are needed:
   - Customer Panel → `[ameliacustomerpanel version=1 appointments=1 events=1]`
   - Employee Panel → `[ameliaemployeepanel appointments=1 events=1]`
   - Services Booking → `[ameliastepbooking]`
3. Under **Amelia → Customize**, set the primary colour to `#0f695f` and the font to *Plus Jakarta Sans* to match the site.
4. Add services, employees (Amelia → Employees, linked to WordPress users) and working hours.

**No code change is needed on the new site afterwards.** Its status check sees the shortcodes rendering within 5 minutes. From then on:

- `/customer-panel/` and `/employee-panel/` forward visitors straight to the working dashboards.
- The booking page shows an "Instant online booking" card.

## 5. Clean-up after launch

These pages still contain shortcodes from plugins that are no longer installed: Forminator `[forminator_form …]` on Home, Contact, Get Care and Get Job, and Arrow Forms in the footer. Visitors won't see them once the new site is live, but you can delete the shortcodes or unpublish those pages on the portal.
