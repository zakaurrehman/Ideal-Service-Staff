import { requireEmployee } from "@/lib/auth/session";
import { SettingsView } from "@/components/app/shared";
import type { Search } from "@/components/app/ui";

export const metadata = { title: "Settings" };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireEmployee();
  return <SettingsView viewer={viewer} />;
}
