import { asc, eq } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { inviteStaffAction, setStaffRoleAction, setUserStatusAction } from "@/lib/actions/admin";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { Badge, Card, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionButton, ActionForm, Checkbox, Field, FormMessage, Select, Submit } from "@/components/app/forms";

export const metadata = { title: "Admin Users" };

export default async function AdminUsers() {
  const v = await requireStaff("admins.manage");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const [roles, rows] = await Promise.all([
    db.select().from(t.roles).where(eq(t.roles.isStaff, true)).orderBy(asc(t.roles.createdAt)),
    db
      .select({ id: t.users.id, email: t.users.email, status: t.users.status, lastLogin: t.users.lastLoginAt, hasPassword: t.users.passwordHash, first: t.userProfiles.firstName, last: t.userProfiles.lastName, roleId: t.roles.id, roleName: t.roles.name })
      .from(t.userRoles)
      .innerJoin(t.roles, eq(t.roles.id, t.userRoles.roleId))
      .innerJoin(t.users, eq(t.users.id, t.userRoles.userId))
      .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id))
      .where(eq(t.roles.isStaff, true)),
  ]);
  const staff = [...new Map(rows.map((r) => [r.id, { ...r, roles: rows.filter((x) => x.id === r.id) }])).values()];
  const grantable = roles.filter((r) => v.isSuperAdmin || r.key !== "super_admin");
  return (
    <>
      <PageHeader title="Admin Users" description="Staff who can sign in to this administration area. Invitations are sent by email; nobody receives a default password." />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          {staff.map((s) => (
            <details key={s.id} className="group rounded-3xl border border-line bg-white shadow-soft">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-6 py-4">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy-950">
                    {s.first} {s.last} {s.id === v.id && <Badge tone="navy">You</Badge>}
                  </span>
                  <span className="text-sm text-muted">
                    {s.email} · {s.hasPassword ? (s.lastLogin ? `last sign-in ${fmtDateTime(s.lastLogin, tz)}` : "never signed in") : "invitation pending"}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1">{s.roles.map((r) => <Badge key={r.roleId} tone="teal">{r.roleName}</Badge>)}</span>
                <StatusBadge status={s.status} />
              </summary>
              {s.id !== v.id && (
                <div className="grid gap-6 border-t border-line px-6 py-5 md:grid-cols-2">
                  <ActionForm action={setStaffRoleAction} className="space-y-3">
                    <input type="hidden" name="userId" value={s.id} />
                    <FormMessage />
                    <p className="text-sm font-semibold text-navy-900">Roles</p>
                    {grantable.map((r) => (
                      <Checkbox key={r.id} name="roleId" value={r.id} label={r.name} hint={r.description} defaultChecked={s.roles.some((x) => x.roleId === r.id)} />
                    ))}
                    <Submit variant="secondary">Save roles</Submit>
                  </ActionForm>
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-navy-900">Access</p>
                    {s.status === "active" ? (
                      <ActionButton action={setUserStatusAction.bind(null, s.id, "suspended")} variant="danger" confirm={{ title: `Suspend ${s.first}?`, body: "They are signed out immediately and can’t sign in.", cta: "Suspend" }}>
                        Suspend access
                      </ActionButton>
                    ) : (
                      <ActionButton action={setUserStatusAction.bind(null, s.id, "active")} variant="teal">
                        Restore access
                      </ActionButton>
                    )}
                  </div>
                </div>
              )}
            </details>
          ))}
        </div>
        <Card title="Invite a staff member">
          <ActionForm action={inviteStaffAction} className="space-y-4">
            <FormMessage />
            <div className="grid grid-cols-2 gap-3">
              <Field name="firstName" label="First name" required />
              <Field name="lastName" label="Last name" required />
            </div>
            <Field name="email" type="email" label="Work email" required />
            <Select name="roleId" label="Role" options={grantable.map((r) => ({ value: r.id, label: r.name }))} placeholder="Choose…" required />
            <Submit variant="teal" className="w-full">
              Send invitation
            </Submit>
            <p className="text-xs text-muted">The invitee sets their own password from a single-use link that expires in 72 hours.</p>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
