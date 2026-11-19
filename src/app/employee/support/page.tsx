import { requireEmployee } from "@/lib/auth/session";
import { SupportListView } from "@/components/app/shared";

export const metadata = { title: "Support" };

export default async function Page() {
  return <SupportListView viewer={await requireEmployee()} base="/employee/support/" />;
}
