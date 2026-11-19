import Link from "next/link";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { BadgeCheck, CalendarClock, CheckCircle2, ClipboardList, MailWarning, ShieldAlert, Sparkles, Sun, Timer } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireEmployee } from "@/lib/auth/session";
import { resendVerificationAction } from "@/lib/auth/actions";
import { submitForVerificationAction } from "@/lib/actions/employee";
import { statusLabel } from "@/lib/labels";
import { minutesLabel, timeAgo, fmtTime, zonedParts } from "@/lib/time";
import { Alert, Card, EmptyState, LinkButton, MoreLink, StatCard, StatusBadge, sp, type Search } from "@/components/app/ui";
import { ActionButton, ActionForm, FormMessage, Submit } from "@/components/app/forms";
import { Avatar } from "@/components/app/AppShell";
import { AssignmentList, employeeAssignments } from "@/components/app/employee/Assignments";

const VERIFY_COPY: Record<string, string> = {
  application_received: "Complete your profile, add your qualifications and upload your documents, then submit for verification.",
  under_review: "Our team is reviewing your profile.",
  documents_required: "We need more documents from you — check your notifications and the Documents page.",
  verification_pending: "Thank you — your profile is with our team for final verification.",
  approved: "You’re verified and can receive assignments for your approved services.",
  rejected: "Your verification was not approved. Contact the office if you have questions.",
  suspended: "Your account is suspended from receiving assignments. Please contact the office.",
};

export default async function EmployeeDashboard({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireEmployee();
  const db = await getDb();
  const id = v.id;
  const [[profile], [user], [skills], [certs], [docs], hours, [services], [completed], notes] = await Promise.all([
    db.select().from(t.employeeProfiles).where(eq(t.employeeProfiles.userId, id)),
    db.select({ phone: t.userProfiles.phone }).from(t.userProfiles).where(eq(t.userProfiles.userId, id)),
    db.select({ n: count() }).from(t.employeeSkills).where(eq(t.employeeSkills.employeeId, id)),
    db.select({ n: count() }).from(t.employeeCertifications).where(eq(t.employeeCertifications.employeeId, id)),
    db.select({ n: count() }).from(t.employeeDocuments).where(eq(t.employeeDocuments.employeeId, id)),
    db.select().from(t.employeeAvailability).where(eq(t.employeeAvailability.employeeId, id)),
    db.select({ n: count() }).from(t.employeeServices).where(eq(t.employeeServices.employeeId, id)),
    db
      .select({ n: count() })
      .from(t.bookingAssignments)
      .innerJoin(t.bookings, eq(t.bookings.id, t.bookingAssignments.bookingId))
      .where(and(eq(t.bookingAssignments.employeeId, id), eq(t.bookingAssignments.status, "accepted"), eq(t.bookings.status, "completed"))),
    db.select().from(t.notifications).where(and(eq(t.notifications.userId, id), isNull(t.notifications.readAt))).orderBy(desc(t.notifications.createdAt)).limit(4),
  ]);
  const [offered, upcoming, today] = await Promise.all([employeeAssignments(v, "offered"), employeeAssignments(v, "upcoming"), employeeAssignments(v, "today")]);

  const checklist = [
    { label: "Phone number", done: Boolean(user?.phone), href: "/employee/profile/" },
    { label: "Profile photo", done: Boolean(v.avatarFileId), href: "/employee/profile/" },
    { label: "Professional summary", done: Boolean(profile?.headline && profile?.bio), href: "/employee/profile/" },
    { label: "Skills", done: skills.n > 0, href: "/employee/skills/" },
    { label: "Certifications", done: certs.n > 0, href: "/employee/certifications/" },
    { label: "Documents", done: docs.n > 0, href: "/employee/documents/" },
    { label: "Services you offer", done: services.n > 0, href: "/employee/services/" },
    { label: "Working hours", done: hours.length > 0, href: "/employee/availability/" },
  ];
  const pct = Math.round((checklist.filter((c) => c.done).length / checklist.length) * 100);
  const status = profile?.verificationStatus ?? "application_received";
  const canSubmit = ["application_received", "documents_required"].includes(status) && pct >= 75;
  const tz = today.tz;

  return (
    <div className="space-y-8">
      <section className="enter grain relative isolate overflow-hidden rounded-[2rem] bg-navy-950 p-7 text-white sm:p-10">
        <div aria-hidden className="absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-teal-500/30 blur-3xl" />
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={`${v.firstName} ${v.lastName}`} fileId={v.avatarFileId} size={56} />
            <div>
              <p className="text-sm text-teal-300">Welcome back,</p>
              <h1 className="font-display text-3xl font-semibold text-white sm:text-4xl">{v.firstName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
            {status === "approved" ? <BadgeCheck aria-hidden className="size-6 text-teal-300" /> : <ShieldAlert aria-hidden className="size-6 text-amber-300" />}
            <div>
              <p className="text-xs uppercase tracking-wider text-navy-300">Verification</p>
              <p className="font-semibold">{statusLabel(status)}</p>
            </div>
          </div>
        </div>
      </section>

      {sp(search, "welcome") && <Alert tone="teal" title="Welcome to the team portal!">Complete your profile below so our team can verify you and start offering assignments.</Alert>}
      {!v.emailVerifiedAt && (
        <Alert tone="amber" title={<span className="flex items-center gap-2"><MailWarning aria-hidden className="size-4" /> Please confirm your email address</span>} action={<ActionForm action={resendVerificationAction} className="flex flex-col items-end gap-2"><FormMessage className="max-w-xs" /><Submit variant="secondary" className="h-10">Resend email</Submit></ActionForm>}>
          We sent a link to {v.email}.
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Awaiting your response" value={offered.rows.length} icon={<ClipboardList className="size-5" />} tone="amber" href="/employee/assignments/" />
        <StatCard label="Upcoming assignments" value={upcoming.rows.length} icon={<CalendarClock className="size-5" />} tone="teal" href="/employee/upcoming/" />
        <StatCard label="Completed" value={completed.n} icon={<CheckCircle2 className="size-5" />} href="/employee/history/" />
        <StatCard label="Availability" value={hours.length ? `${hours.length} day${hours.length > 1 ? "s" : ""}` : "Not set"} hint={hours.length ? "per week" : "Add working hours"} icon={<Timer className="size-5" />} href="/employee/availability/" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Profile & verification" description={VERIFY_COPY[status]}>
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0">
              <svg viewBox="0 0 36 36" className="size-20 -rotate-90" aria-hidden>
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-line)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--color-teal-600)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 97.4} 97.4`} className="transition-[stroke-dasharray] duration-700" />
              </svg>
              <span className="absolute inset-0 grid place-items-center font-display text-lg font-semibold text-navy-950">{pct}%</span>
            </div>
            <div className="text-sm">
              <p className="font-semibold text-navy-950">Profile completion</p>
              <p className="text-muted">{checklist.filter((c) => !c.done).length ? `${checklist.filter((c) => !c.done).length} item(s) left` : "Everything is filled in."}</p>
              <StatusBadge status={status} className="mt-2" />
            </div>
          </div>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-sm transition-colors hover:border-teal-300">
                  <span className={`grid size-5 place-items-center rounded-full ${c.done ? "bg-teal-600 text-white" : "border-2 border-line"}`}>{c.done && <CheckCircle2 aria-hidden className="size-4" />}</span>
                  <span className={c.done ? "text-muted line-through decoration-line" : "font-medium text-navy-950"}>{c.label}</span>
                </Link>
              </li>
            ))}
          </ul>
          {canSubmit && (
            <div className="mt-6">
              <ActionButton action={submitForVerificationAction} variant="teal" confirm={{ title: "Submit your profile for verification?", body: "Our team will review your profile, certifications and documents.", cta: "Submit" }}>
                Submit for verification
              </ActionButton>
            </div>
          )}
        </Card>

        <Card title={<span className="flex items-center gap-2"><Sun aria-hidden className="size-4 text-amber-500" /> Today’s schedule</span>} padded={false}>
          {today.rows.length === 0 ? (
            <EmptyState compact icon={<CalendarClock className="size-6" />} title="Nothing scheduled today" />
          ) : (
            <ul className="divide-y divide-line">
              {today.rows.map((r) => (
                <li key={r.assignmentId}>
                  <Link href={`/employee/assignments/${r.assignmentId}/`} className="block px-6 py-3.5 text-sm hover:bg-canvas/70">
                    <p className="font-semibold text-navy-950">
                      {fmtTime(r.startsAt, tz)} – {fmtTime(r.endsAt, tz)}
                    </p>
                    <p className="text-muted">
                      {r.service} · {r.city}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {hours.length > 0 && (
            <p className="border-t border-line px-6 py-3 text-xs text-muted">
              Working hours today: {hours.filter((h) => h.weekday === zonedParts(new Date(), tz).weekday).map((h) => `${minutesLabel(h.startMinute)}–${minutesLabel(h.endMinute)}`).join(", ") || "off"}
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-navy-950">Upcoming assignments</h2>
            <MoreLink href="/employee/assignments/">All assignments</MoreLink>
          </div>
          <AssignmentList viewer={v} scope="active" empty={{ title: "No assignments yet", description: status === "approved" ? "New assignments offered to you will appear here." : "Once you’re verified and approved for services, assignments will appear here." }} />
        </div>
        <Card title="Notifications" actions={<MoreLink href="/employee/notifications/">All</MoreLink>} padded={false}>
          {notes.length === 0 ? (
            <EmptyState compact icon={<Sparkles className="size-6" />} title="You’re all caught up" />
          ) : (
            <ul className="divide-y divide-line">
              {notes.map((n) => (
                <li key={n.id} className="px-6 py-3.5 text-sm">
                  <Link href={n.href ?? "/employee/notifications/"} className="font-semibold text-navy-950 hover:underline">
                    {n.title}
                  </Link>
                  <p className="text-xs text-muted">{timeAgo(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line p-4">
            <LinkButton href="/employee/support/" variant="ghost" size="sm">
              Contact the office
            </LinkButton>
          </div>
        </Card>
      </div>
    </div>
  );
}
