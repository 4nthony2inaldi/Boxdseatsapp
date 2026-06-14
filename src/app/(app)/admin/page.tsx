import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin, fetchAllUsersForAdmin } from "@/lib/queries/admin";
import AdminUserList from "@/components/admin/AdminUserList";

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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Link href="/settings" className="p-1 hover:opacity-80 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-lg text-text-primary tracking-wide">Admin · Users</h1>
      </div>
      <div className="px-4 pt-3 pb-2 text-xs text-text-muted">
        {users.length} accounts · deleting cascades all of a user&apos;s data and removes their login.
      </div>
      <AdminUserList users={users} currentUserId={user.id} />
    </div>
  );
}
