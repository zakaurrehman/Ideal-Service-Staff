import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, Checkbox, Field, FormMessage, PasswordField, Submit } from "@/components/app/forms";
import { Alert, sp, type Search } from "@/components/app/ui";
import { loginAction } from "@/lib/auth/actions";
import { getViewer, homePath, safeNext } from "@/lib/auth/session";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sign In",
  description: "Sign in to your Ideal Service Staff client, care professional or staff account.",
  path: "/sign-in/",
  noindex: true,
});

export default async function SignInPage({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const viewer = await getViewer();
  if (viewer) redirect(homePath(viewer));
  const next = safeNext(sp(search, "next"));

  return (
    <div className="enter">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-navy-950">Welcome back</h1>
      <p className="mt-2 text-muted">Sign in to your Ideal Service Staff account.</p>

      <div className="mt-6 space-y-3">
        {sp(search, "signed_out") && <Alert tone="teal">You’ve been signed out.</Alert>}
        {sp(search, "reset") && <Alert tone="teal">Your password was updated. Sign in with your new password.</Alert>}
        {next && !sp(search, "signed_out") && <Alert tone="navy">Please sign in to continue.</Alert>}
      </div>

      <ActionForm action={loginAction} className="mt-6 space-y-5">
        <input type="hidden" name="next" value={next} />
        <FormMessage />
        <Field name="email" type="email" label="Email address" autoComplete="email" inputMode="email" required />
        <PasswordField name="password" label="Password" required />
        <div className="flex items-center justify-between gap-4">
          <Checkbox name="remember" label="Keep me signed in" />
          <Link href="/forgot-password/" className="text-sm font-semibold text-teal-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <Submit variant="teal" className="w-full" pendingLabel="Signing in…">
          Sign in
        </Submit>
      </ActionForm>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href="/register/" className="rounded-2xl border border-line bg-white p-4 text-sm transition-colors hover:border-teal-300">
          <span className="block font-semibold text-navy-950">New client or family?</span>
          <span className="text-muted">Create an account</span>
        </Link>
        <Link href="/register/?type=employee" className="rounded-2xl border border-line bg-white p-4 text-sm transition-colors hover:border-teal-300">
          <span className="block font-semibold text-navy-950">Care professional?</span>
          <span className="text-muted">Join our team</span>
        </Link>
      </div>
    </div>
  );
}
