import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { requestServiceAction, withdrawServiceAction } from "@/lib/actions/employee";
import { PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionButton } from "@/components/app/forms";

export const metadata = { title: "My Services" };

export default async function ServicesPage() {
  const v = await requireEmployee();
  const db = await getDb();
  const [services, mine] = await Promise.all([
    db
      .select({ id: t.services.id, name: t.services.name, summary: t.services.summary, category: t.serviceCategories.name })
      .from(t.services)
      .leftJoin(t.serviceCategories, eq(t.serviceCategories.id, t.services.categoryId))
      .where(and(eq(t.services.isActive, true), isNull(t.services.archivedAt)))
      .orderBy(asc(t.services.sortOrder)),
    db.select().from(t.employeeServices).where(eq(t.employeeServices.employeeId, v.id)),
  ]);
  const state = new Map(mine.map((m) => [m.serviceId, m.status]));
  return (
    <>
      <PageHeader title="My Services" description="Choose the services you’re qualified to provide. Our team approves each one before you can be assigned to it." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map((s, i) => {
          const st = state.get(s.id);
          return (
            <article key={s.id} className="enter flex flex-col rounded-3xl border border-line bg-white p-5 shadow-soft" style={{ ["--d" as string]: `${Math.min(i, 12) * 0.03}s` }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">{s.category}</p>
                  <h2 className="mt-1 font-semibold text-navy-950">{s.name}</h2>
                </div>
                {st && <StatusBadge status={st} />}
              </div>
              <p className="mt-2 flex-1 text-sm text-muted">{s.summary}</p>
              <div className="mt-4">
                {!st || st === "revoked" ? (
                  st === "revoked" ? (
                    <p className="text-xs text-muted">Not currently approved — contact the office.</p>
                  ) : (
                    <ActionButton action={requestServiceAction.bind(null, s.id)} variant="teal">
                      I can provide this
                    </ActionButton>
                  )
                ) : st === "requested" ? (
                  <ActionButton action={withdrawServiceAction.bind(null, s.id)} variant="ghost">
                    Withdraw request
                  </ActionButton>
                ) : (
                  <p className="text-xs font-semibold text-teal-800">Approved — you can receive these assignments.</p>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
