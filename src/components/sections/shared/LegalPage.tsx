import legal from "@/content/generated/legal.json";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/Primitives";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatDate } from "@/lib/utils";

export type LegalSlug = keyof typeof legal;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Adds ids to <h2> headings and returns a table of contents. */
function withAnchors(html: string) {
  const toc: { id: string; label: string }[] = [];
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner: string) => {
    const label = inner.replace(/<[^>]+>/g, "").trim();
    const id = slugify(label) || `section-${toc.length + 1}`;
    toc.push({ id, label });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

export function legalMetadata(slug: LegalSlug, description: string) {
  const page = legal[slug];
  return pageMetadata({ title: page.title, description, path: `/${slug}/` });
}

export function LegalPage({ slug, intro }: { slug: LegalSlug; intro: string }) {
  const page = legal[slug];
  const { html, toc } = withAnchors(page.html);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: page.title, path: `/${slug}/` }])} />
      <PageHero crumbs={[{ label: page.title }]} eyebrow="Legal" title={[page.title]} lede={intro} />
      <section className="pb-24 lg:pb-32">
        <div className="container-x grid gap-12 lg:grid-cols-12">
          {toc.length > 2 && (
            <aside className="lg:col-span-3">
              <nav aria-label="On this page" className="lg:sticky lg:top-28">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">On this page</p>
                <ol className="mt-4 space-y-2.5 border-l border-line">
                  {toc.map((t) => (
                    <li key={t.id}>
                      <a href={`#${t.id}`} className="-ml-px block border-l border-transparent pl-4 text-sm text-muted transition-colors hover:border-teal-500 hover:text-navy-900">
                        {t.label}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}
          <Reveal className={toc.length > 2 ? "lg:col-span-8 lg:col-start-5" : "lg:col-span-8"}>
            <div className="rounded-[2rem] border border-line bg-white p-7 shadow-soft sm:p-12">
              <p className="mb-10 text-sm text-muted">
                Last updated <time dateTime={page.modified}>{formatDate(page.modified)}</time> · {site.legalName}
              </p>
              <div className="prose-care" dangerouslySetInnerHTML={{ __html: html }} />
              <p className="mt-12 border-t border-line pt-8 text-sm text-muted">
                Questions about this page? Contact us at{" "}
                <a className="font-semibold text-teal-700 underline" href={site.emailHref}>
                  {site.email}
                </a>{" "}
                or{" "}
                <a className="font-semibold text-teal-700 underline" href={site.phoneHref}>
                  {site.phone}
                </a>
                .
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
