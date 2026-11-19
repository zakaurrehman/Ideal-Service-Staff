import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPost, getPosts } from "@/lib/wordpress";
import { SITE_URL, site } from "@/content/site";
import { ArticleCard } from "@/components/sections/shared/ArticleCard";
import { Enter } from "@/components/motion/Reveal";
import { ButtonLink } from "@/components/ui/Button";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";
import { formatDate, readingTime } from "@/lib/utils";

/**
 * Blog posts keep their original WordPress permalinks (/<post-slug>/).
 * New posts published in WordPress render on demand and are then cached.
 */
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams() {
  return (await getPosts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};
  return pageMetadata({
    title: post.title,
    description: post.excerpt.slice(0, 158),
    path: `/${post.slug}/`,
    image: post.image ?? undefined,
    type: "article",
  });
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();
  const more = (await getPosts()).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Our Blog", path: "/blog/" },
          { name: post.title, path: `/${post.slug}/` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          datePublished: post.date,
          dateModified: post.modified,
          image: post.image ? new URL(post.image, SITE_URL).toString() : undefined,
          mainEntityOfPage: `${SITE_URL}/${post.slug}/`,
          author: { "@type": "Organization", name: site.name },
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />

      <article className="pb-24 pt-32 sm:pt-40 lg:pb-32">
        <header className="container-x max-w-4xl">
          <Enter>
            <Link href="/blog/" className="inline-flex items-center gap-2 text-sm font-semibold text-teal-700 hover:text-teal-800">
              <ArrowLeft aria-hidden className="size-4" /> Our Blog
            </Link>
          </Enter>
          <Enter delay={0.05}>
            <h1 className="display-lg mt-6">{post.title}</h1>
          </Enter>
          <Enter delay={0.1}>
            <p className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted">
              <span className="font-semibold text-navy-900">{site.name}</span>
              <span aria-hidden className="size-1 rounded-full bg-navy-300" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span aria-hidden className="size-1 rounded-full bg-navy-300" />
              {readingTime(post.html)} min read
            </p>
          </Enter>
        </header>

        {post.image && (
          <Enter delay={0.15} className="container-x mt-12 max-w-5xl">
            <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] shadow-lift">
              <Image src={post.image} alt={post.imageAlt} fill priority sizes="(min-width: 1024px) 1000px, 100vw" className="object-cover" />
            </div>
          </Enter>
        )}

        <div className="container-x mt-14 max-w-3xl">
          {/* Content comes from the site’s own WordPress, reduced to a safe tag allow-list in lib/wp-html.ts */}
          <div className="prose-care" dangerouslySetInnerHTML={{ __html: post.html }} />

          <aside className="mt-16 rounded-[2rem] bg-navy-900 p-8 text-navy-200 sm:p-10">
            <p className="font-display text-2xl text-white">Need support for yourself or a loved one?</p>
            <p className="mt-2">Talk to our team about compassionate, qualified care.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/get-care/" variant="accent" arrow>
                Request Care
              </ButtonLink>
              <ButtonLink href={site.phoneHref} variant="outline-light">
                {site.phone}
              </ButtonLink>
            </div>
          </aside>
        </div>
      </article>

      {more.length > 0 && (
        <section className="section bg-white">
          <div className="container-x">
            <h2 className="display-md">More articles</h2>
            <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {more.map((p) => (
                <ArticleCard key={p.id} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
