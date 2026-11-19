import type { NextConfig } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://idealservicestaff.com";
const WORDPRESS_URL = process.env.WORDPRESS_URL ?? "https://idealservicestaff.com";

const origin = (u: string) => {
  try {
    return new URL(u).origin;
  } catch {
    return u;
  }
};

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
  // Native / WASM packages are loaded from node_modules at runtime instead of being bundled.
  serverExternalPackages: ["@node-rs/argon2", "@electric-sql/pglite"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: new URL(WORDPRESS_URL).hostname, pathname: "/wp-content/uploads/**" },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
    // Résumé + supporting documents; Vercel functions accept up to 4.5 MB per request.
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  async redirects() {
    return [
      { source: "/about/", destination: "/non-medical-home-care-experts/", permanent: true },
      { source: "/home/", destination: "/", permanent: true },
      { source: "/online/", destination: "/", permanent: true },
      { source: "/under-construction/", destination: "/", permanent: true },
      ...LEGACY_DEMO_POSTS.map((slug) => ({ source: `/${slug}/`, destination: "/blog/", permanent: true })),
      // Former WordPress account URLs → the platform's own pages (WordPress is no longer used for accounts).
      { source: "/login/", destination: "/sign-in/", permanent: true },
      { source: "/my-account/", destination: "/account/", permanent: true },
      { source: "/registration/", destination: "/register/", permanent: true },
      { source: "/lost-password/", destination: "/forgot-password/", permanent: true },
      { source: "/customer-panel/", destination: "/customer/dashboard/", permanent: true },
      { source: "/employee-panel/", destination: "/employee/dashboard/", permanent: true },
      { source: "/employee-dashboard/", destination: "/employee/dashboard/", permanent: true },
      { source: "/careers/", destination: "/get-job/", permanent: true },
      { source: "/customer/", destination: "/customer/dashboard/", permanent: false },
      { source: "/employee/", destination: "/employee/dashboard/", permanent: false },
      { source: "/wp-admin/:path*", destination: "/admin/", permanent: false },
      { source: "/wp-login.php", destination: "/sign-in/", permanent: false },
      // Old media links keep working while WordPress still hosts them.
      ...(origin(WORDPRESS_URL) !== origin(SITE_URL)
        ? [{ source: "/wp-content/uploads/:path*", destination: `${WORDPRESS_URL}/wp-content/uploads/:path*`, permanent: true }]
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
