import "server-only";
import { PORTAL_URL } from "@/content/site";

/**
 * Live health check of the WordPress portal — run on the server, cached for
 * five minutes. It inspects the real pages instead of trusting that a link
 * works:
 *
 *  • Account system: the User Registration REST namespace is registered.
 *  • Amelia pages: the page loads AND its shortcode was rendered. When the
 *    Amelia plugin is missing or inactive, WordPress prints the raw
 *    "[ameliacustomerpanel …]" text instead — that is detected as unavailable.
 *
 * Nothing private is requested: only public, logged-out page HTML.
 */

export type ServiceState = "online" | "unavailable" | "unreachable";

export type PortalStatus = {
  checkedAt: string;
  accounts: ServiceState;
  customerPanel: ServiceState;
  employeePanel: ServiceState;
  booking: ServiceState;
};

const REVALIDATE = 300;

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": "IdealServiceStaff-PortalStatus/1.0" },
    next: { revalidate: REVALIDATE, tags: ["portal-status"] },
    signal: AbortSignal.timeout(6000),
  });
  return { ok: res.ok, status: res.status, text: res.ok ? await res.text() : "" };
}

async function checkShortcodePage(path: string, shortcode: string): Promise<ServiceState> {
  try {
    const { ok, text } = await fetchText(`${PORTAL_URL}${path}`);
    if (!ok) return "unavailable";
    return text.includes(`[${shortcode}`) ? "unavailable" : "online";
  } catch {
    return "unreachable";
  }
}

async function checkAccounts(): Promise<ServiceState> {
  try {
    const { ok, text } = await fetchText(`${PORTAL_URL}/wp-json/`);
    if (!ok) return "unavailable";
    const namespaces = (JSON.parse(text) as { namespaces?: string[] }).namespaces ?? [];
    return namespaces.includes("user-registration/v1") ? "online" : "unavailable";
  } catch {
    return "unreachable";
  }
}

export async function getPortalStatus(): Promise<PortalStatus> {
  const [accounts, customerPanel, employeePanel, booking] = await Promise.all([
    checkAccounts(),
    checkShortcodePage("/customer-panel/", "ameliacustomerpanel"),
    checkShortcodePage("/employee-panel/", "ameliaemployeepanel"),
    checkShortcodePage("/services-booking/", "ameliastepbooking"),
  ]);
  return { checkedAt: new Date().toISOString(), accounts, customerPanel, employeePanel, booking };
}

export const stateLabel: Record<ServiceState, string> = {
  online: "Online",
  unavailable: "Temporarily unavailable",
  unreachable: "Status unknown",
};
