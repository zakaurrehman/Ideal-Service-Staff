/**
 * Reduces WordPress (Elementor / Gutenberg) markup to a small, safe set of
 * semantic tags. Shared by the runtime blog fetcher and the content-sync
 * script (Node ≥ 23 runs this file directly via type stripping), so keep it
 * free of path aliases and non-erasable TypeScript syntax.
 */
const ALLOWED = new Set(["h2", "h3", "h4", "p", "ul", "ol", "li", "strong", "em", "b", "i", "a", "br", "blockquote"]);

export function decodeEntities(s: string): string {
  return s
    .replace(/&#8217;|&#8216;/g, "’")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—")
    .replace(/&#038;|&amp;/g, "&")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&#8230;|&hellip;/g, "…");
}

export function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function cleanHtml(html: string, siteOrigin: string): string {
  let h = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<h1[\s\S]*?<\/h1>/gi, "")
    .replace(/<h[5-6][^>]*>/gi, "<h4>")
    .replace(/<\/h[5-6]>/gi, "</h4>");

  h = h.replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (tag: string, name: string, attrs: string) => {
    const n = name.toLowerCase();
    if (!ALLOWED.has(n)) return n === "div" || n === "section" ? "\n" : "";
    if (tag.startsWith("</")) return `</${n}>`;
    if (n === "a") {
      const href = /href="([^"]*)"/i.exec(attrs)?.[1] ?? "";
      if (!href || /^\s*javascript:/i.test(href)) return "<a>";
      const local = href.startsWith(siteOrigin) ? href.slice(siteOrigin.length) || "/" : href;
      const ext = /^https?:/i.test(local);
      return `<a href="${local.replace(/"/g, "&quot;")}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>`;
    }
    return `<${n}>`;
  });

  return decodeEntities(h)
    .replace(/<a>([\s\S]*?)<\/a>/g, "$1")
    .replace(/<i>\s*<\/i>/g, "")
    .replace(/<a href="[^"]*">\s*(Get Care|Get Job|Read More[^<]*)\s*<\/a>/gi, "")
    .replace(/<(p|h2|h3|h4|li|strong)>\s*<\/\1>/g, "")
    .replace(/<(p|h2)>\s*Home\s*<\/\1>/i, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}
