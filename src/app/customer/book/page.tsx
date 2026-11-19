import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireCustomer } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { bookingWindow } from "@/lib/booking/slots";
import { tzAbbr } from "@/lib/time";
import { Alert, PageHeader } from "@/components/app/ui";
import { BookingWizard } from "@/components/app/customer/BookingWizard";

export const metadata = { title: "Book a Service" };

export default async function BookPage() {
  const v = await requireCustomer();
  const db = await getDb();
  const settings = await getSettings(db);
  const [services, dependents, addresses] = await Promise.all([
    db
      .select({ id: t.services.id, name: t.services.name, summary: t.services.summary, image: t.services.imagePath, min: t.services.minDurationMinutes, max: t.services.maxDurationMinutes, def: t.services.defaultDurationMinutes, category: t.serviceCategories.name })
      .from(t.services)
      .leftJoin(t.serviceCategories, eq(t.serviceCategories.id, t.services.categoryId))
      .where(and(eq(t.services.isActive, true), eq(t.services.isBookable, true), isNull(t.services.archivedAt)))
      .orderBy(asc(t.services.sortOrder)),
    db
      .select({ id: t.customerDependents.id, name: t.customerDependents.firstName, lastName: t.customerDependents.lastName, relationship: t.customerDependents.relationship })
      .from(t.customerDependents)
      .where(and(eq(t.customerDependents.customerId, v.id), isNull(t.customerDependents.archivedAt))),
    db
      .select()
      .from(t.customerAddresses)
      .where(and(eq(t.customerAddresses.customerId, v.id), isNull(t.customerAddresses.archivedAt)))
      .orderBy(desc(t.customerAddresses.isDefault)),
  ]);
  const win = bookingWindow(settings);
  const blocked = settings.requireVerifiedEmailToBook && !v.emailVerifiedAt;

  return (
    <>
      <PageHeader title="Book a Service" description={`Choose a service, a time that suits you and where care is needed. Times are shown in ${tzAbbr(settings.timezone)}.`} />
      {blocked ? (
        <Alert tone="amber" title="Confirm your email to book">
          We sent a confirmation link to {v.email}. You can resend it from your Overview page.
        </Alert>
      ) : services.length === 0 ? (
        <Alert tone="amber" title="Online booking is not available right now">
          Please call (310) 462-1700 and our team will book your care.
        </Alert>
      ) : (
        <BookingWizard
          services={services.map((s) => ({ ...s, category: s.category ?? "" }))}
          dependents={dependents.map((d) => ({ id: d.id, label: `${d.name} ${d.lastName}`, sub: d.relationship }))}
          addresses={addresses.map((a) => ({ id: a.id, label: a.label, sub: `${a.line1}, ${a.city}, ${a.region} ${a.postalCode}`, isDefault: a.isDefault }))}
          me={`${v.firstName} ${v.lastName}`}
          tz={settings.timezone}
          firstDate={win.first}
          lastDate={win.last}
          allowProfessional={settings.allowProfessionalSelection}
        />
      )}
    </>
  );
}
