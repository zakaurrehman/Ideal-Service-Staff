import { count, desc, eq, type SQL } from "drizzle-orm";
import { getDb, t } from "@/lib/db";
import { can, requireStaff } from "@/lib/auth/session";
import { retryEmailAction, sendAnnouncementAction } from "@/lib/actions/admin";
import { getSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";
import { Alert, Card, PageHeader, Pagination, StatusBadge, Table, Td, Th, pageOf, sp, type Search } from "@/components/app/ui";
import { ActionButton, ActionForm, Checkbox, Field, FormMessage, Select, Submit, TextArea } from "@/components/app/forms";
import { NotificationsView } from "@/components/app/shared";

export const metadata = { title: "Notifications" };

export default async function AdminNotifications({ searchParams }: { searchParams: Promise<Search> }) {
  const search = await searchParams;
  const v = await requireStaff();
  if (!can(v, "notifications.manage")) return <NotificationsView viewer={v} base="/admin/notifications/" search={search} />;
  const db = await getDb();
  const tz = (await getSettings(db)).timezone;
  const page = pageOf(search);
  const size = 15;
  const status = sp(search, "email");
  const where: SQL | undefined = ["sent", "failed", "queued", "dev_logged"].includes(status) ? eq(t.emailLogs.status, status as "sent") : undefined;
  const [emails, [{ n }], [{ failed }]] = await Promise.all([
    db.select().from(t.emailLogs).where(where).orderBy(desc(t.emailLogs.createdAt)).limit(size).offset((page - 1) * size),
    db.select({ n: count() }).from(t.emailLogs).where(where),
    db.select({ failed: count() }).from(t.emailLogs).where(eq(t.emailLogs.status, "failed")),
  ]);
  const configured = Boolean(process.env.RESEND_API_KEY);
  return (
    <>
      <PageHeader title="Notifications" description="Send announcements, monitor transactional email and retry failures." />
      {!configured && (
        <div className="mb-6">
          <Alert tone="amber" title="Email delivery is not configured">
            RESEND_API_KEY is not set, so emails are recorded here but not sent{process.env.NODE_ENV === "production" ? " (status “Failed”)" : " (status “Dev log only”)"}. In-app notifications still work. See docs/ENVIRONMENT-VARIABLES.md.
          </Alert>
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <Card title="Send an announcement" description="Appears in each recipient’s notification centre; optionally by email.">
          <ActionForm action={sendAnnouncementAction} className="space-y-4">
            <FormMessage />
            <Select name="audience" label="Audience" options={[{ value: "customer", label: "All customers" }, { value: "employee", label: "All care professionals" }, { value: "all", label: "Everyone" }]} placeholder="Choose…" required />
            <Field name="title" label="Title" maxLength={120} required />
            <TextArea name="body" label="Message" rows={4} maxLength={2000} required />
            <Checkbox name="email" label="Also send by email" hint="Respects each user’s announcement email preference." />
            <Submit variant="teal">Send announcement</Submit>
          </ActionForm>
        </Card>
        <Card
          title="Email log"
          description={`${failed} failed · failed emails retry automatically (5 attempts with back-off).`}
          padded={false}
          actions={
            <div className="flex flex-wrap gap-1 text-sm">
              {[["", "All"], ["failed", "Failed"], ["sent", "Sent"], ["dev_logged", "Dev"]].map(([k, l]) => (
                <a key={k} href={k ? `?email=${k}` : "?"} className={`rounded-full px-3 py-1 font-semibold ${status === k ? "bg-navy-900 text-white" : "text-navy-800 hover:bg-canvas"}`}>
                  {l}
                </a>
              ))}
            </div>
          }
        >
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>To</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {emails.map((e) => (
                <tr key={e.id}>
                  <Td className="whitespace-nowrap text-xs">{fmtDateTime(e.createdAt, tz)}</Td>
                  <Td className="max-w-48 truncate">{e.toEmail}</Td>
                  <Td>
                    <p className="max-w-72 truncate">{e.subject}</p>
                    {e.lastError && <p className="max-w-72 truncate text-xs text-red-700">{e.lastError}</p>}
                  </Td>
                  <Td>
                    <StatusBadge status={e.status} />
                    <span className="block text-xs text-muted">{e.attempts} attempt(s)</span>
                  </Td>
                  <Td className="text-right">{e.status === "failed" && configured && <ActionButton action={retryEmailAction.bind(null, e.id)}>Retry</ActionButton>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination base="/admin/notifications/" search={search} page={page} pageSize={size} total={n} />
        </Card>
      </div>
      <div className="mt-10">
        <NotificationsView viewer={v} base="/admin/notifications/" search={{}} />
      </div>
    </>
  );
}
