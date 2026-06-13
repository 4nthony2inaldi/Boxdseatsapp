import { SupabaseClient } from "@supabase/supabase-js";

export type SettingsProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  fav_sport: string | null;
  home_city: string | null;
  is_private: boolean;
  default_privacy: string;
  comments_enabled: boolean;
  pinned_list_1_id: string | null;
  pinned_list_2_id: string | null;
};

export async function fetchSettingsProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<SettingsProfile | null> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, fav_sport, home_city, is_private, default_privacy, comments_enabled, pinned_list_1_id, pinned_list_2_id"
    )
    .eq("id", userId)
    .single();

  return data;
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<{
    display_name: string | null;
    bio: string | null;
    fav_sport: string | null;
    home_city: string | null;
    is_private: boolean;
    default_privacy: string;
    comments_enabled: boolean;
    pinned_list_1_id: string | null;
    pinned_list_2_id: string | null;
  }>
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) return { error: "Failed to update settings." };
  return { success: true };
}

export type AvailableList = {
  id: string;
  name: string;
  sport: string | null;
  item_count: number;
  source: string;
  created_by: string | null;
  creator_username: string | null;
};

export async function fetchAvailableLists(
  supabase: SupabaseClient
): Promise<AvailableList[]> {
  // Any list can be pinned — system defaults, your own (created or forked),
  // and lists owned by others you want to track progress toward. System
  // lists are ordered first, then alphabetically.
  const { data } = await supabase
    .from("lists")
    .select(
      "id, name, sport, item_count, source, created_by, profiles!lists_created_by_fkey(username)"
    )
    .order("source")
    .order("name");

  return (data || []).map((l) => {
    const creator = l.profiles as unknown as { username: string } | null;
    return {
      id: l.id,
      name: l.name,
      sport: l.sport,
      item_count: l.item_count,
      source: l.source,
      created_by: l.created_by,
      creator_username: creator?.username ?? null,
    };
  });
}
