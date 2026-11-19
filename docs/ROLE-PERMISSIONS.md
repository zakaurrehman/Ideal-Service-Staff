# Roles and permissions

Roles are rows in `roles`. Staff roles grant access to `/admin` and carry permissions through `role_permissions`. The catalogue is in `src/lib/auth/permissions.ts`.

| Role | Area | Permissions |
| --- | --- | --- |
| **Super Admin** | `/admin` | All of them, implicitly; can't be edited. Created only with `npm run admin:create` or by another Super Admin. |
| **Admin** | `/admin` | Everything except `admins.manage`, `roles.manage` and `settings.manage`. Editable in Roles & Permissions. |
| Custom staff roles | `/admin` | Any subset, e.g. a "Scheduler" with `bookings.view`, `bookings.assign` and `dashboard.view` |
| **Customer** | `/customer` | No admin permissions. Sees only their own records. |
| **Employee / Care Professional** | `/employee` | No admin permissions. Sees only their own records, plus the bookings assigned to them. |

## Permission catalogue

| Permission | Allows |
| --- | --- |
| dashboard.view | Admin dashboard figures |
| customers.view / customers.manage | List and view customers / suspend, reactivate, add notes |
| employees.view / employees.manage / employees.verify | List employees / status and service eligibility / approve, reject, review documents |
| documents.view | Download sensitive employee documents (every download is logged) |
| bookings.view / bookings.manage / bookings.assign | See bookings and the calendar / create, change status, reschedule, cancel / assign professionals |
| services.manage | Services, categories, pricing, images |
| applications.view / applications.manage | Read applications and résumés / change status, email applicants |
| requests.manage | Website care requests, contact messages, newsletter sign-ups |
| support.manage | Answer support conversations |
| notifications.manage | Announcements, email log, retries |
| reports.view / reports.export | Reports page / CSV downloads. An export also needs the data set's own permission. |
| templates.manage, content.manage, settings.manage | Email templates, website content, booking rules |
| admins.manage, roles.manage, audit.view | Staff accounts, role editing, audit log |

## Data visibility rules (enforced in queries)

- **Customers** see only rows where `customer_id` is their own:
  - bookings, addresses, dependents, notifications and support threads;
  - the professional's first name, last initial, photo, headline and skills, only after that professional **accepts**.
- **Employees** see their own profile, documents and assignments. For an **offered** visit they see the service, time, city and ZIP. The full address, access notes and client instructions appear only **after they accept**. Another employee's assignment returns 404.
- **Files:**
  - service images are public;
  - profile photos are visible to any signed-in user;
  - all other files are visible to the owner and to staff with `documents.view`; application files to staff with `applications.view`;
  - other users get 404.
- **Staff** without a permission are redirected to the admin dashboard with an "Access restricted" notice. Server Actions refuse the operation.
- Admins can't change their own roles or suspend themselves. Only a Super Admin can grant Super Admin.
