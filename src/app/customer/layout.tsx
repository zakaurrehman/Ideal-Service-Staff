import { CalendarCheck, CalendarClock, CalendarPlus, History, Home, LayoutDashboard, LifeBuoy, MapPin, Bell, Settings, UserRound, Users, HeartHandshake } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { requireCustomer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { unreadCount } from "@/lib/notify";
import { PlatformUnavailable } from "@/components/app/PlatformUnavailable";
import { isDatabaseConfigured } from "@/lib/db";

export const metadata = { title: "Customer Dashboard", robots: { index: false, follow: false } };

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  if (!isDatabaseConfigured()) return <PlatformUnavailable />;
  const viewer = await requireCustomer();
  const unread = await unreadCount(await getDb(), viewer.id);
  const i = "size-[18px]";
  return (
    <AppShell
      area="customer"
      viewer={viewer}
      unread={unread}
      roleLabel="Client account"
      settingsHref="/customer/settings/"
      notificationsHref="/customer/notifications/"
      groups={[
        {
          items: [
            { href: "/customer/dashboard/", label: "Overview", icon: <LayoutDashboard className={i} />, exact: true },
            { href: "/customer/book/", label: "Book a Service", icon: <CalendarPlus className={i} /> },
          ],
        },
        {
          label: "Care",
          items: [
            { href: "/customer/bookings/", label: "My Bookings", icon: <CalendarCheck className={i} /> },
            { href: "/customer/appointments/", label: "Upcoming Appointments", icon: <CalendarClock className={i} /> },
            { href: "/customer/history/", label: "Booking History", icon: <History className={i} /> },
            { href: "/customer/professionals/", label: "My Care Professionals", icon: <HeartHandshake className={i} /> },
            { href: "/customer/dependents/", label: "My Family / Dependents", icon: <Users className={i} /> },
          ],
        },
        {
          label: "Account",
          items: [
            { href: "/customer/profile/", label: "My Profile", icon: <UserRound className={i} /> },
            { href: "/customer/addresses/", label: "Addresses", icon: <MapPin className={i} /> },
            { href: "/customer/notifications/", label: "Notifications", icon: <Bell className={i} />, badge: unread },
            { href: "/customer/support/", label: "Help & Support", icon: <LifeBuoy className={i} /> },
            { href: "/customer/settings/", label: "Settings", icon: <Settings className={i} /> },
            { href: "/", label: "Public website", icon: <Home className={i} />, exact: true },
          ],
        },
      ]}
    >
      {children}
    </AppShell>
  );
}
