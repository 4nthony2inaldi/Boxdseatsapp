import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Every event_tag the user has attended, across all their logs.
 * Pages past Supabase's 1,000-row response cap so list/badge progress
 * doesn't silently undercount once a user logs more than 1,000 events.
 */
export async function fetchUserEventTags(
  supabase: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const tags = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("event_logs")
      .select("event_id, events!event_logs_event_id_fkey(event_tags)")
      .eq("user_id", userId)
      .not("event_id", "is", null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const t = (row.events as unknown as { event_tags: string[] | null })?.event_tags;
      for (const tag of t || []) tags.add(tag);
    }
    if (data.length < 1000) break;
  }
  return tags;
}
