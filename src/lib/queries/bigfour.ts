import { SupabaseClient } from "@supabase/supabase-js";
import { getLeagueIconPath } from "@/lib/sportIcons";

export type LeagueFavorite = {
  id: string;
  league_id: string;
  league_name: string;
  league_slug: string;
  league_icon: string;
  pick_name: string;
  pick_id: string;
  rank: number;
};

export async function fetchLeagueFavorites(
  supabase: SupabaseClient,
  userId: string,
  category: "team" | "venue" | "athlete" | "event"
): Promise<LeagueFavorite[]> {
  const { data } = await supabase
    .from("user_league_favorites")
    .select(
      `id, league_id, category, rank,
       team_id, athlete_id, venue_id, event_id,
       leagues(name, slug)`
    )
    .eq("user_id", userId)
    .eq("category", category)
    .order("rank", { ascending: true });

  if (!data || data.length === 0) return [];

  // Batch picks per backing table. A category usually maps to one table,
  // but individual-sport leagues store athletes in the "team" slot, so
  // group by which id column is set rather than by category.
  const teamIds = data.map((f) => f.team_id).filter((x): x is string => !!x);
  const athleteIds = data.map((f) => f.athlete_id).filter((x): x is string => !!x);
  const venueIds = data.map((f) => f.venue_id).filter((x): x is string => !!x);
  const eventIds = data.map((f) => f.event_id).filter((x): x is string => !!x);
  const nameById = new Map<string, string>();

  if (teamIds.length > 0) {
    const { data: rows } = await supabase.from("teams").select("id, name, short_name").in("id", teamIds);
    for (const t of rows || []) nameById.set(t.id, t.short_name || t.name || "Unknown");
  }
  if (athleteIds.length > 0) {
    const { data: rows } = await supabase.from("athletes").select("id, name").in("id", athleteIds);
    for (const a of rows || []) nameById.set(a.id, a.name || "Unknown");
  }
  if (venueIds.length > 0) {
    const { data: rows } = await supabase.from("venues").select("id, name").in("id", venueIds);
    for (const v of rows || []) nameById.set(v.id, v.name || "Unknown");
  }
  if (eventIds.length > 0) {
    const { data: rows } = await supabase
      .from("events")
      .select(`id, event_date, tournament_name,
         home_team:teams!events_home_team_id_fkey(short_name, abbreviation),
         away_team:teams!events_away_team_id_fkey(short_name, abbreviation)`)
      .in("id", eventIds);
    for (const event of rows || []) {
      const home = event.home_team as unknown as { short_name: string; abbreviation: string } | null;
      const away = event.away_team as unknown as { short_name: string; abbreviation: string } | null;
      const homeAbbr = home?.abbreviation || home?.short_name;
      const awayAbbr = away?.abbreviation || away?.short_name;
      const d = new Date(event.event_date + "T00:00:00");
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
      nameById.set(event.id, homeAbbr && awayAbbr ? `${awayAbbr} @ ${homeAbbr} ${dateStr}` : event.tournament_name || "Event");
    }
  }

  const results: LeagueFavorite[] = [];
  for (const fav of data) {
    const league = fav.leagues as unknown as { name: string; slug: string } | null;
    if (!league) continue;
    const pickId = fav.team_id || fav.athlete_id || fav.venue_id || fav.event_id || "";
    if (!pickId) continue;
    const pickName = nameById.get(pickId) || "Unknown";
    results.push({
      id: fav.id,
      league_id: fav.league_id,
      league_name: league.name,
      league_slug: league.slug,
      league_icon: getLeagueIconPath(league.slug) || "",
      pick_name: pickName,
      pick_id: pickId,
      rank: fav.rank ?? 0,
    });
  }

  return results;
}

export async function upsertLeagueFavorite(
  supabase: SupabaseClient,
  userId: string,
  category: "team" | "venue" | "athlete" | "event",
  leagueId: string,
  pickId: string,
  // Individual-sport leagues (ATP, NASCAR, ...) store an athlete in the
  // "team" slot; pass pickKind to control which FK column gets the id.
  pickKind?: "team" | "venue" | "athlete" | "event"
): Promise<{ success: boolean } | { error: string }> {
  const kind = pickKind ?? category;
  const pickCols = { team_id: null, athlete_id: null, venue_id: null, event_id: null } as Record<string, string | null>;
  if (kind === "team") pickCols.team_id = pickId;
  else if (kind === "athlete") pickCols.athlete_id = pickId;
  else if (kind === "venue") pickCols.venue_id = pickId;
  else if (kind === "event") pickCols.event_id = pickId;

  // One row per (user, category, league). Replacing a league's pick keeps its
  // existing rank; a brand-new pick is appended to the bottom of the ranking.
  const { data: existing } = await supabase
    .from("user_league_favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("category", category)
    .eq("league_id", leagueId)
    .maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase
      .from("user_league_favorites")
      .update(pickCols)
      .eq("id", existing.id));
  } else {
    const { data: maxRow } = await supabase
      .from("user_league_favorites")
      .select("rank")
      .eq("user_id", userId)
      .eq("category", category)
      .order("rank", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextRank = (maxRow?.rank ?? -1) + 1;
    ({ error } = await supabase
      .from("user_league_favorites")
      .insert({ user_id: userId, category, league_id: leagueId, rank: nextRank, ...pickCols }));
  }

  if (error) return { error: "Failed to save favorite." };
  await syncFeaturedFromRanking(supabase, userId, category);
  return { success: true };
}

const FEATURED_COLUMN: Record<string, string> = {
  team: "fav_team_id",
  venue: "fav_venue_id",
  athlete: "fav_athlete_id",
  event: "fav_event_id",
};

/**
 * Keep profiles.fav_<category>_id pointing at the #1 (lowest-rank) pick, so
 * the Big Four cards stay in sync as a cache. The team slot's FK requires a
 * real team, so an athlete-backed #1 clears the column — fetchBigFour reads
 * the ranking directly and still shows that athlete.
 */
async function syncFeaturedFromRanking(
  supabase: SupabaseClient,
  userId: string,
  category: "team" | "venue" | "athlete" | "event"
): Promise<void> {
  const { data: top } = await supabase
    .from("user_league_favorites")
    .select("team_id, athlete_id, venue_id, event_id")
    .eq("user_id", userId)
    .eq("category", category)
    .order("rank", { ascending: true })
    .limit(1)
    .maybeSingle();

  let pickId: string | null = null;
  if (top) {
    if (category === "team") pickId = top.team_id ?? null;
    else if (category === "venue") pickId = top.venue_id ?? null;
    else if (category === "athlete") pickId = top.athlete_id ?? null;
    else if (category === "event") pickId = top.event_id ?? null;
  }

  await supabase
    .from("profiles")
    .update({ [FEATURED_COLUMN[category]]: pickId })
    .eq("id", userId);
}

/**
 * Persist a new ranking for a category. orderedIds is the list of favorite
 * row ids in desired order; index becomes the rank. #1 becomes featured.
 */
export async function reorderLeagueFavorites(
  supabase: SupabaseClient,
  userId: string,
  category: "team" | "venue" | "athlete" | "event",
  orderedIds: string[]
): Promise<{ success: boolean } | { error: string }> {
  const results = await Promise.all(
    orderedIds.map((id, i) =>
      supabase
        .from("user_league_favorites")
        .update({ rank: i })
        .eq("id", id)
        .eq("user_id", userId)
    )
  );
  if (results.some((r) => r.error)) return { error: "Failed to save order." };
  await syncFeaturedFromRanking(supabase, userId, category);
  return { success: true };
}

export async function deleteLeagueFavorite(
  supabase: SupabaseClient,
  favoriteId: string,
  userId: string
): Promise<{ success: boolean } | { error: string }> {
  const { data: row } = await supabase
    .from("user_league_favorites")
    .select("category")
    .eq("id", favoriteId)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("user_league_favorites")
    .delete()
    .eq("id", favoriteId)
    .eq("user_id", userId);

  if (error) return { error: "Failed to remove favorite." };
  if (row?.category) {
    await syncFeaturedFromRanking(
      supabase,
      userId,
      row.category as "team" | "venue" | "athlete" | "event"
    );
  }
  return { success: true };
}

// ── Favorite-event choices come from the user's logged events ──

export type LoggedEventChoice = {
  id: string; // events.id
  label: string;
  subtitle: string;
};

/**
 * The user's logged events (optionally for one league), newest first,
 * filtered by a free-text query against matchup/tournament/venue.
 * Favorite events are memories — they're picked from what you attended.
 */
export async function fetchLoggedEventChoices(
  supabase: SupabaseClient,
  userId: string,
  leagueSlug: string | null,
  query: string,
  limit = 25
): Promise<LoggedEventChoice[]> {
  let leagueId: string | null = null;
  if (leagueSlug) {
    const { data: league } = await supabase
      .from("leagues")
      .select("id")
      .eq("slug", leagueSlug)
      .maybeSingle();
    if (!league) return [];
    leagueId = league.id;
  }

  let q = supabase
    .from("event_logs")
    .select(
      `event_id, event_date,
       events!event_logs_event_id_fkey(
         id, event_date, tournament_name, day_number,
         home_team:teams!events_home_team_id_fkey(short_name),
         away_team:teams!events_away_team_id_fkey(short_name),
         venues!events_venue_id_fkey(name)
       )`
    )
    .eq("user_id", userId)
    .not("event_id", "is", null)
    .order("event_date", { ascending: false })
    .limit(100);

  if (leagueId) q = q.eq("league_id", leagueId);

  const { data } = await q;
  if (!data) return [];

  const needle = query.trim().toLowerCase();
  const seen = new Set<string>();
  const choices: LoggedEventChoice[] = [];

  for (const log of data) {
    const event = log.events as unknown as {
      id: string;
      event_date: string;
      tournament_name: string | null;
      day_number: number | null;
      home_team: { short_name: string } | null;
      away_team: { short_name: string } | null;
      venues: { name: string } | null;
    } | null;
    if (!event || seen.has(event.id)) continue;
    seen.add(event.id);

    const matchup =
      event.home_team && event.away_team
        ? `${event.away_team.short_name} @ ${event.home_team.short_name}`
        : event.tournament_name || "Event";
    const label = event.day_number
      ? `${matchup} — Day ${event.day_number}`
      : matchup;
    const dateStr = new Date(event.event_date + "T00:00:00").toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric", year: "numeric" }
    );
    const venueName = event.venues?.name || "";
    const subtitle = venueName ? `${dateStr} · ${venueName}` : dateStr;

    if (
      needle &&
      !`${label} ${subtitle}`.toLowerCase().includes(needle)
    ) {
      continue;
    }

    choices.push({ id: event.id, label: `${label} (${dateStr})`, subtitle });
    if (choices.length >= limit) break;
  }

  return choices;
}
