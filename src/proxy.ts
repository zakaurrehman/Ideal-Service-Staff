import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";

/**
 * Optimistic check only (no database access, per Next.js guidance): visitors
 * without a session cookie are sent to sign-in before a protected page renders.
 * Real authorisation happens in the Data Access Layer (lib/auth/session.ts)
 * on every page, Server Action and route handler.
 */
export function proxy(req: NextRequest) {
  if (!req.cookies.get(SESSION_COOKIE)?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in/";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/customer/:path*", "/employee/:path*", "/admin/:path*"],
};
