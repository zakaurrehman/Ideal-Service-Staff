import { and, count, eq, max, sql } from "drizzle-orm";
import { HeartHandshake } from "lucide-react";
import { getDb, t } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { fmtDate } from "@/lib/time";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/app/ui";
import { Avatar } from "@/components/app/AppShell";

export const metadata = { title: "My Care Professionals" };

/** Professionals who accepted at least one of this customer's bookings (public profile fields only). */
export default async function Page() {
  const v = await requireCustomer();
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const rows = await db
    .select({
      id: t.bookingAssignments.employeeId,
      firstName: t.userProfiles.firstName,
      lastName: t.userProfiles.lastName,
      avatar: t.userProfiles.avatarFileId,
      headline: t.employeeProfiles.headline,
      bio: t.employeeProfiles.bio,
      years: t.employeeProfiles.yearsExperience,
      visits: count(),
      last: max(t.bookings.startsAt),
    })
    .from(t.bookingAssignments)
    .innerJoin(t.bookings, eq(t.bookings.id, t.bookingAssignments.bookingId))
    .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.bookingAssignments.employeeId))
    .innerJoin(t.employeeProfiles, eq(t.employeeProfiles.userId, t.bookingAssignments.employeeId))
    .where(and(eq(t.bookings.customerId, v.id), eq(t.bookingAssignments.status, "accepted")))
    .groupBy(t.bookingAssignments.employeeId, t.userProfiles.firstName, t.userProfiles.lastName, t.userProfiles.avatarFileId, t.employeeProfiles.headline, t.employeeProfiles.bio, t.employeeProfiles.yearsExperience)
    .orderBy(sql`max(${t.bookings.startsAt}) desc`);
  const skills = rows.length ? await db.select().from(t.employeeSkills) : [];

  return (
    <>
      <PageHeader title="My Care Professionals" description="The professionals who have cared for you or your family." />
      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HeartHandshake className="size-6" />}
            title="No care professionals yet"
            description="Once a professional accepts one of your bookings, you’ll see their profile here."
            action={<LinkButton href="/customer/book/" variant="teal">Book a service</LinkButton>}
          />
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p, i) => (
            <article key={p.id} className="enter rounded-3xl border border-line bg-white p-6 shadow-soft transition-shadow hover:shadow-lift" style={{ ["--d" as string]: `${i * 0.05}s` }}>
              <div className="flex items-center gap-4">
                <Avatar name={`${p.firstName} ${p.lastName}`} fileId={p.avatar} size={60} />
                <div>
                  <h2 className="font-semibold text-navy-950">
                    {p.firstName} {p.lastName.charAt(0)}.
                  </h2>
                  {p.headline && <p className="text-sm text-muted">{p.headline}</p>}
                </div>
              </div>
              {p.bio && <p className="mt-4 line-clamp-4 text-sm text-body">{p.bio}</p>}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {skills
                  .filter((s) => s.employeeId === p.id)
                  .slice(0, 5)
                  .map((s) => (
                    <span key={s.skill} className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-900">
                      {s.skill}
                    </span>
                  ))}
              </div>
              <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
                {p.visits} visit{p.visits === 1 ? "" : "s"} · most recent {fmtDate(p.last, tz)}
                {p.years ? ` · ${p.years}+ years’ experience` : ""}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
