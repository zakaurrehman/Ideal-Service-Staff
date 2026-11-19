import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";
import { services } from "@/content/services";
import { getPosts } from "@/lib/wordpress";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly") => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });

  const posts = await getPosts();

  return [
    page("/", 1, "weekly"),
    page("/non-medical-home-care-experts/", 0.8),
    page("/services/", 0.9),
    ...services.map((s) => page(`/services/${s.slug}/`, 0.7)),
    page("/how-it-works/", 0.7),
    page("/get-care/", 0.9),
    page("/services-booking/", 0.7),
    page("/get-job/", 0.7),
    page("/careers/apply/", 0.6),
    page("/contact/", 0.8),
    page("/blog/", 0.6, "weekly"),
    ...posts.map((p) => ({ url: `${SITE_URL}/${p.slug}/`, lastModified: new Date(p.modified), changeFrequency: "yearly" as const, priority: 0.5 })),
    page("/legal-disclosure/", 0.3, "yearly"),
    page("/privacy-policy/", 0.3, "yearly"),
    page("/terms-and-conditions/", 0.3, "yearly"),
    page("/sms-terms-conditions/", 0.3, "yearly"),
  ];
}
