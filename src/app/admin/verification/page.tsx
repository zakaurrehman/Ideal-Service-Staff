import { requireStaff } from "@/lib/auth/session";
import { PageHeader, type Search } from "@/components/app/ui";
import { EmployeeTable } from "@/components/app/admin/EmployeeTable";

export const metadata = { title: "Employee Verification" };

export default async function Verification({ searchParams }: { searchParams: Promise<Search> }) {
  await requireStaff("employees.verify");
  return (
    <>
      <PageHeader title="Employee Verification" description="Professionals waiting for review — oldest first. Only approved professionals can be assigned to bookings." />
      <EmployeeTable search={await searchParams} base="/admin/verification/" only={["application_received", "under_review", "documents_required", "verification_pending"]} />
    </>
  );
}
