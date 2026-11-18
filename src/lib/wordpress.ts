import "server-only";
import snapshot from "@/content/generated/posts.json";
import { cleanHtml, decodeEntities, htmlToText } from "@/lib/wp-html";

/**
 * Blog content stays in WordPress. Pages fetch the REST API with hourly ISR;
 * if WordPress is unreachable the build/runtime falls back to the snapshot
 * produced by `npm run content:sync`, so the site never breaks.
 */
const WORDPRESS_URL = (process.env.WORDPRESS_URL ?? "https://idealservicestaff.com").replace(/\/$/, "");

export type Post = {
  id: number;
  slug: string;
  title: string;
  date: string;
  modified: string;
  excerpt: string;
  html: string;
  image: string | null;
  imageAlt: string;
};

/** Leftover finance demo posts from the original theme — redirected to /blog/ (see next.config.ts). */
const HIDDEN = new Set([
  "demystifying-technical-analysis-a-beginners-guide-to-chart-patterns-and-indicators",
  "the-art-of-risk-management-safeguarding-your-investments-in-a-volatile-market",
  "mastering-market-volatility-strategies-for-thriving-in-turbulent-times",
]);

/** Featured images that already exist locally as optimised WebP. */
const LOCAL_IMAGES: Record<string, string> = {
  "Layer-72.jpg": "/images/hands-held.webp",
  "Layer-73.jpg": "/images/veteran-visit.webp",
  "Layer-75.jpg": "/images/respite-sunset.webp",
};

const localize = (url: string | null) => {
  if (!url) return null;
  const file = url.split("/").pop() ?? "";
  return LOCAL_IMAGES[file] ?? url;
};

type WpPost = {
  id: number;
  slug: string;
  date: string;
  modified: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  _embedded?: { "wp:featuredmedia"?: { source_url?: string; alt_text?: string }[] };
};

function fromWp(p: WpPost): Post {
  const media = p._embedded?.["wp:featuredmedia"]?.[0];
  const title = decodeEntities(p.title.rendered);
  return {
    id: p.id,
    slug: p.slug,
    title,
    date: p.date,
    modified: p.modified,
    excerpt: htmlToText(p.excerpt.rendered).replace(/\s*\[…\]$|\s*…$/, "…"),
    html: cleanHtml(p.content.rendered, WORDPRESS_URL),
    image: media?.source_url ?? null,
    imageAlt: media?.alt_text || title,
  };
}

const finalize = (posts: Post[]) =>
  posts
    .filter((p) => !HIDDEN.has(p.slug))
    .map((p) => ({ ...p, image: localize(p.image) }))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));

export async function getPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=50&_embed=wp:featuredmedia`, {
      next: { revalidate: 3600, tags: ["posts"] },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const data = (await res.json()) as WpPost[];
    return finalize(data.map(fromWp));
  } catch {
    return finalize(snapshot as Post[]);
  }
}

export async function getPost(slug: string) {
  const posts = await getPosts();
  return posts.find((p) => p.slug === slug) ?? null;
}
