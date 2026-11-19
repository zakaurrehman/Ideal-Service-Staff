import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { HeartHandshake } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { formLabels, type FormKind } from "@/lib/forms/schema";
import { statusLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { Card, EmptyState, FilterBar, LinkButton, PageHeader, Pagination, StatusBadge, Table, Td, Th, pageOf, sp, type Search } from "@/components/app/ui";

export const metadata = { title: "Care Requests" };
const STATUSES = ["new", "in_review", "contacted", "converted", "closed"] as const;
const KINDS = ["care-request", "booking", "contact", "newsletter"] as const;

export default async function Requests({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  await requireStaff("requests.manage");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const base = "/admin/requests/";
  const page = pageOf(search);
  const size = 20;
  const conds: SQL[] = [];
  const kind = sp(search, "kind");
  if ((KINDS as readonly string[]).includes(kind)) conds.push(eq(t.serviceRequests.kind, kind));
  const status = sp(search, "status");
  if ((STATUSES as readonly string[]).includes(status)) conds.push(eq(t.serviceRequests.status, status as "new"));
  const q = sp(search, "q").trim().slice(0, 80);
  if (q) conds.push(or(ilike(t.serviceRequests.reference, `%${q}%`), ilike(t.serviceRequests.name, `%${q}%`), ilike(t.serviceRequests.email, `%${q}%`))!);
  const where = conds.length ? and(...conds) : undefined;
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(t.serviceRequests).where(where).orderBy(desc(t.serviceRequests.createdAt)).limit(size).offset((page - 1) * size),
    db.select({ n: count() }).from(t.serviceRequests).where(where),
  ]);
  return (
    <>
      <PageHeader title="Care Requests" description="Website care requests, consultation requests, contact messages and newsletter sign-ups — all stored here." />
      <Card padded={false}>
        <FilterBar
          base={base}
          search={search}
          placeholder="Reference, name or email"
          filters={[
            { name: "kind", label: "Type", options: KINDS.map((k) => ({ value: k, label: formLabels[k as FormKind] })) },
            { name: "status", label: "Status", options: STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) },
          ]}
        />
        {rows.length === 0 ? (
          <EmptyState icon={<HeartHandshake className="size-6" />} title="No requests found" description="Submissions from the website forms appear here." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Reference</Th>
                <Th>Type</Th>
                <Th>From</Th>
                <Th>Received</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-canvas/60">
                  <Td>
                    <Link href={`${base}${r.id}/`} className="font-mono text-xs font-semibold hover:underline">
                      {r.reference}
                    </Link>
                  </Td>
                  <Td>{formLabels[r.kind as FormKind] ?? r.kind}</Td>
                  <Td>
                    <p className="font-semibold text-navy-950">{r.name}</p>
                    <p className="text-xs text-muted">{r.email}{r.phone ? ` · ${r.phone}` : ""}</p>
                  </Td>
                  <Td className="whitespace-nowrap">{fmtDateTime(r.createdAt, tz)}</Td>
                  <Td>
                    <StatusBadge status={r.status} />
                  </Td>
                  <Td className="text-right">
                    <LinkButton href={`${base}${r.id}/`} variant="secondary" size="sm">
                      Open
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
