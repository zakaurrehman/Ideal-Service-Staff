import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bell, LogOut, Settings } from "lucide-react";
import { MotionProvider } from "@/components/layout/Experience";
import { logoutAction } from "@/lib/auth/actions";
import type { Viewer } from "@/lib/auth/session";
import { MobileNav, SideNavLinks, type NavGroup } from "./ShellNav";

const AREA_LABEL = { customer: "Client portal", employee: "Care professional portal", admin: "Administration" } as const;

export function Avatar({ name, fileId, size = 36 }: { name: string; fileId?: string | null; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return fileId ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/files/${fileId}/`} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-teal-400 to-teal-700 text-xs font-bold text-white ring-2 ring-white" style={{ width: size, height: size }}>
      {initials || "?"}
    </span>
  );
}

function Brand({ area }: { area: keyof typeof AREA_LABEL }) {
  return (
    <Link href="/" className="flex items-center gap-3" aria-label="Ideal Service Staff — public website">
      <Image src="/brand/logo-badge.webp" alt="" width={36} height={36} className="rounded-xl" />
      <span className="leading-tight">
        <span className="block text-sm font-bold text-white">Ideal Service Staff</span>
        <span className="block text-[11px] font-medium text-teal-300">{AREA_LABEL[area]}</span>
      </span>
    </Link>
  );
}

function SignOut({ dark = true }: { dark?: boolean }) {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className={
          dark
            ? "flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-navy-200 transition-colors hover:bg-white/5 hover:text-white"
            : "flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold text-navy-900 hover:border-navy-300"
        }
      >
        <LogOut aria-hidden className="size-[18px]" /> Logout
      </button>
    </form>
  );
}

export function AppShell({
  area,
  groups,
  viewer,
  unread,
  roleLabel,
  settingsHref,
  notificationsHref,
  children,
}: {
  area: "customer" | "employee" | "admin";
  groups: NavGroup[];
  viewer: Viewer;
  unread: number;
  roleLabel: string;
  settingsHref: string;
  notificationsHref: string;
  children: ReactNode;
}) {
  const name = `${viewer.firstName} ${viewer.lastName}`.trim() || viewer.email;
  return (
    <MotionProvider>
      <a href="#app-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-navy-900">
        Skip to content
      </a>
      <div className="app-root min-h-dvh bg-canvas lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="grain relative hidden bg-navy-950 lg:block">
          <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto p-4">
            <div className="mb-8 px-2 pt-2">
              <Brand area={area} />
            </div>
            <SideNavLinks groups={groups} layoutId="nav-active" />
            <div className="mt-auto border-t border-white/10 pt-4">
              <SignOut />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6 lg:px-10">
            <MobileNav groups={groups} header={<Brand area={area} />} footer={<SignOut />} />
            <p className="hidden text-sm text-muted sm:block">{AREA_LABEL[area]}</p>
            <div className="ml-auto flex items-center gap-2">
              <Link
                href={notificationsHref}
                className="relative grid size-10 place-items-center rounded-full border border-line bg-white text-navy-900 transition-colors hover:border-navy-300"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              >
                <Bell aria-hidden className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-teal-600 px-1 text-[10px] font-bold leading-5 text-white ring-2 ring-canvas animate-[pop-in_.4s_var(--ease-out-expo)]">
                    {unread > 99 ? "99+" : unread}
                  </span>
                )}
              </Link>
              <Link href={settingsHref} className="hidden size-10 place-items-center rounded-full border border-line bg-white text-navy-900 hover:border-navy-300 sm:grid" aria-label="Settings">
                <Settings aria-hidden className="size-[18px]" />
              </Link>
              <div className="flex items-center gap-2.5 pl-1">
                <Avatar name={name} fileId={viewer.avatarFileId} />
                <div className="hidden leading-tight md:block">
                  <p className="max-w-40 truncate text-sm font-semibold text-navy-950">{name}</p>
                  <p className="text-xs text-muted">{roleLabel}</p>
                </div>
              </div>
            </div>
          </header>
          <main id="app-main" tabIndex={-1} className="mx-auto w-full max-w-7xl px-4 py-8 outline-none sm:px-6 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
      </div>
    </MotionProvider>
  );
}
