import { LegalPage, legalMetadata } from "@/components/sections/shared/LegalPage";

export const metadata = legalMetadata("legal-disclosure", "Scope of services, service agreements, caregiver qualifications and supervision, privacy, data practices and accessibility standards for Ideal Service Staff.");

export default function Page() {
  return <LegalPage slug="legal-disclosure" intro="The scope of our non-medical services, our service agreements, and the standards our caregivers are held to." />;
}
