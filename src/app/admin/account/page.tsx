import { eq } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { requireStaff } from "@/lib/auth/session";
import { ProfileBasics, SettingsView } from "@/components/app/shared";

export const metadata = { title: "My Account" };

export default async function AdminAccount() {
  const v = await requireStaff();
  const [p] = await (await getDb()).select().from(t.userProfiles).where(eq(t.userProfiles.userId, v.id));
  return (
    <>
      <SettingsView viewer={v} />
      <div className="mt-8">
        <ProfileBasics viewer={v} phone={p?.phone ?? null} />
      </div>
    </>
  );
}
