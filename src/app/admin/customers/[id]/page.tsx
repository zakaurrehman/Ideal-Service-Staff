import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { addCustomerNoteAction, setUserStatusAction } from "@/lib/actions/admin";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtDateTime, fmtTime } from "@/lib/time";
import { Card, DL, EmptyState, LinkButton, PageHeader, StatusBadge, Table, Td, Th } from "@/components/app/ui";
import { ActionButton, ActionForm, FormMessage, Submit, TextArea } from "@/components/app/forms";
import { Avatar } from "@/components/app/AppShell";

export default async function CustomerDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await requireStaff("customers.view");
  const db = await getDb();
  const [c] = await db
    .select({ u: t.users, p: t.userProfiles, cp: t.customerProfiles, prefs: t.customerPreferences })
    .from(t.customerProfiles)
    .innerJoin(t.users, eq(t.users.id, t.customerProfiles.userId))
    .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id))
    .leftJoin(t.customerPreferences, eq(t.customerPreferences.customerId, t.users.id))
    .where(eq(t.users.id, id));
  if (!c) notFound();
  const tz = (await getSettings(db)).timezone;
  const [addresses, dependents, bookings, notes] = await Promise.all([
    db.select().from(t.customerAddresses).where(and(eq(t.customerAddresses.customerId, id), isNull(t.customerAddresses.archivedAt))),
    db.select().from(t.customerDependents).where(and(eq(t.customerDependents.customerId, id), isNull(t.customerDependents.archivedAt))),
    db
      .select({ id: t.bookings.id, reference: t.bookings.reference, startsAt: t.bookings.startsAt, status: t.bookings.status, service: sql<string>`(SELECT service_name FROM booking_services WHERE booking_id = ${t.bookings.id} LIMIT 1)` })
      .from(t.bookings)
      .where(eq(t.bookings.customerId, id))
      .orderBy(desc(t.bookings.startsAt))
      .limit(50),
    db
      .select({ n: t.customerNotes, first: t.userProfiles.firstName, last: t.userProfiles.lastName })
      .from(t.customerNotes)
      .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.customerNotes.authorId))
      .where(eq(t.customerNotes.customerId, id))
      .orderBy(desc(t.customerNotes.createdAt)),
  ]);
  const manage = can(v, "customers.manage");
  const name = `${c.p.firstName} ${c.p.lastName}`;
  return (
    <>
      <PageHeader
        title={name}
        crumbs={[{ label: "Customers", href: "/admin/customers/" }, { label: name }]}
        description={<span className="flex items-center gap-2">Customer since {fmtDate(c.u.createdAt, tz)} <StatusBadge status={c.u.status} /></span>}
        actions={
          manage &&
          (c.u.status === "active" ? (
            <ActionButton action={setUserStatusAction.bind(null, id, "suspended")} variant="danger" confirm={{ title: `Suspend ${name}?`, body: "They will be signed out and unable to sign in until reactivated.", cta: "Suspend" }}>
              Suspend account
            </ActionButton>
          ) : (
            <ActionButton action={setUserStatusAction.bind(null, id, "active")} variant="teal">
              Reactivate
            </ActionButton>
          ))
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Profile">
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={name} fileId={c.p.avatarFileId} size={56} />
              <p className="text-sm text-muted">Last sign-in: {c.u.lastLoginAt ? fmtDateTime(c.u.lastLoginAt, tz) : "never"}</p>
            </div>
            <DL
              items={[
                { label: "Email", value: `${c.u.email}${c.u.emailVerifiedAt ? " (confirmed)" : " (not confirmed)"}` },
                { label: "Phone", value: c.p.phone ?? "—" },
                { label: "Preferred contact", value: c.cp.preferredContact },
                { label: "Language", value: c.prefs?.preferredLanguage ?? "—" },
                { label: "Caregiver preference", value: c.prefs?.caregiverGenderPreference?.replace("_", " ") ?? "—" },
                { label: "Pets in home", value: c.prefs ? (c.prefs.hasPets ? "Yes" : "No") : "—" },
                { label: "Notes from customer", value: c.prefs?.notes ?? "—" },
              ]}
            />
          </Card>
          <Card title="Bookings" padded={false} actions={<LinkButton href={`/admin/bookings/?q=${encodeURIComponent(c.u.email)}`} variant="ghost" size="sm">Open in Bookings</LinkButton>}>
            {bookings.length === 0 ? (
              <EmptyState compact title="No bookings yet" />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Reference</Th>
                    <Th>Service</Th>
                    <Th>Date</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <Td>
                        <Link href={`/admin/bookings/${b.id}/`} className="font-mono text-xs font-semibold hover:underline">
                          {b.reference}
                        </Link>
                      </Td>
                      <Td>{b.service}</Td>
                      <Td className="whitespace-nowrap">
                        {fmtDate(b.startsAt, tz)} · {fmtTime(b.startsAt, tz)}
                      </Td>
                      <Td>
                        <StatusBadge status={b.status} />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
        <div className="space-y-6">
          <Card title="Addresses">
            {addresses.length === 0 ? <p className="text-sm text-muted">None saved.</p> : <ul className="space-y-2 text-sm">{addresses.map((a) => <li key={a.id}><span className="font-semibold">{a.label}</span> — {a.line1}, {a.city} {a.postalCode}</li>)}</ul>}
          </Card>
          <Card title="Family / dependents">
            {dependents.length === 0 ? <p className="text-sm text-muted">None added.</p> : <ul className="space-y-2 text-sm">{dependents.map((d) => <li key={d.id}><span className="font-semibold">{d.firstName} {d.lastName}</span> — {d.relationship}{d.supportNotes ? <span className="block text-muted">{d.supportNotes}</span> : null}</li>)}</ul>}
          </Card>
          <Card title="Internal notes" description="Staff only.">
            {manage && (
              <ActionForm action={addCustomerNoteAction} className="mb-5 space-y-3">
                <input type="hidden" name="customerId" value={id} />
                <FormMessage />
                <TextArea name="body" label={<span className="sr-only">Note</span>} rows={3} maxLength={4000} placeholder="Add a note…" />
                <Submit variant="secondary">Add note</Submit>
              </ActionForm>
            )}
            <ul className="space-y-3 text-sm">
              {notes.map(({ n, first, last }) => (
                <li key={n.id} className="rounded-2xl bg-canvas p-3">
                  <p className="whitespace-pre-wrap text-navy-950">{n.body}</p>
                  <p className="mt-1 text-xs text-muted">{first} {last} · {fmtDateTime(n.createdAt, tz)}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
