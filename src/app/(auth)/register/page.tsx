import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Checkbox, Field, FormMessage, PasswordField, Submit } from "@/components/app/forms";
import { sp, type Search } from "@/components/app/ui";
import { registerAction } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { getViewer, homePath } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Create an Account",
  description: "Create an Ideal Service Staff account to book and manage care, or join our team as a care professional.",
  path: "/register/",
  noindex: true,
});

export default async function RegisterPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect(homePath(viewer));
  const type = sp(search, "type") === "employee" ? "employee" : "customer";
  const prefillEmail = sp(search, "email").slice(0, 200);
  const tab = (active: boolean) =>
    cn("flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold transition-colors", active ? "bg-navy-900 text-white shadow-soft" : "text-navy-800 hover:text-navy-950");

  return (
    <div className="enter">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-navy-950">Create your account</h1>
      <p className="mt-2 text-muted">{type === "customer" ? "Book care and manage appointments for yourself or a loved one." : "Build your professional profile and receive assignments once verified."}</p>

      <div className="mt-6 flex gap-1 rounded-full border border-line bg-white p-1" role="tablist" aria-label="Account type">
        <Link href="/register/" role="tab" aria-selected={type === "customer"} className={tab(type === "customer")}>
          Client / family
        </Link>
        <Link href="/register/?type=employee" role="tab" aria-selected={type === "employee"} className={tab(type === "employee")}>
          Care professional
        </Link>
      </div>

      <ActionForm action={registerAction} className="mt-6 space-y-5" key={type}>
        <input type="hidden" name="accountType" value={type} />
        <FormMessage />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field name="firstName" label="First name" autoComplete="given-name" required />
          <Field name="lastName" label="Last name" autoComplete="family-name" required />
        </div>
        <Field name="email" type="email" label="Email address" autoComplete="email" inputMode="email" defaultValue={prefillEmail} required />
        <Field name="phone" type="tel" label="Phone number" autoComplete="tel" inputMode="tel" required />
        {type === "employee" && <Field name="city" label="City you live in" autoComplete="address-level2" hint="Helps us match you with nearby clients." />}
        <PasswordField name="password" label="Password" autoComplete="new-password" meter required hint={`At least ${PASSWORD_MIN} characters. A short passphrase works well.`} />
        <PasswordField name="confirmPassword" label="Confirm password" autoComplete="new-password" required />
        <Checkbox
          name="terms"
          label={
            <>
              I agree to the{" "}
              <Link href="/terms-and-conditions/" className="font-semibold text-teal-700 underline" target="_blank">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy/" className="font-semibold text-teal-700 underline" target="_blank">
                Privacy Policy
              </Link>
              .
            </>
          }
        />
        <Submit variant="teal" className="w-full" pendingLabel="Creating account…">
          Create account
        </Submit>
      </ActionForm>
      {type === "employee" && (
        <p className="mt-6 text-sm text-muted">
          Prefer to apply first?{" "}
          <Link href="/careers/apply/" className="font-semibold text-teal-700 hover:underline">
            Submit a job application
          </Link>
          .
        </p>
      )}
      <p className="mt-4 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/sign-in/" className="font-semibold text-teal-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
