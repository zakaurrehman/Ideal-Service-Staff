import Link from "next/link";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Download, Users } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/time";
import { Card, EmptyState, FilterBar, LinkButton, PageHeader, Pagination, SortTh, StatusBadge, Table, Td, Th, pageOf, sp, withParams, type Search } from "@/components/app/ui";

export const metadata = { title: "Customers" };

export default async function Customers({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireStaff("customers.view");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const base = "/admin/customers/";
  const page = pageOf(search);
  const size = 20;
  const conds: SQL[] = [];
  const q = sp(search, "q").trim().slice(0, 80);
  if (q) conds.push(or(ilike(t.users.email, `%${q}%`), ilike(sql`${t.userProfiles.firstName} || ' ' || ${t.userProfiles.lastName}`, `%${q}%`), ilike(t.userProfiles.phone, `%${q}%`))!);
  const status = sp(search, "status");
  if (["active", "suspended", "disabled"].includes(status)) conds.push(eq(t.users.status, status as "active"));
  const where = conds.length ? and(...conds) : undefined;
  const bookingsN = sql<number>`(SELECT count(*)::int FROM bookings b WHERE b.customer_id = ${t.users.id})`;
  const dir = sp(search, "dir") === "asc" ? asc : desc;
  const orderBy = sp(search, "sort") === "name" ? dir(t.userProfiles.lastName) : sp(search, "sort") === "bookings" ? dir(bookingsN) : dir(t.users.createdAt);
  const q0 = db
    .select({ id: t.users.id, email: t.users.email, status: t.users.status, verified: t.users.emailVerifiedAt, createdAt: t.users.createdAt, first: t.userProfiles.firstName, last: t.userProfiles.lastName, phone: t.userProfiles.phone, bookings: bookingsN })
    .from(t.customerProfiles)
    .innerJoin(t.users, eq(t.users.id, t.customerProfiles.userId))
    .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id))
    .where(where);
  const [rows, [{ n }]] = await Promise.all([
    q0.orderBy(orderBy).limit(size).offset((page - 1) * size),
    db.select({ n: count() }).from(t.customerProfiles).innerJoin(t.users, eq(t.users.id, t.customerProfiles.userId)).innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id)).where(where),
  ]);
  return (
    <>
      <PageHeader
        title="Customers"
        description={`${n} customer account${n === 1 ? "" : "s"}.`}
        actions={can(v, "reports.export") && <LinkButton href={withParams("/api/admin/export/customers/", search, { page: null })} variant="secondary" external><Download aria-hidden className="size-4" /> Export CSV</LinkButton>}
      />
      <Card padded={false}>
        <FilterBar base={base} search={search} placeholder="Name, email or phone" filters={[{ name: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "suspended", label: "Suspended" }] }]} />
        {rows.length === 0 ? (
          <EmptyState icon={<Users className="size-6" />} title="No customers found" description={where ? "Try a different search." : "Customers appear here when they register."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <SortTh label="Name" field="name" base={base} search={search} />
                <Th>Contact</Th>
                <SortTh label="Bookings" field="bookings" base={base} search={search} />
                <SortTh label="Joined" field="created" base={base} search={search} />
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/60">
                  <Td>
                    <Link href={`${base}${r.id}/`} className="font-semibold text-navy-950 hover:underline">
                      {r.first} {r.last}
                    </Link>
                  </Td>
                  <Td>
                    <p>{r.email}</p>
                    <p className="text-xs text-muted">{r.phone ?? "—"} · {r.verified ? "email confirmed" : "email not confirmed"}</p>
                  </Td>
                  <Td className="tabular-nums">{r.bookings}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(r.createdAt, tz)}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td className="text-right">
                    <LinkButton href={`${base}${r.id}/`} variant="secondary" size="sm">
                      View
                    </LinkButton>
                  </Td>
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
