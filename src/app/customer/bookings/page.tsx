import { CalendarPlus } from "lucide-react";
import { requireCustomer } from "@/lib/auth/session";
import { LinkButton, PageHeader, type Search } from "@/components/app/ui";
import { CustomerBookingsTable } from "@/components/app/customer/Bookings";

export const metadata = { title: "My Bookings" };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const viewer = await requireCustomer();
  return (
    <>
      <PageHeader
        title="My Bookings"
        description="Every booking you’ve made, with its current status."
        actions={
          <LinkButton href="/customer/book/" variant="teal">
            <CalendarPlus aria-hidden className="size-4" /> Book a service
          </LinkButton>
        }
      />
      <CustomerBookingsTable viewer={viewer} scope="all" search={await searchParams} base="/customer/bookings/" />
    </>
  );
}
