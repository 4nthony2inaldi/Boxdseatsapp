import { SupabaseClient } from "@supabase/supabase-js";

export type SuggestionTeam = { id: string; name: string; logo: string | null };

export type PhotoSuggestion = {
  eventId: string;
  date: string;
  venueId: string;
  venueName: string;
  leagueSlug: string | null;
  sport: string | null;
  home: SuggestionTeam & { score: number | null };
  away: SuggestionTeam & { score: number | null };
  /**
   * Pre-filled rooting team (one of home/away) when it's one of the user's
   * favorites; null means the UI should ask. With the final scores we already
   * have, the caller can derive win/loss from this without more input.
   */
  suggestedRootingTeamId: string | null;
};

export type PhotoSuggestionsResult = {
  suggestions: PhotoSuggestion[];
  /**
   * Distinct teams across suggestions whose rooting we couldn't infer — fuel
   * for the bulk "who do you root for?" step that fills the rest in one pass.
   */
  unknownTeams: SuggestionTeam[];
};

type Item = { venueId: string; date: string };

type TeamRel = { id: string; short_name: string | null; name: string | null; logo_url: string | null } | null;

/**
 * Given (venue, date) pairs derived from a user's photos — the device resolves
 * the venue locally from the bundled coordinate set, so raw photo coordinates
 * never leave the phone — return the games they were likely at: candidate
 * events with teams/scores, minus anything already logged, with rooting
 * pre-filled from the user's favorite teams.
 */
export async function fetchPhotoSuggestions(
  supabase: SupabaseClient,
  userId: string,
  items: Item[]
): Promise<PhotoSuggestionsResult> {
  if (!items.length) return { suggestions: [], unknownTeams: [] };

  // One suggestion per game, never per photo. The device groups a day's photos
  // at a venue (20 shots at one game) into a single (venue, date) item before
  // calling, but we collapse duplicates here too so a sloppy caller can't
  // produce redundant matches.
  const seen = new Set<string>();
  const uniqueItems = items.filter((i) => {
    const k = `${i.venueId}|${i.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const wanted = new Set(uniqueItems.map((i) => `${i.venueId}|${i.date}`));

  // Fetch events for the EXACT (venue, date) pairs. A cartesian
  // `.in(venueIds).in(dates)` over-fetches every event at any matched venue on
  // any matched date, which blows past PostgREST's 1000-row default cap once a
  // user has many matches — silently dropping real games (the more games you've
  // attended, the worse it got). Query the precise pairs in chunks instead.
  const SELECT = `id, event_date, venue_id, home_score, away_score,
       venues!events_venue_id_fkey(name),
       leagues(slug, sport),
       home_team:teams!events_home_team_id_fkey(id, short_name, name, logo_url),
       away_team:teams!events_away_team_id_fkey(id, short_name, name, logo_url)`;
  type EventRow = {
    id: string; event_date: string; venue_id: string;
    home_score: number | null; away_score: number | null;
    venues: unknown; leagues: unknown; home_team: unknown; away_team: unknown;
  };
  const rows: EventRow[] = [];
  const CHUNK = 40; // keeps the OR-filter URL well under length limits
  for (let i = 0; i < uniqueItems.length; i += CHUNK) {
    const orFilter = uniqueItems
      .slice(i, i + CHUNK)
      .map((p) => `and(venue_id.eq.${p.venueId},event_date.eq.${p.date})`)
      .join(",");
    const { data } = await supabase.from("events").select(SELECT).or(orFilter);
    if (data) rows.push(...(data as unknown as EventRow[]));
  }

  // Defensive: keep only the real pairs (a chunk only requests wanted pairs,
  // but a venue can legitimately have multiple events on one date).
  const candidates = rows.filter((e) => wanted.has(`${e.venue_id}|${e.event_date}`));
  if (!candidates.length) return { suggestions: [], unknownTeams: [] };

  // Drop games the user already logged. Chunk the id list so a heavy attendee
  // with 1000+ candidates doesn't hit PostgREST's 1000-row cap and re-suggest
  // games they've already logged.
  const loggedSet = new Set<string>();
  const candidateIds = candidates.map((e) => e.id);
  for (let i = 0; i < candidateIds.length; i += 500) {
    const { data: logged } = await supabase
      .from("event_logs")
      .select("event_id")
      .eq("user_id", userId)
      .in("event_id", candidateIds.slice(i, i + 500));
    for (const l of logged || []) loggedSet.add(l.event_id as string);
  }

  // Favorite teams → rooting pre-fill (lowest rank wins if both teams qualify).
  const { data: favs } = await supabase
    .from("user_league_favorites")
    .select("team_id, rank")
    .eq("user_id", userId)
    .eq("category", "team")
    .not("team_id", "is", null)
    .order("rank", { ascending: true });
  const favRank = new Map<string, number>();
  for (const f of favs || []) {
    const id = f.team_id as string | null;
    if (id && !favRank.has(id)) favRank.set(id, f.rank as number);
  }

  const teamObj = (t: TeamRel): SuggestionTeam => ({
    id: t?.id ?? "",
    // Prefer the full name ("Philadelphia Eagles") over the nickname ("Eagles"),
    // which is ambiguous on its own — the city/location disambiguates it.
    name: t?.name || t?.short_name || "",
    logo: t?.logo_url ?? null,
  });

  const suggestions: PhotoSuggestion[] = [];
  const unknown = new Map<string, SuggestionTeam>();

  for (const e of candidates) {
    if (loggedSet.has(e.id)) continue;
    const home = e.home_team as unknown as TeamRel;
    const away = e.away_team as unknown as TeamRel;
    if (!home?.id || !away?.id) continue;
    const league = e.leagues as unknown as { slug: string | null; sport: string | null } | null;
    const venue = e.venues as unknown as { name: string } | null;

    const hr = favRank.has(home.id) ? favRank.get(home.id)! : Infinity;
    const ar = favRank.has(away.id) ? favRank.get(away.id)! : Infinity;
    const rooting = hr === Infinity && ar === Infinity ? null : hr <= ar ? home.id : away.id;

    if (rooting === null) {
      unknown.set(home.id, teamObj(home));
      unknown.set(away.id, teamObj(away));
    }

    suggestions.push({
      eventId: e.id,
      date: e.event_date,
      venueId: e.venue_id,
      venueName: venue?.name ?? "",
      leagueSlug: league?.slug ?? null,
      sport: league?.sport ?? null,
      home: { ...teamObj(home), score: e.home_score ?? null },
      away: { ...teamObj(away), score: e.away_score ?? null },
      suggestedRootingTeamId: rooting,
    });
  }

  suggestions.sort((a, b) => b.date.localeCompare(a.date));
  return { suggestions, unknownTeams: [...unknown.values()] };
}
