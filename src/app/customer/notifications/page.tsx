import { requireCustomer } from "@/lib/auth/session";
import { NotificationsView } from "@/components/app/shared";
import type { Search } from "@/components/app/ui";

export const metadata = { title: "Notifications" };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireCustomer();
  return <NotificationsView viewer={viewer} base="/customer/notifications/" search={await searchParams} />;
}
