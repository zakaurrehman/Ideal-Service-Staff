import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { Paperclip } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { reviewDocumentAction, setServiceEligibilityAction, setUserStatusAction, setVerificationStatusAction } from "@/lib/actions/admin";
import { VERIFICATION_STATUSES, docTypeLabel, statusLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { fmtDate, fmtDateTime, fmtTime, minutesLabel } from "@/lib/time";
import { Badge, Card, DL, PageHeader, StatusBadge } from "@/components/app/ui";
import { ActionButton, ActionForm, FormMessage, Select, Submit, TextArea } from "@/components/app/forms";
import { Avatar } from "@/components/app/AppShell";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function ReviewButtons({ kind, id, canVerify }: { kind: "document" | "certification"; id: string; canVerify: boolean }) {
  if (!canVerify) return null;
  return (
    <ActionForm action={reviewDocumentAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <FormMessage className="w-full" />
      {kind === "document" && <input name="note" placeholder="Note (optional)" className="h-9 w-40 rounded-full border border-line px-3 text-xs" aria-label="Review note" />}
      <Submit variant="teal" name="decision" value="approved" className="h-9 px-4">
        Approve
      </Submit>
      <Submit variant="secondary" name="decision" value="rejected" className="h-9 px-4">
        Reject
      </Submit>
    </ActionForm>
  );
}

export default async function EmployeeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const v = await requireStaff("employees.view");
  const db = await getDb();
  const [e] = await db
    .select({ u: t.users, p: t.userProfiles, ep: t.employeeProfiles })
    .from(t.employeeProfiles)
    .innerJoin(t.users, eq(t.users.id, t.employeeProfiles.userId))
    .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id))
    .where(eq(t.users.id, id));
  if (!e) notFound();
  const tz = (await getSettings(db)).timezone;
  const canDocs = can(v, "documents.view");
  const canVerify = can(v, "employees.verify");
  const canManage = can(v, "employees.manage");
  const [docs, certs, skills, exp, hours, areas, services, eligibility, assignments, apps] = await Promise.all([
    db.select({ d: t.employeeDocuments, name: t.files.originalName }).from(t.employeeDocuments).innerJoin(t.files, eq(t.files.id, t.employeeDocuments.fileId)).where(eq(t.employeeDocuments.employeeId, id)).orderBy(desc(t.employeeDocuments.createdAt)),
    db.select().from(t.employeeCertifications).where(eq(t.employeeCertifications.employeeId, id)).orderBy(desc(t.employeeCertifications.createdAt)),
    db.select().from(t.employeeSkills).where(eq(t.employeeSkills.employeeId, id)),
    db.select().from(t.employeeExperience).where(eq(t.employeeExperience.employeeId, id)).orderBy(desc(t.employeeExperience.startDate)),
    db.select().from(t.employeeAvailability).where(eq(t.employeeAvailability.employeeId, id)).orderBy(asc(t.employeeAvailability.weekday)),
    db.select().from(t.employeeServiceAreas).where(eq(t.employeeServiceAreas.employeeId, id)),
    db.select({ id: t.services.id, name: t.services.name }).from(t.services).where(isNull(t.services.archivedAt)).orderBy(asc(t.services.sortOrder)),
    db.select().from(t.employeeServices).where(eq(t.employeeServices.employeeId, id)),
    db
      .select({ a: t.bookingAssignments, b: t.bookings })
      .from(t.bookingAssignments)
      .innerJoin(t.bookings, eq(t.bookings.id, t.bookingAssignments.bookingId))
      .where(and(eq(t.bookingAssignments.employeeId, id), inArray(t.bookingAssignments.status, ["offered", "accepted"])))
      .orderBy(desc(t.bookings.startsAt))
      .limit(20),
    db.select({ id: t.jobApplications.id, reference: t.jobApplications.reference, status: t.jobApplications.status }).from(t.jobApplications).where(eq(t.jobApplications.userId, id)),
  ]);
  const elig = new Map(eligibility.map((x) => [x.serviceId, x.status]));
  const name = `${e.p.firstName} ${e.p.lastName}`;

  return (
    <>
      <PageHeader
        title={name}
        crumbs={[{ label: "Employees", href: "/admin/employees/" }, { label: name }]}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.ep.verificationStatus} /> <StatusBadge status={e.u.status} /> Joined {fmtDate(e.u.createdAt, tz)}
          </span>
        }
        actions={
          can(v, "employees.manage") &&
          (e.u.status === "active" ? (
            <ActionButton action={setUserStatusAction.bind(null, id, "suspended")} variant="danger" confirm={{ title: `Suspend ${name}’s account?`, body: "They’ll be signed out and can’t sign in. Existing assignments are not changed automatically.", cta: "Suspend" }}>
              Suspend account
            </ActionButton>
          ) : (
            <ActionButton action={setUserStatusAction.bind(null, id, "active")} variant="teal">
              Reactivate account
            </ActionButton>
          ))
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Profile">
            <div className="mb-5 flex items-center gap-4">
              <Avatar name={name} fileId={e.p.avatarFileId} size={64} />
              <div>
                <p className="font-semibold text-navy-950">{e.ep.headline ?? "No headline yet"}</p>
                <p className="text-sm text-muted">{e.u.email} · {e.p.phone ?? "no phone"}</p>
              </div>
            </div>
            <DL
              items={[
                { label: "About", value: e.ep.bio ?? "—" },
                { label: "Experience", value: e.ep.yearsExperience != null ? `${e.ep.yearsExperience} years` : "—" },
                { label: "Employment", value: e.ep.employmentType ?? "—" },
                { label: "City / areas", value: [e.ep.city, ...areas.map((a) => a.area)].filter(Boolean).join(", ") || "—" },
                { label: "Transportation", value: e.ep.hasTransportation == null ? "—" : e.ep.hasTransportation ? "Yes" : "No" },
                { label: "Work authorized", value: e.ep.workAuthorized == null ? "—" : e.ep.workAuthorized ? "Yes" : "No" },
                { label: "Skills", value: skills.map((s) => s.skill).join(", ") || "—" },
                { label: "Job applications", value: apps.length ? apps.map((a) => <Link key={a.id} href={`/admin/applications/${a.id}/`} className="mr-2 font-mono text-xs text-teal-700 underline">{a.reference}</Link>) : "—" },
              ]}
            />
          </Card>

          <Card title="Documents" description={canDocs ? "Opening a file is recorded in the access log." : "You don’t have permission to open employee documents."} padded={false}>
            {docs.length === 0 ? (
              <p className="px-6 py-5 text-sm text-muted">No documents uploaded.</p>
            ) : (
              <ul className="divide-y divide-line">
                {docs.map(({ d, name: file }) => (
                  <li key={d.id} className="flex flex-wrap items-center gap-3 px-6 py-4 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy-950">{d.title}</p>
                      <p className="text-xs text-muted">{docTypeLabel(d.docType)} · {fmtDateTime(d.createdAt, tz)}{d.expiresOn ? ` · expires ${d.expiresOn}` : ""}</p>
                      {canDocs && (
                        <a href={`/api/files/${d.fileId}/`} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                          <Paperclip aria-hidden className="size-3.5" /> {file}
                        </a>
                      )}
                    </div>
                    <StatusBadge status={d.status} />
                    {d.status === "pending_review" && <ReviewButtons kind="document" id={d.id} canVerify={canVerify} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Certifications" padded={false}>
            {certs.length === 0 ? (
              <p className="px-6 py-5 text-sm text-muted">No certifications added.</p>
            ) : (
              <ul className="divide-y divide-line">
                {certs.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 px-6 py-4 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-navy-950">{c.name}</p>
                      <p className="text-xs text-muted">{[c.issuer, c.credentialId && `#${c.credentialId}`, c.issuedOn && `issued ${c.issuedOn}`, c.expiresOn && `expires ${c.expiresOn}`].filter(Boolean).join(" · ")}</p>
                      {c.fileId && canDocs && (
                        <a href={`/api/files/${c.fileId}/`} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
                          <Paperclip aria-hidden className="size-3.5" /> View certificate
                        </a>
                      )}
                    </div>
                    <StatusBadge status={c.status} />
                    {c.status === "pending_review" && <ReviewButtons kind="certification" id={c.id} canVerify={canVerify} />}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Current assignments" padded={false}>
            {assignments.length === 0 ? (
              <p className="px-6 py-5 text-sm text-muted">No offered or accepted assignments.</p>
            ) : (
              <ul className="divide-y divide-line text-sm">
                {assignments.map(({ a, b }) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-3">
                    <Link href={`/admin/bookings/${b.id}/`} className="font-mono text-xs font-semibold hover:underline">
                      {b.reference}
                    </Link>
                    <span>{fmtDate(b.startsAt, tz)} · {fmtTime(b.startsAt, tz)}</span>
                    <StatusBadge status={a.status === "offered" ? "offered" : b.status} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {canVerify && (
            <Card title="Verification decision" description="The employee is notified by email and in their dashboard.">
              <ActionForm action={setVerificationStatusAction} className="space-y-4">
                <input type="hidden" name="employeeId" value={id} />
                <FormMessage />
                <Select name="status" label="Status" defaultValue={e.ep.verificationStatus} options={VERIFICATION_STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))} />
                <TextArea name="note" label="Message to the employee (optional)" rows={3} maxLength={1000} defaultValue={e.ep.statusNote} />
                <Submit variant="teal">Save decision</Submit>
              </ActionForm>
            </Card>
          )}
          <Card title="Service eligibility" description="Only approved services can be assigned.">
            <ul className="space-y-2 text-sm">
              {services.map((s) => {
                const st = elig.get(s.id);
                return (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl border border-line px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-navy-950">{s.name}</span>
                      {st && <Badge tone={st === "approved" ? "teal" : st === "requested" ? "amber" : "red"}>{statusLabel(st)}</Badge>}
                    </span>
                    {canManage &&
                      (st === "approved" ? (
                        <ActionButton action={setServiceEligibilityAction.bind(null, id, s.id, "revoked")} variant="ghost">
                          Revoke
                        </ActionButton>
                      ) : (
                        <ActionButton action={setServiceEligibilityAction.bind(null, id, s.id, "approved")} variant={st === "requested" ? "teal" : "secondary"}>
                          Approve
                        </ActionButton>
                      ))}
                  </li>
                );
              })}
            </ul>
          </Card>
          <Card title="Working hours">
            {hours.length === 0 ? (
              <p className="text-sm text-muted">Not set — they can’t be matched to bookings yet.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {hours.map((h) => (
                  <li key={h.id} className="flex justify-between">
                    <span>{DAYS[h.weekday]}</span>
                    <span className="tabular-nums">{minutesLabel(h.startMinute)} – {minutesLabel(h.endMinute)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Experience">
            {exp.length === 0 ? <p className="text-sm text-muted">None added.</p> : <ul className="space-y-2 text-sm">{exp.map((x) => <li key={x.id}><span className="font-semibold">{x.title}</span>, {x.organization} <span className="text-xs text-muted">({x.startDate} – {x.endDate ?? "present"})</span></li>)}</ul>}
          </Card>
        </div>
      </div>
    </>
  );
}
