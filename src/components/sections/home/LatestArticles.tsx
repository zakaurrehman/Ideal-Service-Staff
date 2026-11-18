import { getPosts } from "@/lib/wordpress";
import { ArticleCard } from "@/components/sections/shared/ArticleCard";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/Primitives";
import { ButtonLink } from "@/components/ui/Button";

/** Section K — latest posts, pulled live from the WordPress blog. */
export async function LatestArticles() {
  const posts = (await getPosts()).slice(0, 3);
  if (!posts.length) return null;
  return (
    <section className="cv-auto section bg-white">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
          <SectionHeading eyebrow="Latest articles" title={["Insights on care", { text: "and service.", className: "italic text-teal-700" }]} />
          <ButtonLink href="/blog/" variant="outline" arrow>
            View all articles
          </ButtonLink>
        </div>
        <RevealGroup className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {posts.map((p) => (
            <RevealItem key={p.id}>
              <ArticleCard post={p} />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
