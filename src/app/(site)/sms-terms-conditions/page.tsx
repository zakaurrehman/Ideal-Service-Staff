import { LegalPage, legalMetadata } from "@/components/sections/shared/LegalPage";

export const metadata = legalMetadata("sms-terms-conditions", "SMS program terms for Ideal Service Staff: consent, message frequency, rates, opting out and help.");

export default function Page() {
  return <LegalPage slug="sms-terms-conditions" intro="How our SMS messaging program works — and how to opt out at any time." />;
}
