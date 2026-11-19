import { asc, eq, sql } from "drizzle-orm";
import { Lock } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { createRoleAction, deleteRoleAction, saveRolePermissionsAction } from "@/lib/actions/admin";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Badge, Card, PageHeader } from "@/components/app/ui";
import { ActionButton, ActionForm, Checkbox, Field, FormMessage, Submit } from "@/components/app/forms";

export const metadata = { title: "Roles & Permissions" };

export default async function Roles() {
  await requireStaff("roles.manage");
  const db = await getDb();
  const [roles, grants] = await Promise.all([
    db
      .select({ r: t.roles, members: sql<number>`(SELECT count(*)::int FROM user_roles ur WHERE ur.role_id = ${t.roles.id})` })
      .from(t.roles)
      .where(eq(t.roles.isStaff, true))
      .orderBy(asc(t.roles.createdAt)),
    db.select().from(t.rolePermissions),
  ]);
  const groups = [...new Set(PERMISSIONS.map((p) => p.group))];
  return (
    <>
      <PageHeader title="Roles & Permissions" description="Each staff role grants a set of permissions. Every permission is enforced on the server. Customer and employee roles have no admin permissions." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          {roles.map(({ r, members }) => {
            const has = new Set(grants.filter((g) => g.roleId === r.id).map((g) => g.permissionKey));
            const locked = r.key === "super_admin";
            return (
              <details key={r.id} className="rounded-3xl border border-line bg-white shadow-soft" open={!locked && roles.length <= 3}>
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-6 py-4">
                  <span className="flex-1">
                    <span className="flex items-center gap-2 font-semibold text-navy-950">
                      {r.name} {r.isSystem && <Badge tone="navy">System</Badge>}
                    </span>
                    <span className="text-sm text-muted">{r.description}</span>
                  </span>
                  <span className="text-sm text-muted">
                    {members} member{members === 1 ? "" : "s"} · {locked ? "all" : has.size} permissions
                  </span>
                </summary>
                <div className="border-t border-line px-6 py-5">
                  {locked ? (
                    <p className="flex items-center gap-2 text-sm text-muted">
                      <Lock aria-hidden className="size-4" /> Super Admin always has every permission and can’t be edited.
                    </p>
                  ) : (
                    <ActionForm action={saveRolePermissionsAction} className="space-y-5">
                      <input type="hidden" name="roleId" value={r.id} />
                      <FormMessage />
                      <div className="grid gap-5 md:grid-cols-2">
                        {groups.map((g) => (
                          <fieldset key={g} className="space-y-2">
                            <legend className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">{g}</legend>
                            {PERMISSIONS.filter((p) => p.group === g).map((p) => (
                              <Checkbox key={p.key} name="perm" value={p.key} label={p.name} hint={p.description} defaultChecked={has.has(p.key)} />
                            ))}
                          </fieldset>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Submit>Save {r.name}</Submit>
                      </div>
                    </ActionForm>
                  )}
                  {!r.isSystem && members === 0 && (
                    <div className="mt-4 border-t border-line pt-4">
                      <ActionButton action={deleteRoleAction.bind(null, r.id)} variant="danger" confirm={{ title: `Delete role ${r.name}?`, cta: "Delete" }}>
                        Delete role
                      </ActionButton>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
        <Card title="Create a role" description="e.g. “Scheduler” with only bookings and calendar access.">
          <ActionForm action={createRoleAction} className="space-y-4">
            <FormMessage />
            <Field name="name" label="Role name" required />
            <Field name="description" label="Description" />
            <Submit variant="teal">Create role</Submit>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
