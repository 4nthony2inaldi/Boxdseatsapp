import { SupabaseClient } from "@supabase/supabase-js";

/** A game the user already logged (without a photo) that a scanned photo matches. */
export type BackfillSuggestion = {
  logId: string;
  eventId: string;
  venueId: string;
  date: string;
  venueName: string;
  /** "Away @ Home" for team games, the tournament/title for field events. */
  title: string;
  sport: string | null;
};

type Item = { venueId: string; date: string };

/**
 * The inverse of fetchPhotoSuggestions: given (venue, date) pairs derived on the
 * device from the user's photos, return the games they ALREADY logged without a
 * photo at those pairs — so a scan can bulk-attach photos to an existing
 * timeline rather than create new logs.
 */
export async function fetchPhotoBackfill(
  supabase: SupabaseClient,
  userId: string,
  items: Item[]
): Promise<BackfillSuggestion[]> {
  if (!items.length) return [];

  const seen = new Set<string>();
  const uniqueItems = items.filter((i) => {
    const k = `${i.venueId}|${i.date}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const wanted = new Set(uniqueItems.map((i) => `${i.venueId}|${i.date}`));

  // Candidate events at the exact (venue, date) pairs. Chunked OR-filter for the
  // same reason as photoSuggestions: a cartesian .in().in() blows past the
  // 1000-row cap and silently drops matches.
  const SELECT = `id, event_date, venue_id, tournament_name,
       venues!events_venue_id_fkey(name),
       leagues(name, sport),
       home_team:teams!events_home_team_id_fkey(short_name, name),
       away_team:teams!events_away_team_id_fkey(short_name, name)`;
  type EventRow = {
    id: string; event_date: string; venue_id: string; tournament_name: string | null;
    venues: unknown; leagues: unknown; home_team: unknown; away_team: unknown;
  };
  const rows: EventRow[] = [];
  const CHUNK = 40;
  for (let i = 0; i < uniqueItems.length; i += CHUNK) {
    const orFilter = uniqueItems
      .slice(i, i + CHUNK)
      .map((p) => `and(venue_id.eq.${p.venueId},event_date.eq.${p.date})`)
      .join(",");
    const { data } = await supabase.from("events").select(SELECT).or(orFilter);
    if (data) rows.push(...(data as unknown as EventRow[]));
  }
  const candidates = rows.filter((e) => wanted.has(`${e.venue_id}|${e.event_date}`));
  if (!candidates.length) return [];

  // The user's OWN logs for those events that have no photo yet. Chunk the id
  // list to stay under the 1000-row cap.
  const logByEvent = new Map<string, string>();
  const candidateIds = candidates.map((e) => e.id);
  for (let i = 0; i < candidateIds.length; i += 500) {
    const { data: logs } = await supabase
      .from("event_logs")
      .select("id, event_id")
      .eq("user_id", userId)
      .is("photo_url", null)
      .in("event_id", candidateIds.slice(i, i + 500));
    for (const l of logs || []) {
      if (l.event_id) logByEvent.set(l.event_id as string, l.id as string);
    }
  }
  if (!logByEvent.size) return [];

  type TeamRel = { short_name: string | null; name: string | null } | null;
  const out: BackfillSuggestion[] = [];
  const pairSeen = new Set<string>(); // one photo per (venue, date)
  for (const e of candidates) {
    const logId = logByEvent.get(e.id);
    if (!logId) continue;
    const key = `${e.venue_id}|${e.event_date}`;
    if (pairSeen.has(key)) continue;
    pairSeen.add(key);

    const venue = e.venues as unknown as { name: string } | null;
    const league = e.leagues as unknown as { name: string | null; sport: string | null } | null;
    const home = e.home_team as unknown as TeamRel;
    const away = e.away_team as unknown as TeamRel;
    const homeName = home?.name || home?.short_name;
    const awayName = away?.name || away?.short_name;
    const title =
      homeName && awayName
        ? `${awayName} @ ${homeName}`
        : e.tournament_name || venue?.name || league?.name || "Event";

    out.push({
      logId,
      eventId: e.id,
      venueId: e.venue_id,
      date: e.event_date,
      venueName: venue?.name ?? "",
      title,
      sport: league?.sport ?? null,
    });
  }
  out.sort((a, b) => b.date.localeCompare(a.date));
  return out;
}

/** How many of the user's logged games have no photo (and could be backfilled). */
export async function countPhotolessLogs(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("event_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("photo_url", null)
    .not("event_id", "is", null);
  return count ?? 0;
}
