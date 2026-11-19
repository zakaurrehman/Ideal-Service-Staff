import Link from "next/link";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { TEMPLATES } from "@/lib/email/templates";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { Badge, Card, PageHeader } from "@/components/app/ui";

export const metadata = { title: "Email Templates" };

export default async function Templates() {
  await requireStaff("templates.manage");
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const overrides = new Map((await db.select().from(t.emailTemplates)).map((o) => [o.key, o]));
  return (
    <>
      <PageHeader title="Email Templates" description="Transactional emails sent by the platform. Edit the wording; links and names are filled in automatically." />
      <Card padded={false}>
        <ul className="divide-y divide-line">
          {Object.entries(TEMPLATES).map(([key, tpl]) => {
            const o = overrides.get(key);
            return (
              <li key={key}>
                <Link href={`/admin/templates/${key}/`} className="flex flex-wrap items-center gap-3 px-6 py-4 hover:bg-canvas/70">
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-navy-950">{tpl.name}</span>
                    <span className="block truncate text-sm text-muted">{o?.subject ?? tpl.subject}</span>
                  </span>
                  {o ? <Badge tone="teal">Customised {fmtDateTime(o.updatedAt, tz)}</Badge> : <Badge>Default</Badge>}
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
