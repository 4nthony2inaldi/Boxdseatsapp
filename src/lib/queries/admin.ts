import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Whether a user is an admin. Checks the admin_users table, which has no
 * client-writable RLS policy (service-role grants only), so this can't be
 * spoofed by a user editing their own profile.
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  is_admin: boolean;
  is_private: boolean;
  logs: number;
  created_at: string;
};

/**
 * Full user roster for the admin panel. Requires a SERVICE-ROLE client (to
 * read auth emails); the caller must already be verified as an admin.
 */
export async function fetchAllUsersForAdmin(
  admin: SupabaseClient
): Promise<AdminUserRow[]> {
  // Auth users (emails + canonical created_at), paginated defensively.
  const authById = new Map<string, { email: string | null; created_at: string }>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) authById.set(u.id, { email: u.email ?? null, created_at: u.created_at });
    if (data.users.length < 200) break;
  }

  const [{ data: profiles }, { data: admins }, { data: logs }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, is_private"),
    admin.from("admin_users").select("user_id"),
    admin.from("event_logs").select("user_id"),
  ]);

  const adminSet = new Set((admins || []).map((a) => a.user_id as string));
  const logCount = new Map<string, number>();
  for (const l of logs || []) logCount.set(l.user_id, (logCount.get(l.user_id) || 0) + 1);

  return (profiles || [])
    .map((p) => {
      const auth = authById.get(p.id);
      return {
        id: p.id,
        email: auth?.email ?? null,
        username: p.username,
        display_name: p.display_name,
        is_admin: adminSet.has(p.id),
        is_private: p.is_private,
        logs: logCount.get(p.id) || 0,
        created_at: auth?.created_at ?? "",
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}
