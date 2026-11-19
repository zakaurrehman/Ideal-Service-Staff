import { LegalPage, legalMetadata } from "@/components/sections/shared/LegalPage";

export const metadata = legalMetadata("privacy-policy", "How Ideal Service Staff collects, uses, shares and protects your personal information, including SMS and mobile information.");

export default function Page() {
  return <LegalPage slug="privacy-policy" intro="How we collect, use and protect your personal information." />;
}
