import "server-only";
/**
 * Admin-managed website content (CMS). Public pages read through these helpers:
 * database first, original website content as the fallback. The fallback is
 * used when the database isn't configured, or during a local build with the
 * embedded dev database (it can't be shared between build workers).
 * Admin saves call revalidatePath(), so statically generated pages refresh on
 * their next visit.
 */
import { asc, eq, isNull, and } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured, t } from "@/lib/db";
import { faqs as staticFaqs, testimonials as staticTestimonials } from "@/content/company";
import { services as staticServices, type Service, type IconKey } from "@/content/services";

const canRead = () => isDatabaseConfigured() && !(process.env.NEXT_PHASE === "phase-production-build" && !process.env.DATABASE_URL);

export const contentSchemas = {
  announcement: z.object({ enabled: z.boolean(), text: z.string().max(200), href: z.string().max(300).optional().default("") }),
  faqs: z.array(z.object({ q: z.string().min(3).max(300), a: z.string().min(3).max(2000) })).max(40),
  testimonials: z
    .array(z.object({ quote: z.string().min(10).max(2000), name: z.string().min(1).max(120), location: z.string().max(120), outcomeLabel: z.string().max(80), outcomes: z.array(z.string().max(200)).max(8) }))
    .max(20),
};
export type ContentKey = keyof typeof contentSchemas;
export type Announcement = z.infer<typeof contentSchemas.announcement>;

export const CONTENT_DEFAULTS: { [K in ContentKey]: z.infer<(typeof contentSchemas)[K]> } = {
  announcement: { enabled: false, text: "", href: "" },
  faqs: staticFaqs,
  testimonials: staticTestimonials,
};

export async function getContent<K extends ContentKey>(key: K): Promise<z.infer<(typeof contentSchemas)[K]>> {
  if (!canRead()) return CONTENT_DEFAULTS[key];
  try {
    const db = await getDb();
    const [row] = await db.select().from(t.contentBlocks).where(eq(t.contentBlocks.key, key));
    if (!row) return CONTENT_DEFAULTS[key];
    const parsed = contentSchemas[key].safeParse(row.value);
    return (parsed.success ? parsed.data : CONTENT_DEFAULTS[key]) as z.infer<(typeof contentSchemas)[K]>;
  } catch (err) {
    console.error("[content] falling back for", key, (err as Error).message);
    return CONTENT_DEFAULTS[key];
  }
}

const ICONS = new Set<IconKey>(["stethoscope", "brain", "handHeart", "house", "heartPulse", "heartHandshake", "userCheck", "microscope", "leaf", "accessibility", "pill", "smile", "clipboard"]);

/** Active services for the public site, in the shape the existing components expect. */
export async function getPublicServices(): Promise<Service[]> {
  if (!canRead()) return staticServices;
  try {
    const db = await getDb();
    const rows = await db
      .select({ s: t.services, category: t.serviceCategories.slug })
      .from(t.services)
      .leftJoin(t.serviceCategories, eq(t.serviceCategories.id, t.services.categoryId))
      .where(and(eq(t.services.isActive, true), isNull(t.services.archivedAt)))
      .orderBy(asc(t.services.sortOrder), asc(t.services.name));
    if (!rows.length) return staticServices;
    return rows.map(({ s, category }) => {
      const original = staticServices.find((x) => x.slug === s.slug);
      return {
        slug: s.slug,
        title: s.name,
        category: (["home", "clinical", "professional"].includes(category ?? "") ? category : "home") as Service["category"],
        icon: (s.icon && ICONS.has(s.icon as IconKey) ? s.icon : "heartHandshake") as IconKey,
        image: s.imagePath ?? original?.image ?? "/images/caregiver-greeting.webp",
        imagePosition: original?.imagePosition,
        summary: s.summary,
        description: s.description.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
        tasks: s.tasks,
      };
    });
  } catch (err) {
    console.error("[content] services fallback", (err as Error).message);
    return staticServices;
  }
}
