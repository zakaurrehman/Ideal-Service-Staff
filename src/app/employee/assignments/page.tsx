import { requireEmployee } from "@/lib/auth/session";
import { PageHeader } from "@/components/app/ui";
import { AssignmentList } from "@/components/app/employee/Assignments";

export const metadata = { title: "Assigned Bookings" };

export default async function Page() {
  const viewer = await requireEmployee();
  return (
    <>
      <PageHeader title="Assigned Bookings" description="Assignments offered to you and the visits you’ve accepted." />
      <h2 className="mb-3 text-base font-bold text-navy-950">Awaiting your response</h2>
      <AssignmentList viewer={viewer} scope="offered" empty={{ title: "No new offers", description: "When the office offers you a visit, you can accept or decline it here." }} />
      <h2 className="mb-3 mt-8 text-base font-bold text-navy-950">All current assignments</h2>
      <AssignmentList viewer={viewer} scope="active" empty={{ title: "No current assignments", description: "Accepted and offered visits that haven’t happened yet appear here." }} />
    </>
  );
}
