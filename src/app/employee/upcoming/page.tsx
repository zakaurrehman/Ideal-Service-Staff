import { requireEmployee } from "@/lib/auth/session";
import { PageHeader } from "@/components/app/ui";
import { AssignmentList } from "@/components/app/employee/Assignments";

export const metadata = { title: "Upcoming Appointments" };

export default async function Page() {
  const viewer = await requireEmployee();
  return (
    <>
      <PageHeader title="Upcoming Appointments" description="Accepted visits that are still to come." />
      <AssignmentList viewer={viewer} scope="upcoming" empty={{ title: "No upcoming appointments", description: "Accepted assignments will appear here." }} />
    </>
  );
}
