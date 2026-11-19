import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, isDatabaseConfigured } from "@/lib/db";
import { loadAccess, validateSessionToken, type Access, type SessionUser } from "./core";
import { SESSION_COOKIE, secureCookies } from "./cookie";
import type { Permission } from "./permissions";

/**
 * Data Access Layer for authentication (Next.js guidance: verify the session
 * close to the data). Every protected page, Server Action and route handler
 * calls one of the require* helpers — the proxy's cookie check is only an
 * optimistic redirect.
 */
export type Viewer = SessionUser & Access & { area: "admin" | "employee" | "customer" | null };

export function homePath(v: Pick<Viewer, "area"> | null) {
  if (v?.area === "admin") return "/admin/";
  if (v?.area === "employee") return "/employee/dashboard/";
  if (v?.area === "customer") return "/customer/dashboard/";
  return "/sign-in/";
}

export const getViewer = cache(async (): Promise<Viewer | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !isDatabaseConfigured()) return null;
  const db = await getDb();
  const user = await validateSessionToken(db, token);
  if (!user) return null;
  const access = await loadAccess(db, user.id);
  const area = access.isStaff ? "admin" : access.roles.includes("employee") ? "employee" : access.roles.includes("customer") ? "customer" : null;
  return { ...user, ...access, area };
});

export async function requireViewer(next?: string) {
  const v = await getViewer();
  if (!v) redirect(next ? `/sign-in/?next=${encodeURIComponent(next)}` : "/sign-in/");
  return v;
}

export async function requireCustomer() {
  const v = await requireViewer("/customer/dashboard/");
  if (!v.roles.includes("customer")) redirect(homePath(v));
  return v;
}

export async function requireEmployee() {
  const v = await requireViewer("/employee/dashboard/");
  if (!v.roles.includes("employee")) redirect(homePath(v));
  return v;
}

/** Staff area guard; with a permission, users lacking it are sent to the overview with a notice. */
export async function requireStaff(permission?: Permission) {
  const v = await requireViewer("/admin/");
  if (!v.isStaff) redirect(homePath(v));
  if (permission && !v.permissions.has(permission)) redirect(`/admin/?denied=${encodeURIComponent(permission)}`);
  return v;
}

export const can = (v: Pick<Viewer, "permissions"> | null, p: Permission) => Boolean(v?.permissions.has(p));

/* ── Cookies (only callable from Server Actions / Route Handlers) ─────────── */

export async function setSessionCookie(token: string, expiresAt: Date, persistent: boolean) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureCookies(),
    sameSite: "lax",
    path: "/",
    ...(persistent ? { expires: expiresAt } : {}),
  });
}

export async function clearSessionCookie() {
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", maxAge: 0 });
}

export async function requestMeta() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  return { ip, userAgent: h.get("user-agent") };
}

/** Only same-site relative paths are accepted as post-login destinations. */
export function safeNext(next: unknown) {
  const s = typeof next === "string" ? next : "";
  return /^\/(?!\/)[\w\-./?=&%]*$/.test(s) && !s.includes("\\") ? s : "";
}
