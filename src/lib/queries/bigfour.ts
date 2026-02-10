import { SupabaseClient } from "@supabase/supabase-js";

export type LeagueFavorite = {
  id: string;
  league_id: string;
  league_name: string;
  league_slug: string;
  league_icon: string;
  pick_name: string;
  pick_id: string;
};

const LEAGUE_ICONS: Record<string, string> = {
  nfl: "🏈",
  nba: "🏀",
  mlb: "⚾",
  nhl: "🏒",
  mls: "⚽",
  "pga-tour": "⛳",
};

export async function fetchLeagueFavorites(
  supabase: SupabaseClient,
  userId: string,
  category: "team" | "venue" | "athlete" | "event"
): Promise<LeagueFavorite[]> {
  const { data } = await supabase
    .from("user_league_favorites")
    .select(
      `id, league_id, category,
       team_id, athlete_id, venue_id, event_id,
       leagues(name, slug)`
    )
    .eq("user_id", userId)
    .eq("category", category);

  if (!data || data.length === 0) return [];

  const results: LeagueFavorite[] = [];

  for (const fav of data) {
    const league = fav.leagues as unknown as { name: string; slug: string } | null;
    if (!league) continue;

    let pickName = "";
    let pickId = "";

    if (category === "team" && fav.team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("name, short_name")
        .eq("id", fav.team_id)
        .single();
      pickName = team?.short_name || team?.name || "Unknown";
      pickId = fav.team_id;
    } else if (category === "athlete" && fav.athlete_id) {
      const { data: athlete } = await supabase
        .from("athletes")
        .select("name")
        .eq("id", fav.athlete_id)
        .single();
      pickName = athlete?.name || "Unknown";
      pickId = fav.athlete_id;
    } else if (category === "venue" && fav.venue_id) {
      const { data: venue } = await supabase
        .from("venues")
        .select("name")
        .eq("id", fav.venue_id)
        .single();
      pickName = venue?.name || "Unknown";
      pickId = fav.venue_id;
    } else if (category === "event" && fav.event_id) {
      const { data: event } = await supabase
        .from("events")
        .select(
          `tournament_name,
           home_team:teams!events_home_team_id_fkey(short_name),
           away_team:teams!events_away_team_id_fkey(short_name)`
        )
        .eq("id", fav.event_id)
        .single();
      if (event) {
        const home = (event.home_team as unknown as { short_name: string } | null)?.short_name;
        const away = (event.away_team as unknown as { short_name: string } | null)?.short_name;
        pickName = home && away ? `${away} @ ${home}` : event.tournament_name || "Event";
      }
      pickId = fav.event_id;
    }

    results.push({
      id: fav.id,
      league_id: fav.league_id,
      league_name: league.name,
      league_slug: league.slug,
      league_icon: LEAGUE_ICONS[league.slug] || "🏟️",
      pick_name: pickName,
      pick_id: pickId,
    });
  }

  return results;
}

export async function upsertLeagueFavorite(
  supabase: SupabaseClient,
  userId: string,
  category: "team" | "venue" | "athlete" | "event",
  leagueId: string,
  pickId: string
): Promise<{ success: boolean } | { error: string }> {
  const row: Record<string, unknown> = {
    user_id: userId,
    category,
    league_id: leagueId,
    team_id: null,
    athlete_id: null,
    venue_id: null,
    event_id: null,
  };

  if (category === "team") row.team_id = pickId;
  else if (category === "athlete") row.athlete_id = pickId;
  else if (category === "venue") row.venue_id = pickId;
  else if (category === "event") row.event_id = pickId;

  const { error } = await supabase
    .from("user_league_favorites")
    .upsert(row, { onConflict: "user_id,category,league_id" });

  if (error) return { error: "Failed to save favorite." };
  return { success: true };
}

export async function deleteLeagueFavorite(
  supabase: SupabaseClient,
  favoriteId: string,
  userId: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("user_league_favorites")
    .delete()
    .eq("id", favoriteId)
    .eq("user_id", userId);

  if (error) return { error: "Failed to remove favorite." };
  return { success: true };
}
