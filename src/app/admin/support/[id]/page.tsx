import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/session";
import { SupportThreadView } from "@/components/app/shared";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const view = await SupportThreadView({ viewer: await requireStaff("support.manage"), threadId: id, base: "/admin/support/", staffView: true });
  return view ?? notFound();
}
