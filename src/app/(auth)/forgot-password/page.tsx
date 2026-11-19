import Link from "next/link";
import { ActionForm, Field, FormMessage, Submit } from "@/components/app/forms";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { pageMetadata } from "@/lib/seo";

/** Rendered per request: whether accounts are available depends on runtime configuration. */
export const dynamic = "force-dynamic";

export const metadata = pageMetadata({ title: "Forgot Password", description: "Reset your Ideal Service Staff account password.", path: "/forgot-password/", noindex: true });

export default function ForgotPasswordPage() {
  return (
    <div className="enter">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-navy-950">Forgot your password?</h1>
      <p className="mt-2 text-muted">Enter the email address on your account and we’ll send you a secure link to choose a new password.</p>
      <ActionForm action={forgotPasswordAction} className="mt-8 space-y-5">
        <FormMessage />
        <Field name="email" type="email" label="Email address" autoComplete="email" inputMode="email" required />
        <Submit variant="teal" className="w-full" pendingLabel="Sending…">
          Send reset link
        </Submit>
      </ActionForm>
      <p className="mt-6 text-sm text-muted">
        Remembered it?{" "}
        <Link href="/sign-in/" className="font-semibold text-teal-700 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
