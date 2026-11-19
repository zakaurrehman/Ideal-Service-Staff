import { redirect } from "next/navigation";
import { homePath, requireViewer } from "@/lib/auth/session";

/** /account/ (and the legacy /my-account/) → the signed-in user's own area. */
export default async function AccountPage() {
  redirect(homePath(await requireViewer("/account/")));
}
