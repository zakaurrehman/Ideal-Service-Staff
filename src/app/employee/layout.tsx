import { Award, Bell, BriefcaseMedical, CalendarClock, CalendarDays, ClipboardList, FileText, GraduationCap, History, LayoutDashboard, LifeBuoy, Settings, Timer, UserRound } from "lucide-react";
import { and, count, eq } from "drizzle-orm";
import { AppShell } from "@/components/app/AppShell";
import { PlatformUnavailable } from "@/components/app/PlatformUnavailable";
import { requireEmployee } from "@/lib/auth/session";
import { getDb, isDatabaseConfigured, t } from "@/lib/db";
import { unreadCount } from "@/lib/notify";

export const metadata = { title: "Employee Dashboard", robots: { index: false, follow: false } };

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  if (!isDatabaseConfigured()) return <PlatformUnavailable />;
  const viewer = await requireEmployee();
  const db = await getDb();
  const [unread, [offered]] = await Promise.all([
    unreadCount(db, viewer.id),
    db.select({ n: count() }).from(t.bookingAssignments).where(and(eq(t.bookingAssignments.employeeId, viewer.id), eq(t.bookingAssignments.status, "offered"))),
  ]);
  const i = "size-[18px]";
  return (
    <AppShell
      area="employee"
      viewer={viewer}
      unread={unread}
      roleLabel="Care professional"
      settingsHref="/employee/settings/"
      notificationsHref="/employee/notifications/"
      groups={[
        {
          items: [
            { href: "/employee/dashboard/", label: "Overview", icon: <LayoutDashboard className={i} />, exact: true },
            { href: "/employee/profile/", label: "My Profile", icon: <UserRound className={i} /> },
          ],
        },
        {
          label: "Work",
          items: [
            { href: "/employee/schedule/", label: "My Schedule", icon: <CalendarDays className={i} /> },
            { href: "/employee/availability/", label: "Availability", icon: <Timer className={i} /> },
            { href: "/employee/assignments/", label: "Assigned Bookings", icon: <ClipboardList className={i} />, badge: offered.n },
            { href: "/employee/upcoming/", label: "Upcoming Appointments", icon: <CalendarClock className={i} /> },
            { href: "/employee/history/", label: "Booking History", icon: <History className={i} /> },
            { href: "/employee/services/", label: "My Services", icon: <BriefcaseMedical className={i} /> },
          ],
        },
        {
          label: "Qualifications",
          items: [
            { href: "/employee/skills/", label: "Skills & Qualifications", icon: <GraduationCap className={i} /> },
            { href: "/employee/certifications/", label: "Certifications", icon: <Award className={i} /> },
            { href: "/employee/documents/", label: "Documents", icon: <FileText className={i} /> },
          ],
        },
        {
          label: "Account",
          items: [
            { href: "/employee/notifications/", label: "Notifications", icon: <Bell className={i} />, badge: unread },
            { href: "/employee/support/", label: "Support", icon: <LifeBuoy className={i} /> },
            { href: "/employee/settings/", label: "Settings", icon: <Settings className={i} /> },
          ],
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
