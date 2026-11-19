import { requireCustomer } from "@/lib/auth/session";
import { SupportListView } from "@/components/app/shared";

export const metadata = { title: "Help & Support" };

export default async function Page() {
  return <SupportListView viewer={await requireCustomer()} base="/customer/support/" />;
}
