import { Activity, BarChart3, Bell, BriefcaseMedical, CalendarDays, CalendarRange, ClipboardCheck, FileText, Globe, HeartHandshake, KeyRound, LayoutDashboard, Mail, MessagesSquare, Settings, ShieldCheck, UserCog, Users, UserSquare2 } from "lucide-react";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { AppShell } from "@/components/app/AppShell";
import { PlatformUnavailable } from "@/components/app/PlatformUnavailable";
import type { NavItem } from "@/components/app/ShellNav";
import { requireStaff } from "@/lib/auth/session";
import type { Permission } from "@/lib/auth/permissions";
import { getDb, isDatabaseConfigured, t } from "@/lib/db";
import { unreadCount } from "@/lib/notify";

export const metadata = { title: { default: "Admin", template: "%s · Admin | Ideal Service Staff" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isDatabaseConfigured()) return <PlatformUnavailable />;
  const v = await requireStaff();
  const db = await getDb();
  const [unread, [pendingBookings], [pendingVerif], [newApps], [openSupport]] = await Promise.all([
    unreadCount(db, v.id),
    db.select({ n: count() }).from(t.bookings).where(inArray(t.bookings.status, ["pending_review", "pending_assignment", "cancellation_requested"])),
    db.select({ n: count() }).from(t.employeeProfiles).where(inArray(t.employeeProfiles.verificationStatus, ["verification_pending", "under_review"])),
    db.select({ n: count() }).from(t.jobApplications).where(eq(t.jobApplications.status, "submitted")),
    db.select({ n: count() }).from(t.supportMessages).where(and(isNull(t.supportMessages.parentId), eq(t.supportMessages.status, "open"))),
  ]);
  const i = "size-[18px]";
  const item = (perm: Permission | null, n: NavItem) => (!perm || v.permissions.has(perm) ? [n] : []);
  const groups = [
    { items: [{ href: "/admin/", label: "Dashboard", icon: <LayoutDashboard className={i} />, exact: true }] },
    {
      label: "People",
      items: [
        ...item("customers.view", { href: "/admin/customers/", label: "Customers", icon: <Users className={i} /> }),
        ...item("employees.view", { href: "/admin/employees/", label: "Employees", icon: <UserSquare2 className={i} /> }),
        ...item("employees.verify", { href: "/admin/verification/", label: "Employee Verification", icon: <ShieldCheck className={i} />, badge: pendingVerif.n }),
      ],
    },
    {
      label: "Operations",
      items: [
        ...item("bookings.view", { href: "/admin/bookings/", label: "Bookings", icon: <CalendarRange className={i} />, badge: pendingBookings.n }),
        ...item("bookings.view", { href: "/admin/calendar/", label: "Calendar", icon: <CalendarDays className={i} /> }),
        ...item("services.manage", { href: "/admin/services/", label: "Service Management", icon: <BriefcaseMedical className={i} /> }),
        ...item("applications.view", { href: "/admin/applications/", label: "Job Applications", icon: <ClipboardCheck className={i} />, badge: newApps.n }),
        ...item("requests.manage", { href: "/admin/requests/", label: "Care Requests", icon: <HeartHandshake className={i} /> }),
      ],
    },
    {
      label: "Communication",
      items: [
        { href: "/admin/notifications/", label: "Notifications", icon: <Bell className={i} />, badge: unread },
        ...item("support.manage", { href: "/admin/support/", label: "Support Messages", icon: <MessagesSquare className={i} />, badge: openSupport.n }),
        ...item("templates.manage", { href: "/admin/templates/", label: "Email Templates", icon: <Mail className={i} /> }),
      ],
    },
    {
      label: "Insights & content",
      items: [
        ...item("reports.view", { href: "/admin/reports/", label: "Reports & Analytics", icon: <BarChart3 className={i} /> }),
        ...item("content.manage", { href: "/admin/content/", label: "Website Content", icon: <Globe className={i} /> }),
      ],
    },
    {
      label: "Administration",
      items: [
        ...item("admins.manage", { href: "/admin/users/", label: "Admin Users", icon: <UserCog className={i} /> }),
        ...item("roles.manage", { href: "/admin/roles/", label: "Roles & Permissions", icon: <KeyRound className={i} /> }),
        ...item("settings.manage", { href: "/admin/settings/", label: "Settings", icon: <Settings className={i} /> }),
        ...item("audit.view", { href: "/admin/audit/", label: "Audit Logs", icon: <Activity className={i} /> }),
        { href: "/admin/account/", label: "My Account", icon: <FileText className={i} /> },
      ],
    },
  ].filter((g) => g.items.length);
  const roleLabel = v.isSuperAdmin ? "Super Admin" : v.roles.includes("admin") ? "Admin" : "Staff";
  return (
    <AppShell area="admin" viewer={v} unread={unread} roleLabel={roleLabel} settingsHref="/admin/account/" notificationsHref="/admin/notifications/" groups={groups}>
      {children}
    </AppShell>
  );
}
