import { CalendarPlus } from "lucide-react";
import { requireCustomer } from "@/lib/auth/session";
import { LinkButton, PageHeader, type Search } from "@/components/app/ui";
import { CustomerBookingsTable } from "@/components/app/customer/Bookings";

export const metadata = { title: "Upcoming Appointments" };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireCustomer();
  return (
    <>
      <PageHeader
        title="Upcoming Appointments"
        description="Confirmed and pending visits that haven’t happened yet."
        actions={
          <LinkButton href="/customer/book/" variant="teal">
            <CalendarPlus aria-hidden className="size-4" /> Book a service
          </LinkButton>
        }
      />
      <CustomerBookingsTable viewer={viewer} scope="upcoming" search={await searchParams} base="/customer/appointments/" />
    </>
  );
}
