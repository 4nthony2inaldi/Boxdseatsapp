import { SupabaseClient } from "@supabase/supabase-js";

/**
 * A companion tag the current user has been given, keyed so the
 * notifications UI can match it to its notification (owner + event).
 */
export type MyCompanionTag = {
  tag_id: string;
  owner_id: string;
  event_id: string | null;
  status: "pending" | "accepted" | "declined";
};

export async function fetchMyCompanionTags(
  supabase: SupabaseClient
): Promise<MyCompanionTag[]> {
  const { data } = await supabase.rpc("my_companion_tags");
  return (data as MyCompanionTag[]) || [];
}

/** Accept or decline a pending companion tag. */
export async function respondToCompanionTag(
  supabase: SupabaseClient,
  tagId: string,
  action: "accept" | "decline"
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase.rpc("respond_to_companion_tag", {
    p_tag_id: tagId,
    p_action: action,
  });
  if (error) return { error: "Couldn't update the tag. Please try again." };
  return { success: true };
}

/**
 * Accept a tag AND add it to your profile as your own linked log.
 * Returns the new (or already-linked) log id so the caller can route to
 * the editor to finish rooting interest / rating / photo.
 */
export async function acceptCompanionAndColog(
  supabase: SupabaseClient,
  tagId: string
): Promise<{ logId: string } | { error: string }> {
  const { data, error } = await supabase.rpc("accept_companion_and_colog", {
    p_tag_id: tagId,
  });
  if (error || !data) return { error: "Couldn't add it to your profile. Please try again." };
  return { logId: data as string };
}
