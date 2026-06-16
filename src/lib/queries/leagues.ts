import { SupabaseClient } from "@supabase/supabase-js";

export type SelectableLeague = {
  slug: string;
  name: string;
  sport: string | null;
};

/**
 * Active leagues for the favorites picker, ordered for display. DB-driven on
 * purpose: a newly added league (e.g. NCAA Football) shows up automatically,
 * with no hardcoded front-end list to keep in sync. Icon/sport come straight
 * from the row's sport.
 */
export async function fetchSelectableLeagues(
  supabase: SupabaseClient
): Promise<SelectableLeague[]> {
  const { data } = await supabase
    .from("leagues")
    .select("slug, name, sport, display_order")
    .eq("is_active", true)
    .order("display_order", { ascending: true })
    .order("name", { ascending: true });

  return (data || []).map((l) => ({
    slug: l.slug as string,
    name: l.name as string,
    sport: (l.sport as string | null) ?? null,
  }));
}
