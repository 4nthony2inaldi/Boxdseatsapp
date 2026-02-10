import { SupabaseClient } from "@supabase/supabase-js";

export type SettingsProfile = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  fav_sport: string | null;
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
      "id, username, display_name, bio, avatar_url, fav_sport, is_private, default_privacy, comments_enabled, pinned_list_1_id, pinned_list_2_id"
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

export async function fetchAvailableLists(
  supabase: SupabaseClient
): Promise<{ id: string; name: string; sport: string | null; item_count: number }[]> {
  const { data } = await supabase
    .from("lists")
    .select("id, name, sport, item_count")
    .eq("source", "system")
    .order("name");

  return data || [];
}
