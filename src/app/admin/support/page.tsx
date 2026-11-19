import Link from "next/link";
import { and, count, desc, eq, isNull, type SQL } from "drizzle-orm";
import { Inbox } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { timeAgo } from "@/lib/time";
import { statusLabel } from "@/lib/labels";
import { Card, EmptyState, FilterBar, PageHeader, Pagination, StatusBadge, pageOf, sp, type Search } from "@/components/app/ui";

export const metadata = { title: "Support Messages" };
const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;

export default async function AdminSupport({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  await requireStaff("support.manage");
  const db = await getDb();
  await getSettings(db);
  const base = "/admin/support/";
  const page = pageOf(search);
  const size = 20;
  const conds: SQL[] = [isNull(t.supportMessages.parentId)];
  const status = sp(search, "status");
  if ((STATUSES as readonly string[]).includes(status)) conds.push(eq(t.supportMessages.status, status as "open"));
  const where = and(...conds);
  const [rows, [{ n }]] = await Promise.all([
    db.select().from(t.supportMessages).where(where).orderBy(desc(t.supportMessages.lastActivityAt)).limit(size).offset((page - 1) * size),
    db.select({ n: count() }).from(t.supportMessages).where(where),
  ]);
  return (
    <>
      <PageHeader title="Support Messages" description="Conversations started by customers and employees from their dashboards." />
      <Card padded={false}>
        <FilterBar base={base} search={search} placeholder="Search is by status" filters={[{ name: "status", label: "Status", options: STATUSES.map((s) => ({ value: s, label: statusLabel(s) })) }]} />
        {rows.length === 0 ? (
          <EmptyState icon={<Inbox className="size-6" />} title="No conversations" description="Messages from Help & Support appear here." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`${base}${r.id}/`} className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-canvas/70">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-950">{r.subject}</p>
                    <p className="text-xs text-muted">{r.reference} · {r.name} ({r.email}) · {r.category} · {timeAgo(r.lastActivityAt)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Pagination base={base} search={search} page={page} pageSize={size} total={n} />
      </Card>
    </>
  );
}
