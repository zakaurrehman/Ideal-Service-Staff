import Link from "next/link";
import { asc, eq, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { archiveServiceAction, saveCategoryAction } from "@/lib/actions/admin";
import { durationLabel } from "@/lib/booking/slots";
import { Badge, Card, LinkButton, PageHeader, Table, Td, Th } from "@/components/app/ui";
import { ActionButton, ActionForm, Field, FormMessage, Submit } from "@/components/app/forms";

export const metadata = { title: "Service Management" };

export default async function AdminServices() {
  await requireStaff("services.manage");
  const db = await getDb();
  const [rows, cats] = await Promise.all([
    db
      .select({
        s: t.services,
        category: t.serviceCategories.name,
        employees: sql<number>`(SELECT count(*)::int FROM employee_services es WHERE es.service_id = ${t.services.id} AND es.status = 'approved')`,
        bookings: sql<number>`(SELECT count(*)::int FROM booking_services bs WHERE bs.service_id = ${t.services.id})`,
      })
      .from(t.services)
      .leftJoin(t.serviceCategories, eq(t.serviceCategories.id, t.services.categoryId))
      .orderBy(asc(t.services.sortOrder), asc(t.services.name)),
    db.select().from(t.serviceCategories).orderBy(asc(t.serviceCategories.sortOrder)),
  ]);
  return (
    <>
      <PageHeader
        title="Service Management"
        description="Services customers can book. Archiving hides a service from booking without deleting its history."
        actions={
          <LinkButton href="/admin/services/new/">
            <Plus aria-hidden className="size-4" /> New service
          </LinkButton>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card padded={false}>
          <Table>
            <thead>
              <tr>
                <Th>Service</Th>
                <Th>Category</Th>
                <Th>Default visit</Th>
                <Th>Approved staff</Th>
                <Th>Bookings</Th>
                <Th>State</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, category, employees, bookings }) => (
                <tr key={s.id} className={s.archivedAt ? "opacity-60" : "hover:bg-canvas/60"}>
                  <Td>
                    <Link href={`/admin/services/${s.id}/`} className="font-semibold text-navy-950 hover:underline">
                      {s.name}
                    </Link>
                    <span className="block font-mono text-xs text-muted">/{s.slug}/</span>
                  </Td>
                  <Td>{category ?? "—"}</Td>
                  <Td>{durationLabel(s.defaultDurationMinutes)}</Td>
                  <Td className="tabular-nums">{employees}</Td>
                  <Td className="tabular-nums">{bookings}</Td>
                  <Td>{s.archivedAt ? <Badge>Archived</Badge> : s.isActive ? <Badge tone="teal">{s.isBookable ? "Bookable" : "Info only"}</Badge> : <Badge tone="amber">Disabled</Badge>}</Td>
                  <Td className="whitespace-nowrap text-right">
                    <LinkButton href={`/admin/services/${s.id}/`} variant="secondary" size="sm">
                      Edit
                    </LinkButton>{" "}
                    <ActionButton action={archiveServiceAction.bind(null, s.id, !s.archivedAt)} variant="ghost" confirm={s.archivedAt ? undefined : { title: `Archive ${s.name}?`, body: "Customers won’t be able to book it. Existing bookings are unaffected.", cta: "Archive" }}>
                      {s.archivedAt ? "Restore" : "Archive"}
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card>
        <Card title="Categories">
          <ul className="mb-5 space-y-2">
            {cats.map((c) => (
              <li key={c.id}>
                <ActionForm action={saveCategoryAction} className="flex gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <input name="name" defaultValue={c.name} aria-label="Category name" className="h-10 min-w-0 flex-1 rounded-full border border-line px-4 text-sm" />
                  <Submit variant="secondary" className="h-10 px-4">
                    Save
                  </Submit>
                </ActionForm>
              </li>
            ))}
          </ul>
          <ActionForm action={saveCategoryAction} className="space-y-3">
            <FormMessage />
            <Field name="name" label="New category" />
            <Submit variant="secondary">Add category</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
