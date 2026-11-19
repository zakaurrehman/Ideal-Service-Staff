import { LegalPage, legalMetadata } from "@/components/sections/shared/LegalPage";

export const metadata = legalMetadata("terms-and-conditions", "The terms and conditions that govern use of Ideal Service Staff services and this website.");

export default function Page() {
  return <LegalPage slug="terms-and-conditions" intro="The terms that govern our services and this website." />;
}
