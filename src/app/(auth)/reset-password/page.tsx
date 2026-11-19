import Link from "next/link";
import { ActionForm, FormMessage, PasswordField, Submit } from "@/components/app/forms";
import { sp, type Search } from "@/components/app/ui";
import { resetPasswordAction } from "@/lib/auth/actions";
import { peekPasswordResetToken } from "@/lib/auth/core";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { getDb } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Choose a New Password", description: "Set a new password for your account.", path: "/reset-password/", noindex: true });

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const token = sp(search, "token");
  const invite = sp(search, "invite") === "1";
  const valid = token ? Boolean(await peekPasswordResetToken(await getDb(), token)) : false;

  if (!valid) {
    return (
      <div className="enter">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-navy-950">This link has expired</h1>
        <p className="mt-3 text-muted">Password links work once and expire after a short time for your security. Request a fresh link and use it straight away.</p>
        <Link href="/forgot-password/" className="mt-8 inline-flex h-12 items-center rounded-full bg-teal-700 px-6 text-sm font-semibold text-white hover:bg-teal-800">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="enter">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-navy-950">{invite ? "Set your password" : "Choose a new password"}</h1>
      <p className="mt-2 text-muted">{invite ? "Welcome to the team. Create a password to activate your account." : "After saving, you’ll be signed out of every device and can sign in with the new password."}</p>
      <ActionForm action={resetPasswordAction} className="mt-8 space-y-5">
        <input type="hidden" name="token" value={token} />
        <FormMessage />
        <PasswordField name="password" label="New password" autoComplete="new-password" meter required hint={`At least ${PASSWORD_MIN} characters.`} />
        <PasswordField name="confirmPassword" label="Confirm new password" autoComplete="new-password" required />
        <Submit variant="teal" className="w-full" pendingLabel="Saving…">
          Save password
        </Submit>
      </ActionForm>
    </div>
  );
}
