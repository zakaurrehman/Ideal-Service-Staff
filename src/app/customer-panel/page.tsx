import { DashboardGateway } from "@/components/portal/DashboardGateway";
import { pageMetadata } from "@/lib/seo";

/**
 * Gateway for the Amelia customer panel on the WordPress portal.
 * Forwards there when the dashboard actually works; otherwise explains why not.
 */
export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Customer Dashboard",
  description: "Manage your Ideal Service Staff appointments and bookings.",
  path: "/customer-panel/",
  noindex: true,
});

export default function CustomerPanelPage() {
  return <DashboardGateway kind="customer" />;
}
