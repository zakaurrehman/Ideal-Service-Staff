import { Download } from "lucide-react";
import { can, requireStaff } from "@/lib/auth/session";
import { LinkButton, PageHeader, withParams, type Search } from "@/components/app/ui";
import { EmployeeTable } from "@/components/app/admin/EmployeeTable";

export const metadata = { title: "Employees" };

export default async function Employees({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireStaff("employees.view");
  return (
    <>
      <PageHeader
        title="Employees"
        description="Care professionals, their verification status and approved services."
        actions={can(v, "reports.export") && <LinkButton href={withParams("/api/admin/export/employees/", search, { page: null })} variant="secondary" external><Download aria-hidden className="size-4" /> Export CSV</LinkButton>}
      />
      <EmployeeTable search={search} base="/admin/employees/" />
    </>
  );
}
