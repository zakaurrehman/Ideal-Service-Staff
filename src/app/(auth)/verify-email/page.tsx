import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { sp, type Search } from "@/components/app/ui";
import { consumeEmailVerificationToken } from "@/lib/auth/core";
import { getViewer, homePath } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { audit } from "@/lib/settings";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({ title: "Confirm Email", description: "Confirm your email address.", path: "/verify-email/", noindex: true });

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<Search> }) {
  const token = sp(await searchParams, "token");
  const db = await getDb();
  const userId = token ? await consumeEmailVerificationToken(db, token) : null;
  if (userId) await audit(db, { actorId: userId, action: "auth.email_verified", entityType: "user", entityId: userId, summary: "Email address confirmed" });
  const viewer = await getViewer();
  const next = viewer ? homePath(viewer) : "/sign-in/";

  return (
    <div className="enter text-center">
      <div className={`mx-auto grid size-16 place-items-center rounded-2xl ${userId ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-700"}`}>
        {userId ? <CheckCircle2 aria-hidden className="size-8" /> : <XCircle aria-hidden className="size-8" />}
      </div>
      <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-navy-950">{userId ? "Email confirmed" : "Link invalid or expired"}</h1>
      <p className="mt-3 text-muted">
        {userId
          ? "Thank you — your email address is confirmed and you can now use every feature of your account."
          : "This confirmation link has already been used or has expired. Sign in and use “Resend confirmation email” on your dashboard."}
      </p>
      <Link href={next} className="mt-8 inline-flex h-12 items-center rounded-full bg-teal-700 px-6 text-sm font-semibold text-white hover:bg-teal-800">
        {viewer ? "Go to my dashboard" : "Sign in"}
      </Link>
    </div>
  );
}
