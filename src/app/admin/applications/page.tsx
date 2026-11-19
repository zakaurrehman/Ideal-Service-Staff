import Link from "next/link";
import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { ClipboardCheck, Download } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { APPLICATION_STATUSES, statusLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/time";
import { Card, EmptyState, FilterBar, LinkButton, PageHeader, Pagination, SortTh, StatusBadge, Table, Td, Th, pageOf, sp, withParams, type Search } from "@/components/app/ui";

export const metadata = { title: "Job Applications" };

export default async function Applications({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireStaff("applications.view");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const base = "/admin/applications/";
  const page = pageOf(search);
  const size = 20;
  const conds: SQL[] = [];
  const status = sp(search, "status");
  if ((APPLICATION_STATUSES as readonly string[]).includes(status)) conds.push(eq(t.jobApplications.status, status as "submitted"));
  const q = sp(search, "q").trim().slice(0, 80);
  if (q) conds.push(or(ilike(t.jobApplications.reference, `%${q}%`), ilike(t.jobApplications.email, `%${q}%`), ilike(sql`${t.jobApplications.firstName} || ' ' || ${t.jobApplications.lastName}`, `%${q}%`), ilike(t.jobApplications.city, `%${q}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const docs = sql<number>`(SELECT count(*)::int FROM application_documents d WHERE d.application_id = ${t.jobApplications.id})`;
  const dir = sp(search, "dir") === "asc" ? asc : desc;
  const orderBy = sp(search, "sort") === "name" ? dir(t.jobApplications.lastName) : sp(search, "sort") === "status" ? dir(t.jobApplications.status) : dir(t.jobApplications.createdAt);
  const [rows, [{ n }]] = await Promise.all([
    db.select({ a: t.jobApplications, docs }).from(t.jobApplications).where(where).orderBy(orderBy).limit(size).offset((page - 1) * size),
    db.select({ n: count() }).from(t.jobApplications).where(where),
  ]);
  return (
    <>
      <PageHeader
        title="Job Applications"
        description={`${n} application${n === 1 ? "" : "s"}.`}
        actions={can(v, "reports.export") && <LinkButton href={withParams("/api/admin/export/applications/", search, { page: null })} variant="secondary" external><Download aria-hidden className="size-4" /> Export CSV</LinkButton>}
      />
      <Card padded={false}>
        <FilterBar base={base} search={search} placeholder="Reference, name, email or city" filters={[{ name: "status", label: "Status", options: APPLICATION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) }]} />
        {rows.length === 0 ? (
          <EmptyState icon={<ClipboardCheck className="size-6" />} title="No applications found" description="Applications submitted on the Careers page appear here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Reference</Th>
                <SortTh label="Applicant" field="name" base={base} search={search} />
                <Th>Positions</Th>
                <Th>Documents</Th>
                <SortTh label="Received" field="created" base={base} search={search} />
                <SortTh label="Status" field="status" base={base} search={search} />
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ a, docs }) => (
                <tr key={a.id} className="hover:bg-canvas/60">
                  <Td>
                    <Link href={`${base}${a.id}/`} className="font-mono text-xs font-semibold hover:underline">
                      {a.reference}
                    </Link>
                  </Td>
                  <Td>
                    <p className="font-semibold text-navy-950">{a.firstName} {a.lastName}</p>
                    <p className="text-xs text-muted">{a.email} · {a.city}</p>
                  </Td>
                  <Td className="max-w-56 truncate">{a.positions.join(", ")}</Td>
                  <Td className="tabular-nums">{docs}</Td>
                  <Td className="whitespace-nowrap">{fmtDate(a.createdAt, tz)}</Td>
                  <Td>
                    <StatusBadge status={a.status} />
                  </Td>
                  <Td className="text-right">
                    <LinkButton href={`${base}${a.id}/`} variant="secondary" size="sm">
                      Review
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
