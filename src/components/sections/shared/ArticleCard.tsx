import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Post } from "@/lib/wordpress";
import { formatDate, readingTime } from "@/lib/utils";

export function ArticleCard({ post, featured = false, headingLevel = 3 }: { post: Post; featured?: boolean; headingLevel?: 2 | 3 }) {
  const H = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex h-full flex-col">
      <div className={`relative overflow-hidden rounded-[1.75rem] ${featured ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        {post.image ? (
          <Image
            src={post.image}
            alt=""
            fill
            sizes={featured ? "(min-width: 1024px) 55vw, 100vw" : "(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 100vw"}
            className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-teal-100 to-navy-100" />
        )}
        <span className="absolute right-4 top-4 grid size-11 place-items-center rounded-full bg-white/90 text-navy-900 opacity-0 shadow-soft backdrop-blur transition-all duration-500 group-hover:opacity-100 group-focus-within:opacity-100">
          <ArrowUpRight aria-hidden className="size-5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col pt-6">
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span aria-hidden className="size-1 rounded-full bg-navy-300" />
          {readingTime(post.html)} min read
        </p>
        <H className={`mt-3 font-display leading-snug text-navy-900 transition-colors group-hover:text-teal-700 ${featured ? "text-3xl" : "text-2xl"}`}>
          {/* Whole card is clickable via the stretched link */}
          <Link href={`/${post.slug}/`} className="after:absolute after:inset-0 after:z-10 after:rounded-[1.75rem]">
            {post.title}
          </Link>
        </H>
        <p className="mt-3 line-clamp-3 text-[0.95rem] leading-relaxed text-muted">{post.excerpt}</p>
      </div>
    </article>
  );
}
