import "server-only";
/** CSV report builders (used by /api/admin/export/[type]/). Values are escaped against CSV/formula injection. */
import { and, asc, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { getDb, t } from "@/lib/db";
import { addDays, isIsoDate, zonedToUtc } from "@/lib/time";
import type { Permission } from "@/lib/auth/permissions";

export const REPORTS: Record<string, { label: string; permission: Permission }> = {
  bookings: { label: "Bookings", permission: "bookings.view" },
  customers: { label: "Customers", permission: "customers.view" },
  employees: { label: "Employees", permission: "employees.view" },
  applications: { label: "Job applications", permission: "applications.view" },
  services: { label: "Services", permission: "services.manage" },
};

const cell = (v: unknown) => {
  let s = v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formulas
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: Record<string, unknown>[]) => (rows.length ? [Object.keys(rows[0]).join(","), ...rows.map((r) => Object.values(r).map(cell).join(","))].join("\r\n") : "No data\r\n");

export async function buildReport(type: string, params: URLSearchParams, tz: string) {
  const db = await getDb();
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const range = (col: AnyPgColumn): SQL[] => [
    ...(isIsoDate(from) ? [gte(col, zonedToUtc(from, 0, tz))] : []),
    ...(isIsoDate(to) ? [lt(col, zonedToUtc(addDays(to, 1), 0, tz))] : []),
  ];
  switch (type) {
    case "bookings": {
      const status = params.get("status");
      return db
        .select({
          reference: t.bookings.reference,
          status: t.bookings.status,
          starts_at: t.bookings.startsAt,
          ends_at: t.bookings.endsAt,
          service: sql<string>`(SELECT string_agg(service_name, '; ') FROM booking_services WHERE booking_id = ${t.bookings.id})`,
          customer: sql<string>`${t.userProfiles.firstName} || ' ' || ${t.userProfiles.lastName}`,
          customer_email: t.users.email,
          recipient: t.bookings.recipientName,
          city: t.bookings.city,
          postal_code: t.bookings.postalCode,
          professional: sql<string | null>`(SELECT up.first_name || ' ' || up.last_name FROM booking_assignments ba JOIN user_profiles up ON up.user_id = ba.employee_id WHERE ba.booking_id = ${t.bookings.id} AND ba.status IN ('offered','accepted') LIMIT 1)`,
          source: t.bookings.source,
          created_at: t.bookings.createdAt,
        })
        .from(t.bookings)
        .innerJoin(t.users, eq(t.users.id, t.bookings.customerId))
        .leftJoin(t.userProfiles, eq(t.userProfiles.userId, t.bookings.customerId))
        .where(and(...range(t.bookings.startsAt), ...(status ? [sql`${t.bookings.status}::text = ${status}`] : [])))
        .orderBy(asc(t.bookings.startsAt))
        .limit(50_000);
    }
    case "customers":
      return db
        .select({
          first_name: t.userProfiles.firstName,
          last_name: t.userProfiles.lastName,
          email: t.users.email,
          phone: t.userProfiles.phone,
          status: t.users.status,
          email_confirmed: sql<boolean>`${t.users.emailVerifiedAt} IS NOT NULL`,
          bookings: sql<number>`(SELECT count(*)::int FROM bookings WHERE customer_id = ${t.users.id})`,
          joined: t.users.createdAt,
        })
        .from(t.customerProfiles)
        .innerJoin(t.users, eq(t.users.id, t.customerProfiles.userId))
        .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id))
        .where(and(...range(t.users.createdAt)))
        .orderBy(desc(t.users.createdAt));
    case "employees":
      return db
        .select({
          first_name: t.userProfiles.firstName,
          last_name: t.userProfiles.lastName,
          email: t.users.email,
          phone: t.userProfiles.phone,
          verification: t.employeeProfiles.verificationStatus,
          account_status: t.users.status,
          city: t.employeeProfiles.city,
          approved_services: sql<number>`(SELECT count(*)::int FROM employee_services WHERE employee_id = ${t.users.id} AND status = 'approved')`,
          completed_visits: sql<number>`(SELECT count(*)::int FROM booking_assignments ba JOIN bookings b ON b.id = ba.booking_id WHERE ba.employee_id = ${t.users.id} AND ba.status = 'accepted' AND b.status = 'completed')`,
          joined: t.users.createdAt,
        })
        .from(t.employeeProfiles)
        .innerJoin(t.users, eq(t.users.id, t.employeeProfiles.userId))
        .innerJoin(t.userProfiles, eq(t.userProfiles.userId, t.users.id))
        .where(and(...range(t.users.createdAt)))
        .orderBy(desc(t.users.createdAt));
    case "applications":
      return db
        .select({
          reference: t.jobApplications.reference,
          status: t.jobApplications.status,
          first_name: t.jobApplications.firstName,
          last_name: t.jobApplications.lastName,
          email: t.jobApplications.email,
          phone: t.jobApplications.phone,
          city: t.jobApplications.city,
          positions: t.jobApplications.positions,
          employment_type: t.jobApplications.employmentType,
          experience: t.jobApplications.experienceLevel,
          received: t.jobApplications.createdAt,
        })
        .from(t.jobApplications)
        .where(and(...range(t.jobApplications.createdAt)))
        .orderBy(desc(t.jobApplications.createdAt));
    case "services":
      return db
        .select({
          name: t.services.name,
          slug: t.services.slug,
          active: t.services.isActive,
          bookable: t.services.isBookable,
          archived: sql<boolean>`${t.services.archivedAt} IS NOT NULL`,
          bookings: sql<number>`(SELECT count(*)::int FROM booking_services bs JOIN bookings b ON b.id = bs.booking_id WHERE bs.service_id = ${t.services.id}${isIsoDate(from) ? sql` AND b.starts_at >= ${zonedToUtc(from, 0, tz)}` : sql``}${isIsoDate(to) ? sql` AND b.starts_at < ${zonedToUtc(addDays(to, 1), 0, tz)}` : sql``})`,
          approved_professionals: sql<number>`(SELECT count(*)::int FROM employee_services WHERE service_id = ${t.services.id} AND status = 'approved')`,
        })
        .from(t.services)
        .orderBy(asc(t.services.sortOrder));
    default:
      return null;
  }
}
