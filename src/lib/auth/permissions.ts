/**
 * Permission catalogue and default role grants. Pure data — safe to import
 * anywhere. The database copy (permissions / role_permissions) is what is
 * enforced; Super Admin implicitly holds every permission.
 */
export const PERMISSIONS = [
  { key: "dashboard.view", group: "General", name: "View admin dashboard", description: "Open /admin and see business statistics." },
  { key: "customers.view", group: "Customers", name: "View customers", description: "List customers and open their profiles." },
  { key: "customers.manage", group: "Customers", name: "Manage customers", description: "Suspend or reactivate accounts and add internal notes." },
  { key: "employees.view", group: "Employees", name: "View employees", description: "List employees and their profiles." },
  { key: "employees.manage", group: "Employees", name: "Manage employees", description: "Change employee status and service eligibility." },
  { key: "employees.verify", group: "Employees", name: "Verify employees", description: "Approve or reject employees, documents and certifications." },
  { key: "documents.view", group: "Employees", name: "View employee documents", description: "Download sensitive employee documents." },
  { key: "bookings.view", group: "Bookings", name: "View bookings", description: "See all bookings and the calendar." },
  { key: "bookings.manage", group: "Bookings", name: "Manage bookings", description: "Create, edit, reschedule, cancel and change status." },
  { key: "bookings.assign", group: "Bookings", name: "Assign professionals", description: "Assign or remove care professionals on bookings." },
  { key: "services.manage", group: "Services", name: "Manage services", description: "Create, edit, archive services, categories and pricing." },
  { key: "applications.view", group: "Applications", name: "View job applications", description: "Read applications and résumés." },
  { key: "applications.manage", group: "Applications", name: "Manage job applications", description: "Change application status and add notes." },
  { key: "requests.manage", group: "Care requests", name: "Manage care requests", description: "Review website care requests and messages." },
  { key: "support.manage", group: "Support", name: "Manage support", description: "Read and answer support conversations." },
  { key: "notifications.manage", group: "Notifications", name: "Manage notifications", description: "Send announcements, view and retry emails." },
  { key: "reports.view", group: "Reports", name: "View reports", description: "Open reports and analytics." },
  { key: "reports.export", group: "Reports", name: "Export reports", description: "Download CSV exports containing personal data." },
  { key: "templates.manage", group: "Settings", name: "Manage email templates", description: "Edit transactional email templates." },
  { key: "content.manage", group: "Settings", name: "Manage website content", description: "Edit website content blocks." },
  { key: "settings.manage", group: "Settings", name: "Manage system settings", description: "Booking rules, time zone and platform settings." },
  { key: "admins.manage", group: "Access", name: "Manage admin users", description: "Invite staff, change their roles, suspend staff." },
  { key: "roles.manage", group: "Access", name: "Manage roles & permissions", description: "Create roles and change their permissions." },
  { key: "audit.view", group: "Access", name: "View audit logs", description: "Read the security and activity audit log." },
] as const;

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const SYSTEM_ROLES = [
  { key: "super_admin", name: "Super Admin", description: "Full access to everything, including admin users and roles.", isStaff: true },
  { key: "admin", name: "Admin", description: "Day-to-day administration of customers, employees, bookings and content.", isStaff: true },
  { key: "customer", name: "Customer", description: "Clients and families booking care.", isStaff: false },
  { key: "employee", name: "Employee / Care Professional", description: "Caregivers and staff who deliver care.", isStaff: false },
] as const;

export type SystemRole = (typeof SYSTEM_ROLES)[number]["key"];

const ADMIN_EXCLUDED: Permission[] = ["admins.manage", "roles.manage", "settings.manage"];

/** Default grants written when a system role is first created. */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  super_admin: [], // implicit: all
  admin: PERMISSIONS.map((p) => p.key).filter((k) => !ADMIN_EXCLUDED.includes(k)),
  customer: [],
  employee: [],
};
