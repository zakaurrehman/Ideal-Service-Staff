import { asc } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { Card, PageHeader } from "@/components/app/ui";
import { ServiceForm } from "@/components/app/admin/ServiceForm";

export const metadata = { title: "New service" };

export default async function NewService() {
  await requireStaff("services.manage");
  const db = await getDb();
  const categories = await db.select({ id: t.serviceCategories.id, name: t.serviceCategories.name }).from(t.serviceCategories).orderBy(asc(t.serviceCategories.sortOrder));
  return (
    <>
      <PageHeader title="New service" crumbs={[{ label: "Services", href: "/admin/services/" }, { label: "New" }]} />
      <Card>
        <ServiceForm categories={categories} />
      </Card>
    </>
  );
}
