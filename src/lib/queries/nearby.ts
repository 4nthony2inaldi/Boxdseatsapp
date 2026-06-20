import { SupabaseClient } from "@supabase/supabase-js";
import { metroFromKey } from "@/lib/metros";

export type NearbyEvent = {
  event_id: string;
  event_date: string;
  tournament_name: string | null;
  home_team: string | null;
  away_team: string | null;
  home_logo: string | null;
  away_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  league_slug: string | null;
  sport: string | null;
  venue_id: string;
  venue_name: string;
  venue_photo: string | null;
  cover_photo_url: string | null;
  tournament_id: string | null;
  distance_m: number;
};

export type NearbyPage = {
  events: NearbyEvent[];
  /** Cursor for the next page (oldest event date loaded), null when exhausted */
  before: string | null;
};

const RADIUS_M = 161_000; // ~100 miles — regional reach so a marquee venue just
// outside the metro (e.g. the U.S. Open at Shinnecock, ~85mi from NYC) still
// surfaces; people travel for big events.
const DAYS_AHEAD = 7;
const PAGE_SIZE = 30;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Collapse multi-day tournament rows to the day nearest today. */
function collapseTournaments(rows: NearbyEvent[], seenTournaments: Set<string>): NearbyEvent[] {
  const today = ymd(new Date());
  const dist = (e: NearbyEvent) =>
    Math.abs(new Date(e.event_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime());
  const byTournament = new Map<string, NearbyEvent>();
  const out: NearbyEvent[] = [];
  for (const e of rows) {
    if (!e.tournament_id) {
      out.push(e);
      continue;
    }
    if (seenTournaments.has(e.tournament_id)) continue;
    const cur = byTournament.get(e.tournament_id);
    if (!cur || dist(e) < dist(cur)) byTournament.set(e.tournament_id, e);
  }
  for (const [tid, e] of byTournament) {
    seenTournaments.add(tid);
    out.push(e);
  }
  return out;
}

/**
 * First page: nearest events regardless of age (the carousel never renders
 * empty), sorted so today leads, then upcoming, then backward in time.
 */
export async function fetchNearbyEvents(
  supabase: SupabaseClient,
  metroKey: string,
  before?: string | null
): Promise<NearbyPage> {
  const metro = metroFromKey(metroKey);
  if (!metro) return { events: [], before: null };

  const until = ymd(new Date(Date.now() + DAYS_AHEAD * 86400_000));
  const { data, error } = await supabase.rpc("events_near", {
    in_lat: metro.lat,
    in_lng: metro.lng,
    in_radius_m: RADIUS_M,
    in_until: until,
    in_before: before ?? null,
    in_limit: PAGE_SIZE,
  });
  if (error || !data) return { events: [], before: null };

  const rows = data as NearbyEvent[];
  const nextBefore = rows.length === PAGE_SIZE ? rows[rows.length - 1].event_date : null;

  const seen = new Set<string>();
  const events = collapseTournaments(rows, seen);

  if (!before) {
    // initial page: today first, then nearest upcoming/recent, then older
    const today = ymd(new Date());
    const dist = (e: NearbyEvent) =>
      Math.abs(new Date(e.event_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime());
    events.sort((a, b) => {
      const da = dist(a);
      const db = dist(b);
      if (da !== db) return da - db;
      if (a.event_date !== b.event_date) return a.event_date < b.event_date ? 1 : -1;
      return a.distance_m - b.distance_m;
    });
  }
  return { events, before: nextBefore };
}
