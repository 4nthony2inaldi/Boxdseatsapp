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

const RADIUS_M = 120_000; // ~75 miles
const DAYS_BACK = 3;
const DAYS_AHEAD = 7;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Events near a metro, recent + upcoming. Multi-day tournaments collapse to
 * one card (the day closest to today). Sorted so today leads, then the most
 * recent past, then upcoming.
 */
export async function fetchNearbyEvents(
  supabase: SupabaseClient,
  metroKey: string
): Promise<NearbyEvent[]> {
  const metro = metroFromKey(metroKey);
  if (!metro) return [];

  const now = new Date();
  const from = new Date(now.getTime() - DAYS_BACK * 86400_000);
  const to = new Date(now.getTime() + DAYS_AHEAD * 86400_000);

  const { data, error } = await supabase.rpc("events_near", {
    in_lat: metro.lat,
    in_lng: metro.lng,
    in_radius_m: RADIUS_M,
    in_from: ymd(from),
    in_to: ymd(to),
  });
  if (error || !data) return [];

  const today = ymd(now);
  const rows = data as NearbyEvent[];

  // Collapse tournament day-rows to the day nearest today
  const byTournament = new Map<string, NearbyEvent>();
  const singles: NearbyEvent[] = [];
  const dist = (e: NearbyEvent) =>
    Math.abs(new Date(e.event_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime());
  for (const e of rows) {
    if (!e.tournament_id) {
      singles.push(e);
      continue;
    }
    const cur = byTournament.get(e.tournament_id);
    if (!cur || dist(e) < dist(cur)) byTournament.set(e.tournament_id, e);
  }

  const all = [...singles, ...byTournament.values()];
  // Today first, then nearest past, then nearest future; distance breaks ties
  all.sort((a, b) => {
    const da = dist(a);
    const db = dist(b);
    if (da !== db) return da - db;
    if (a.event_date !== b.event_date) return a.event_date < b.event_date ? 1 : -1;
    return a.distance_m - b.distance_m;
  });
  return all.slice(0, 20);
}
