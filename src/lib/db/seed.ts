/**
 * Reference data required by the platform (idempotent; safe on every deploy):
 * system roles + permissions, and the service catalogue migrated from the
 * original website. Existing rows are never overwritten, so admin edits survive.
 * No demo customers, bookings or statistics are ever created here.
 */
import { eq, inArray } from "drizzle-orm";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES } from "../auth/permissions";
import { serviceCategories as contentCategories, services as contentServices } from "../../content/services";
import type { DB } from "./client";
import { permissions, rolePermissions, roles, serviceCategories, services } from "./schema";

export async function seedReferenceData(db: DB) {
  await db.transaction(async (tx) => {
    // Permissions: insert new ones, refresh labels of existing ones.
    for (const p of PERMISSIONS) {
      await tx
        .insert(permissions)
        .values({ key: p.key, name: p.name, group: p.group, description: p.description })
        .onConflictDoUpdate({ target: permissions.key, set: { name: p.name, group: p.group, description: p.description } });
    }

    // System roles: default grants only when the role is first created.
    for (const r of SYSTEM_ROLES) {
      const inserted = await tx
        .insert(roles)
        .values({ key: r.key, name: r.name, description: r.description, isSystem: true, isStaff: r.isStaff })
        .onConflictDoNothing({ target: roles.key })
        .returning({ id: roles.id });
      const grants = DEFAULT_ROLE_PERMISSIONS[r.key];
      if (inserted[0] && grants.length) {
        await tx.insert(rolePermissions).values(grants.map((k) => ({ roleId: inserted[0].id, permissionKey: k })));
      }
    }

    // Service catalogue from the original website content.
    const cats = contentCategories.filter((c) => c.id !== "all");
    for (const [i, c] of cats.entries()) {
      await tx.insert(serviceCategories).values({ slug: c.id, name: c.label, sortOrder: i }).onConflictDoNothing({ target: serviceCategories.slug });
    }
    const catRows = await tx
      .select({ id: serviceCategories.id, slug: serviceCategories.slug })
      .from(serviceCategories)
      .where(inArray(serviceCategories.slug, cats.map((c) => c.id)));
    const catId = new Map(catRows.map((r) => [r.slug, r.id]));
    for (const [i, s] of contentServices.entries()) {
      await tx
        .insert(services)
        .values({
          slug: s.slug,
          name: s.title,
          categoryId: catId.get(s.category) ?? null,
          summary: s.summary,
          description: s.description.join("\n\n"),
          tasks: s.tasks,
          icon: s.icon,
          imagePath: s.image,
          sortOrder: i,
        })
        .onConflictDoNothing({ target: services.slug });
    }
  });
}

/** Used by tests: role id lookup. */
export async function roleId(db: DB, key: string) {
  const [r] = await db.select({ id: roles.id }).from(roles).where(eq(roles.key, key));
  if (!r) throw new Error(`Role ${key} missing — run migrations/seed.`);
  return r.id;
}
