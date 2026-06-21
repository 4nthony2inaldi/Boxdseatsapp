import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { isAdmin, fetchAllUsersForAdmin } from "@/lib/queries/admin";
import AdminUserList from "@/components/admin/AdminUserList";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Non-admins get a 404 — the route shouldn't be discoverable.
  if (!(await isAdmin(supabase, user.id))) notFound();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Admin tools are not configured.</p>
      </div>
    );
  }
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
  const users = await fetchAllUsersForAdmin(admin);

  return (
    <div className="max-w-lg mx-auto pb-5">
      <PageHeader title="Admin · Users" backHref="/settings" />
      <div className="px-4 pt-3">
        <Link
          href="/admin/ingest"
          className="block rounded-xl border border-white/10 px-4 py-3 text-sm text-text-primary hover:bg-white/5"
        >
          Ingest health <span className="text-text-muted">· sync jobs and per-league freshness</span>
        </Link>
      </div>
      <div className="px-4 pt-3 pb-2 text-xs text-text-muted">
        {users.length} accounts · deleting cascades all of a user&apos;s data and removes their login.
      </div>
      <AdminUserList users={users} currentUserId={user.id} />
    </div>
  );
}
