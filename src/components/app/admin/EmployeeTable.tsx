import Link from "next/link";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { UserSquare2 } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { VERIFICATION_STATUSES, statusLabel, type VerificationStatus } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/time";
import { Card, EmptyState, FilterBar, LinkButton, Pagination, SortTh, StatusBadge, Table, Td, Th, pageOf, sp, type Search } from "../ui";

export async function EmployeeTable({ search, base, only }: { search: Search; base: string; only?: VerificationStatus[] }) {
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const page = pageOf(search);
  const size = 20;
  const conds: SQL[] = [];
  if (only) conds.push(inArray(t.employeeProfiles.verificationStatus, only));
  const vs = sp(search, "verification");
  if ((VERIFICATION_STATUSES as readonly string[]).includes(vs)) conds.push(eq(t.employeeProfiles.verificationStatus, vs as VerificationStatus));
  const q = sp(search, "q").trim().slice(0, 80);
  if (q) conds.push(or(ilike(t.users.email, `%${q}%`), ilike(sql`${t.userProfiles.firstName} || ' ' || ${t.userProfiles.lastName}`, `%${q}%`), ilike(t.employeeProfiles.city, `%${q}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const docsPending = sql<number>`(SELECT count(*)::int FROM employee_documents d WHERE d.employee_id = ${t.users.id} AND d.status = 'pending_review') + (SELECT count(*)::int FROM employee_certifications c WHERE c.employee_id = ${t.users.id} AND c.status = 'pending_review')`;
  const services = sql<number>`(SELECT count(*)::int FROM employee_services s WHERE s.employee_id = ${t.users.id} AND s.status = 'approved')`;
  const dir = sp(search, "dir") === "asc" ? asc : desc;
  const orderBy = sp(search, "sort") === "name" ? dir(t.userProfiles.lastName) : sp(search, "sort") === "status" ? dir(t.employeeProfiles.verificationStatus) : only ? asc(t.employeeProfiles.updatedAt) : dir(t.users.createdAt);
  const from = () =>
    db
      .select({ id: t.users.id, email: t.users.email, userStatus: t.users.status, createdAt: t.users.createdAt, first: t.userProfiles.firstName, last: t.userProfiles.lastName, city: t.employeeProfiles.city, vstatus: t.employeeProfiles.verificationStatus, docsPending, services })
      .from(t.employeeProfiles)
      .innerJoin(t.users, eq(t.users.id, t.employeeProfiles.userId))
      .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id));
  const [rows, [{ n }]] = await Promise.all([
    from().where(where).orderBy(orderBy).limit(size).offset((page - 1) * size),
    db.select({ n: count() }).from(t.employeeProfiles).innerJoin(t.users, eq(t.users.id, t.employeeProfiles.userId)).innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id)).where(where),
  ]);
  return (
    <Card padded={false}>
      <FilterBar base={base} search={search} placeholder="Name, email or city" filters={[{ name: "verification", label: "Verification", options: (only ?? VERIFICATION_STATUSES).map((s) => ({ value: s, label: statusLabel(s) })) }]} />
      {rows.length === 0 ? (
        <EmptyState icon={<UserSquare2 className="size-6" />} title={only ? "Nobody is waiting for verification" : "No employees found"} description={only ? "New registrations and submitted profiles appear here." : "Care professionals appear here when they register."} />
      ) : (
        <Table>
          <thead>
            <tr>
              <SortTh label="Name" field="name" base={base} search={search} />
              <Th>Email · City</Th>
              <SortTh label="Verification" field="status" base={base} search={search} />
              <Th>To review</Th>
              <Th>Services</Th>
              <SortTh label="Joined" field="created" base={base} search={search} />
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-canvas/60">
                <Td>
                  <Link href={`/admin/employees/${r.id}/`} className="font-semibold text-navy-950 hover:underline">
                    {r.first} {r.last}
                  </Link>
                  {r.userStatus !== "active" && <StatusBadge status={r.userStatus} className="ml-2" />}
                </Td>
                <Td>
                  {r.email}
                  <span className="block text-xs text-muted">{r.city ?? "—"}</span>
                </Td>
                <Td>
                  <StatusBadge status={r.vstatus} />
                </Td>
                <Td className="tabular-nums">{r.docsPending ? <span className="font-semibold text-amber-800">{r.docsPending} item(s)</span> : "—"}</Td>
                <Td className="tabular-nums">{r.services}</Td>
                <Td className="whitespace-nowrap">{fmtDate(r.createdAt, tz)}</Td>
                <Td className="text-right">
                  <LinkButton href={`/admin/employees/${r.id}/`} variant={only ? "teal" : "secondary"} size="sm">
                    {only ? "Review" : "View"}
                  </LinkButton>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination base={base} search={search} page={page} pageSize={size} total={n} />
    </Card>
  );
}
