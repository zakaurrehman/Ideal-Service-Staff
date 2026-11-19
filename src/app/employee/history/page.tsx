import { requireEmployee } from "@/lib/auth/session";
import { PageHeader } from "@/components/app/ui";
import { AssignmentList } from "@/components/app/employee/Assignments";

export const metadata = { title: "Booking History" };

export default async function Page() {
  const viewer = await requireEmployee();
  return (
    <>
      <PageHeader title="Booking History" description="Your completed and past visits." />
      <AssignmentList viewer={viewer} scope="history" empty={{ title: "No past visits yet", description: "Completed visits will be listed here." }} />
    </>
  );
}
