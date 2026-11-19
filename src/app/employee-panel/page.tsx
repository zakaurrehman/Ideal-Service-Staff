import { DashboardGateway } from "@/components/portal/DashboardGateway";
import { pageMetadata } from "@/lib/seo";

/**
 * Gateway for the Amelia employee panel on the WordPress portal.
 * Forwards there when the dashboard actually works; otherwise explains why not.
 */
export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Employee Dashboard",
  description: "Access your Ideal Service Staff schedule and assigned appointments.",
  path: "/employee-panel/",
  noindex: true,
});

export default function EmployeePanelPage() {
  return <DashboardGateway kind="employee" />;
}
