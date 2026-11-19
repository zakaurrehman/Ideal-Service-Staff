import type { NextConfig } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idealservicestaff.com";
const PORTAL_URL = (process.env.NEXT_PUBLIC_PORTAL_URL ?? "https://idealservicestaff.com").replace(/\/$/, "");
const WORDPRESS_URL = process.env.WORDPRESS_URL ?? "https://idealservicestaff.com";

const origin = (u: string) => {
  try {
    return new URL(u).origin;
  } catch {
    return u;
  }
};

/**
 * WordPress account routes (User Registration plugin) — slugs verified on the
 * live site. The new front-end forwards the original URLs to the portal so
 * bookmarks, emails and password-reset links never break.
 * Forwarding is skipped if the portal shares the site origin (would loop).
 *
 * /customer-panel/ and /employee-panel/ are NOT listed: they are gateway pages
 * (src/app/customer-panel, src/app/employee-panel) that check whether Amelia is
 * actually working and only then forward to WordPress.
 */
const PORTAL_ROUTES = ["login", "my-account", "registration", "lost-password"];
const portalIsSeparate = origin(PORTAL_URL) !== origin(SITE_URL);
if (!portalIsSeparate) {
  console.warn(
    "\n⚠  NEXT_PUBLIC_PORTAL_URL has the same origin as NEXT_PUBLIC_SITE_URL.\n" +
      "   Legacy account URLs (/login/, /my-account/, /registration/, /lost-password/) will point to the /sign-in/ hub instead of WordPress.\n" +
      "   Set NEXT_PUBLIC_PORTAL_URL to the WordPress origin (e.g. https://portal.idealservicestaff.com) before launch.\n",
  );
}

/** Theme demo posts (finance/trading) left over from the original WordPress template. */
const LEGACY_DEMO_POSTS = [
  "demystifying-technical-analysis-a-beginners-guide-to-chart-patterns-and-indicators",
  "the-art-of-risk-management-safeguarding-your-investments-in-a-volatile-market",
  "mastering-market-volatility-strategies-for-thriving-in-turbulent-times",
];

const nextConfig: NextConfig = {
  // WordPress permalinks all end in "/" — keep them byte-for-byte for SEO.
  trailingSlash: true,
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: new URL(WORDPRESS_URL).hostname, pathname: "/wp-content/uploads/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async redirects() {
    return [
      { source: "/about/", destination: "/non-medical-home-care-experts/", permanent: true },
      { source: "/home/", destination: "/", permanent: true },
      { source: "/online/", destination: "/", permanent: true },
      { source: "/under-construction/", destination: "/", permanent: true },
      ...LEGACY_DEMO_POSTS.map((slug) => ({ source: `/${slug}/`, destination: "/blog/", permanent: true })),
      // Requested slug that never existed in WordPress — the real page is /employee-panel/
      { source: "/employee-dashboard/", destination: "/employee-panel/", permanent: true },
      ...PORTAL_ROUTES.map((r) => ({
        source: `/${r}/`,
        destination: portalIsSeparate ? `${PORTAL_URL}/${r}/` : "/sign-in/",
        permanent: false,
      })),
      // After cutover: WordPress admin, core login and old media links keep working
      ...(portalIsSeparate
        ? [
            { source: "/wp-admin/:path*", destination: `${PORTAL_URL}/wp-admin/:path*`, permanent: false },
            { source: "/wp-login.php", destination: `${PORTAL_URL}/wp-login.php`, permanent: false },
            { source: "/wp-content/uploads/:path*", destination: `${PORTAL_URL}/wp-content/uploads/:path*`, permanent: true },
          ]
        : []),
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      {
        source: "/images/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
    ];
  },
};

export default nextConfig;
