import { SupabaseClient } from "@supabase/supabase-js";

export type Notification = {
  id: string;
  type: string;
  message: string | null;
  is_read: boolean;
  created_at: string;
  actor: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  target_id: string | null;
  target_type: string | null;
};

export async function fetchNotifications(
  supabase: SupabaseClient,
  userId: string,
  limit = 50
): Promise<Notification[]> {
  const { data } = await supabase
    .from("notifications")
    .select(
      `id, type, message, is_read, created_at, target_id, target_type,
       actor_id`
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return [];

  // Fetch actor profiles
  const actorIds = [
    ...new Set(data.map((n) => n.actor_id).filter(Boolean)),
  ] as string[];

  let actorMap = new Map<string, { id: string; username: string; display_name: string | null; avatar_url: string | null }>();

  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", actorIds);

    if (profiles) {
      actorMap = new Map(profiles.map((p) => [p.id, p]));
    }
  }

  return data.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    is_read: n.is_read,
    created_at: n.created_at,
    actor: n.actor_id ? actorMap.get(n.actor_id) || null : null,
    target_id: n.target_id,
    target_type: n.target_type,
  }));
}

export async function fetchUnreadCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);

  return count || 0;
}

export async function markNotificationsRead(
  supabase: SupabaseClient,
  userId: string,
  notificationIds?: string[]
): Promise<void> {
  if (notificationIds && notificationIds.length > 0) {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .in("id", notificationIds);
  } else {
    // Mark all as read
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);
  }
}
