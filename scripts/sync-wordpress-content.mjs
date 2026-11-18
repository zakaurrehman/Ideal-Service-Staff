/**
 * Pulls long-form content (legal pages + blog posts) from the existing
 * WordPress REST API and stores a cleaned, semantic snapshot in
 * src/content/generated/. The site renders from this snapshot, and blog
 * pages additionally revalidate against the live API at runtime (ISR), so
 * editors can keep publishing in WordPress.
 *
 * Run:  npm run content:sync        (WORDPRESS_URL overrides the source)
 */
import fs from "node:fs";
import path from "node:path";
import { cleanHtml as cleanHtmlBase, decodeEntities, htmlToText } from "../src/lib/wp-html.ts";

const WP = (process.env.WORDPRESS_URL || "https://idealservicestaff.com").replace(/\/$/, "");
const OUT = path.resolve("src/content/generated");
const LEGAL = ["legal-disclosure", "privacy-policy", "terms-and-conditions", "sms-terms-conditions"];

const cleanHtml = (html) => cleanHtmlBase(html, WP);
const decode = decodeEntities;
const text = htmlToText;

/** Elementor pages embed the testimonial slider + contact CTA after the legal copy. */
function stripPageChrome(html) {
  const i = html.search(/<h[234]>\s*(What Our Client|We are Just a Call)/i);
  return i > 0 ? html.slice(0, i).trim() : html;
}

function dropLeadingTitle(html, title) {
  const m = /^<h2>([\s\S]*?)<\/h2>\s*/.exec(html);
  return m && text(m[1]).toLowerCase() === title.toLowerCase() ? html.slice(m[0].length) : html;
}


async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "IdealServiceStaff-ContentSync/1.0" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function run() {
  fs.mkdirSync(OUT, { recursive: true });

  const pages = await getJson(`${WP}/wp-json/wp/v2/pages?per_page=100&slug=${LEGAL.join(",")}`);
  const legal = {};
  for (const slug of LEGAL) {
    const p = pages.find((x) => x.slug === slug);
    if (!p) throw new Error(`Missing legal page: ${slug}`);
    legal[slug] = {
      slug,
      title: decode(p.title.rendered),
      modified: p.modified,
      html: stripPageChrome(dropLeadingTitle(cleanHtml(p.content.rendered), decode(p.title.rendered))),
    };
    console.log(`✓ legal/${slug}  ${legal[slug].html.length} chars`);
  }
  fs.writeFileSync(path.join(OUT, "legal.json"), JSON.stringify(legal, null, 2));

  const raw = await getJson(`${WP}/wp-json/wp/v2/posts?per_page=100&_embed=wp:featuredmedia`);
  const posts = raw.map((p) => {
    const media = p._embedded?.["wp:featuredmedia"]?.[0];
    return {
      id: p.id,
      slug: p.slug,
      title: decode(p.title.rendered),
      date: p.date,
      modified: p.modified,
      excerpt: text(p.excerpt.rendered).replace(/\s*\[…\]$|\s*…$/, "…"),
      html: cleanHtml(p.content.rendered),
      image: media?.source_url ?? null,
      imageAlt: media?.alt_text || decode(p.title.rendered),
      categories: p.categories,
    };
  });
  fs.writeFileSync(path.join(OUT, "posts.json"), JSON.stringify(posts, null, 2));
  console.log(`✓ ${posts.length} posts`);
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}` || process.argv[1].endsWith("sync-wordpress-content.mjs")) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
