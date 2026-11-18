import { getPosts } from "@/lib/wordpress";
import { ArticleCard } from "@/components/sections/shared/ArticleCard";
import { Enter, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { PageHero } from "@/components/ui/Primitives";
import { JsonLd, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = pageMetadata({
  title: "Our Blog",
  description: "Articles on care, customer service and support from the Ideal Service Staff team.",
  path: "/blog/",
  image: "/images/hands-held.webp",
});

export default async function BlogPage() {
  const posts = await getPosts();
  const [featured, ...rest] = posts;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Our Blog", path: "/blog/" }])} />
      <PageHero
        crumbs={[{ label: "Our Blog" }]}
        eyebrow="Our blog"
        title={["Stories, insights", { text: "and good advice.", className: "italic text-teal-700" }]}
        lede="Thoughts from our team on delivering care and service that makes a real difference."
      />
      <section className="pb-24 lg:pb-32">
        <div className="container-x">
          {posts.length === 0 && <p className="text-muted">New articles are coming soon.</p>}
          {featured && (
            <Enter className="mb-16 grid gap-8 border-b border-line pb-16 lg:grid-cols-12">
              <div className="lg:col-span-12">
                <ArticleCard post={featured} featured headingLevel={2} />
              </div>
            </Enter>
          )}
          {rest.length > 0 && (
            <RevealGroup className="grid gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
              {rest.map((p) => (
                <RevealItem key={p.id}>
                  <ArticleCard post={p} headingLevel={2} />
                </RevealItem>
              ))}
            </RevealGroup>
          )}
        </div>
      </section>
    </>
  );
}
