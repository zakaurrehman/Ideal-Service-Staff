/** Shared by the DAL and proxy.ts (no Node-only imports). */
export const secureCookies = () => process.env.NODE_ENV === "production";

/** `__Host-` prefix: browser enforces Secure, Path=/ and no Domain (cannot be set by subdomains). */
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-iss_session" : "iss_session";
