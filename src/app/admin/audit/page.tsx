import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { Card, EmptyState, FilterBar, PageHeader, Pagination, Table, Td, Th, pageOf, sp, type Search } from "@/components/app/ui";

export const metadata = { title: "Audit Logs" };

export default async function Audit({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  await requireStaff("audit.view");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const base = "/admin/audit/";
  const page = pageOf(search);
  const size = 30;
  const conds: SQL[] = [];
  const q = sp(search, "q").trim().slice(0, 80);
  if (q) conds.push(or(ilike(t.auditLogs.summary, `%${q}%`), ilike(t.auditLogs.action, `%${q}%`), ilike(t.users.email, `%${q}%`))!);
  const area = sp(search, "area");
  if (area) conds.push(ilike(t.auditLogs.action, `${area}.%`));
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db
      .select({ a: t.auditLogs, email: t.users.email })
      .from(t.auditLogs)
      .leftJoin(t.users, eq(t.users.id, t.auditLogs.actorId))
      .where(where)
      .orderBy(desc(t.auditLogs.createdAt))
      .limit(size)
      .offset((page - 1) * size),
    db.select({ n: count() }).from(t.auditLogs).leftJoin(t.users, eq(t.users.id, t.auditLogs.actorId)).where(where),
  ]);
  const areas = ["auth", "booking", "employee", "user", "application", "service", "staff", "role", "settings", "report", "template", "email", "announcement"];
  return (
    <>
      <PageHeader title="Audit Logs" description="Security and administrative activity: sign-ins, lockouts, status changes, exports and permission changes." />
      <Card padded={false}>
        <FilterBar base={base} search={search} placeholder="Search action, summary or user email" filters={[{ name: "area", label: "Area", options: areas.map((a) => ({ value: a, label: a })) }]} />
        {rows.length === 0 ? (
          <EmptyState title="No matching entries" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>Action</Th>
                <Th>Summary</Th>
                <Th>IP</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, email }) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap text-xs">{fmtDateTime(a.createdAt, tz)}</Td>
                  <Td className="max-w-48 truncate text-xs">{email ?? "system"}</Td>
                  <Td>
                    <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">{a.action}</code>
                  </Td>
                  <Td className="text-sm">{a.summary}</Td>
                  <Td className="text-xs text-muted">{a.ip ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination base={base} search={search} page={page} pageSize={size} total={n} />
      </Card>
    </>
  );
}
