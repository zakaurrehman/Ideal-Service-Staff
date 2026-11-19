# Account portal audit and redesign

Written for the site owner and whoever does the WordPress setup and launch. It records what was inspected, what works today, what was changed, and what still needs WordPress-side action.

## 1. How the audit was done

Every account-related page on the live site (`idealservicestaff.com`) was fetched and inspected while logged out. For each page we checked:

- the form fields
- hidden fields and the nonces it relies on
- the plugin that renders it
- whether its shortcode actually renders
- where it redirects

Plugin installation was checked through the public plugin `readme.txt` files and the WordPress REST index (`/wp-json/`).

**Not verifiable from outside:**
- Logged-in states: My Account profile screens, redirects after login, role handling.
- Which role a new registration receives.
- Whether password-reset emails are delivered.

These need a test account or WordPress admin access. No login attempts were made against the production site.

## 2. Pages inspected (live WordPress)

| URL | Controlled by | What's there | State |
| --- | --- | --- | --- |
| `/sign-in/` | User Registration 5.2.8 | Login form: *Username or Email*, *Password*, *Remember Me*, show/hide password toggle, *Lost your password?* link, nonce | **Works** |
| `/login/` | User Registration | Same login form | **Works** |
| `/my-account/` | User Registration | Login form when logged out; account area when logged in (not verifiable) | **Works** (logged-out view) |
| `/registration/` | User Registration form #1620 | *Username*, *User Email*, *User Password*, *Confirm Password*; strength-meter script loaded | **Works** |
| `/lost-password/` | User Registration | *Username or Email* → *Reset password* (nonce-protected) | **Works** |
| `/customer-panel/` | Amelia | Prints raw `[ameliacustomerpanel version=1 appointments=1 events=1]` | **Broken.** Amelia not installed. |
| `/employee-panel/` | Amelia | Prints raw `[ameliaemployeepanel appointments=1 events=1]` | **Broken.** Amelia not installed. |
| `/services-booking/` | Amelia | Prints raw `[ameliastepbooking]` | **Broken.** Amelia not installed. |
| `/employee-dashboard/` | — | 404. This slug never existed. | Not a real page |
| `/wp-login.php` | User Registration | 302 → `/login/`. The plugin has replaced the core login screen. | Intentional |
| `/wp-login.php?action=lostpassword` | User Registration | 302 → `/login/` | Intentional |
| `/wp-login.php?action=register` | WordPress core | Redirects to a 404 page. Core registration is disabled. | Intentional |
| `/wp-admin/` | WordPress core | 302 → core login → `/login/` | Works |

Plugins found:
- **User Registration 5.2.8**: active, with the `user-registration/v1` REST namespace. reCAPTCHA v2 is configured in its login settings.
- **WPForms Lite**: installed, not used by any page.
- **Amelia**: not installed.
- **Forminator**: not installed.
- **Arrow Forms**: not installed.

### Why the new site doesn't contain its own login form

User Registration protects login, registration and password reset with WordPress nonces and plugin-specific handlers, and it deliberately disables the core `wp-login.php` screen. Re-creating those forms on the Next.js site would mean either scraping nonces or reviving the disabled core login. Both are fragile and could break production login.

So the new site **hands off** to the real WordPress forms, and the WordPress pages are brought into the brand with a stylesheet (`wordpress/portal-skin.css`). No credentials ever pass through the Next.js app.

## 3. What was built

| Page | Change |
| --- | --- |
| `/sign-in/` | Rebuilt as the portal gateway: "Welcome to Your Ideal Service Staff Portal". It has a brand panel, a **live portal status** card, and two panels (*Clients & Families*: Client Sign In, Customer Dashboard, Create an Account, Forgot Password; *Care Professionals & Employees*: Employee Dashboard, Employee Sign In, Apply for a Position), each with a description and a status badge, plus a support strip. Noindexed. |
| `/customer-panel/` | **Gateway** (new). When Amelia's customer panel really renders and the portal is on its own domain, visitors are forwarded straight to it. Otherwise it shows a portal-styled page: sidebar, honest status, what the dashboard offers once online, and what works right now. No fake appointments or data. Noindexed. |
| `/employee-panel/` | Same gateway for the Amelia employee panel. |
| `/employee-dashboard/` | Redirects (308) to `/employee-panel/` |
| `/get-job/` | The application is now a **4-step form** with a progress bar, per-step validation, Enter-to-continue, résumé upload feedback, a review step with *Edit* links, and the success message only after the server confirms delivery. It jumps back to the step owning any field the server rejects. |
| `/services-booking/` | The "Instant online booking" card now appears only when the Amelia booking calendar actually renders, or when `NEXT_PUBLIC_BOOKING_URL` is set. |
| WordPress login, registration and lost-password pages | `wordpress/portal-skin.css`: brand styling (fonts, inputs, focus rings, buttons, password toggle, strength meter, notices, mobile) using the plugin's own class names. **Apply in WordPress.** |

**Live status check** (`src/lib/portal.ts`): the server fetches the public, logged-out portal pages every 5 minutes. A dashboard counts as *online* only when the page loads **and** its Amelia shortcode was actually rendered. Accounts count as online when the User Registration REST namespace exists. Nothing private is requested.

## 4. Working features (verified)

- Sign-in, registration and lost-password pages on WordPress (form structure verified)
- Sign-in hub links to the exact WordPress slugs, plus live status
- Gateways: honest unavailable state today, auto-forwarding when Amelia works (verified against a mock portal)
- Care request, contact, booking-request, newsletter and the new multi-step job application (end-to-end through the form API to a webhook, résumé included)
- All legacy account URLs and post-launch WordPress URLs redirect correctly (section 8)

## 5. Needs WordPress configuration

- Move WordPress to `portal.idealservicestaff.com` and update its Site URL; tick *Discourage search engines* (see `wordpress/README.md`).
- Paste `wordpress/portal-skin.css` into *Appearance → Customize → Additional CSS*.
- User Registration: enable the strong-password meter, enable reCAPTCHA on registration, set the redirect after login, and confirm the lost-password page.
- Delete leftover Forminator and Arrow Forms shortcodes from old WordPress pages (cosmetic).

## 6. Needs Amelia

- Customer Dashboard (`[ameliacustomerpanel]`)
- Employee Dashboard (`[ameliaemployeepanel]`)
- Online booking calendar (`[ameliastepbooking]`)
- Appointment history, rescheduling and cancellation, employee schedules and availability, appointment notifications

Install and licence Amelia (the panels are paid-plan features), then add services, employees and hours. **No website change is needed afterwards**: the gateways detect it within 5 minutes.

## 7. Missing backend functionality and plan

These were requested but have no backend today, so they were **not faked**:

| Capability | Status | Plan |
| --- | --- | --- |
| Dashboards rendered inside the Next.js site (sidebar, widgets, charts with real data) | No API or authentication bridge exists | **Recommended:** use Amelia's own panels on the portal (zero custom code, styled through Amelia → Customize). **Alternative:** a headless build. It needs Amelia's API (higher-tier plan), a server-side session in Next.js, and auth bound to WordPress through application passwords or JWT, plus a security review. It's a separate project. |
| Employee document management | Not in WordPress or Amelia | Needs a document plugin or a dedicated HR system |
| Shift scheduling beyond appointments | Amelia covers appointment-based schedules only | Evaluate a staffing or rostering tool if shifts are needed |
| Notification centre | Amelia sends email/SMS notifications; no in-app centre | Out of scope until a dashboard backend exists |
| Separate employee self-registration | Only one public registration form (#1620) exists | Decide whether employees register themselves or are created by an admin (Amelia → Employees) |

## 8. Redirects and portal URLs

When `NEXT_PUBLIC_PORTAL_URL` is a separate origin:

| Old / requested URL | Destination |
| --- | --- |
| `/login/`, `/my-account/`, `/registration/`, `/lost-password/` | Portal, same path (307) |
| `/customer-panel/`, `/employee-panel/` | Gateway page; forwards to the portal when the dashboard works |
| `/employee-dashboard/` | `/employee-panel/` (308) |
| `/wp-admin/…` (query string kept), `/wp-login.php` | Portal (307) |
| `/wp-content/uploads/…` | Portal (308), so old image links keep working |

If the portal shares the site's origin (variable missing), the build prints a warning. The account URLs then point to the `/sign-in/` hub, and the gateways never auto-redirect, which prevents redirect loops.

## 9. Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical site origin |
| `NEXT_PUBLIC_PORTAL_URL` | WordPress portal origin. **Must differ from the site origin after launch.** |
| `WORDPRESS_URL` | Blog content source (REST API) |
| `NEXT_PUBLIC_BOOKING_URL` | Optional explicit booking-calendar URL |
| `RESEND_API_KEY`, `INQUIRY_TO_EMAIL`, `INQUIRY_FROM_EMAIL` and/or `FORMS_WEBHOOK_URL`, `FORMS_WEBHOOK_SECRET` | Form delivery |

No WordPress credentials, tokens or private keys are used or stored by the website.

## 10. Testing results

- **Live WordPress status detection:** accounts *Online*; customer dashboard, employee dashboard and booking *Temporarily unavailable*. This matches the manual inspection.
- **Mock portal with a separate origin** (customer panel and booking rendering, employee panel not):
  - `/customer-panel/` → 307 to the portal; `/employee-panel/` shows the unavailable state.
  - Every redirect in section 8 behaves as listed.
  - The booking card appears.
- **Journeys:**
  - *New employee:* Careers → 4-step application → validation on each step → review → webhook delivery with the résumé → success. Passed.
  - *Customer / employee:* Home → My Account → hub → dashboard gateway → status page and real portal links. Passed.
  - *Sign-in, registration and password reset:* handoff links verified against the live WordPress forms. Completing them needs a real account and was not attempted on production.
- **Visual and responsive QA:** 15 pages at 390 px and 1440 px. No overflow, clipped text, broken images, missing alt text or unnamed controls. A mobile overflow on the gateway page was found and fixed.
- **Lighthouse (mobile):**
  - New pages: Accessibility 100, Best Practices 100.
  - SEO on `/sign-in/` and the gateways reports *not crawlable*. That's intentional: they're noindexed.
  - Performance on these pages ranged 70–89 between runs on a busy test machine, with LCP 0.9 s and CLS 0.

## 11. Remaining issues

1. Amelia must be installed and licensed before either dashboard or online booking can work.
2. Logged-in experiences (My Account profile, redirect after login, role routing) still need a check with a real test account after cutover.
3. `portal-skin.css` must be pasted in WordPress, and the WordPress header and footer on portal pages remain the old Elementor theme. A minimal portal header is optional follow-up work.
4. Decide on the employee onboarding model (section 7).
