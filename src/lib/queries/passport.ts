import { SupabaseClient } from "@supabase/supabase-js";
import { getSportIconPath } from "@/lib/sportIcons";
import type { ProfileData } from "./profile";

export type PassportVenue = {
  venue_id: string;
  name: string;
  city: string;
  state: string | null;
  sport: string | null;
  photo_url: string | null;
  lat: number;
  lng: number;
  games: number;
};

export type PassportRing = {
  list_id: string;
  name: string;
  icon: string;
  visited: number;
  total: number;
};

export type PassportData = {
  stats: {
    games: number;
    venues: number;
    cities: number;
    wins: number;
    losses: number;
    draws: number;
    winPct: number | null;
  };
  venues: PassportVenue[];
  topVenues: PassportVenue[];
  rings: PassportRing[];
  sports: { sport: string; games: number; venues: number }[];
};

type PassportConfig = { lists?: string[]; hidden?: string[] } | null;

export async function fetchPassport(
  supabase: SupabaseClient,
  profile: ProfileData & { passport_config?: unknown }
): Promise<PassportData> {
  const userId = profile.id;
  const config = (profile.passport_config as PassportConfig) ?? null;

  // Visited venues with coords + per-venue game counts (RLS-respecting RPC).
  const { data: venueRows } = await supabase.rpc("passport_venues", { p_user: userId });
  const venues: PassportVenue[] = (venueRows || []).map((v: PassportVenue) => ({
    ...v,
    games: Number(v.games) || 0,
  }));
  const visitedIds = new Set(venues.map((v) => v.venue_id));

  // All of the user's logs (sport + outcome) for totals, fan record, sport mix.
  const logs: { sport: string | null; outcome: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("event_logs")
      .select("sport, outcome")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    logs.push(...data);
    if (data.length < 1000) break;
  }

  let wins = 0, losses = 0, draws = 0;
  const sportGames = new Map<string, number>();
  for (const l of logs) {
    if (l.outcome === "win") wins++;
    else if (l.outcome === "loss") losses++;
    else if (l.outcome === "draw") draws++;
    if (l.sport) sportGames.set(l.sport, (sportGames.get(l.sport) || 0) + 1);
  }
  const decided = wins + losses;
  const winPct = decided > 0 ? Math.round((wins / decided) * 100) : null;

  const cities = new Set(venues.map((v) => `${v.city}|${v.state ?? ""}`)).size;

  // Sport breakdown: games (from logs) + venues (from visited venues).
  const sportVenues = new Map<string, number>();
  for (const v of venues) if (v.sport) sportVenues.set(v.sport, (sportVenues.get(v.sport) || 0) + 1);
  const sportKeys = new Set([...sportGames.keys(), ...sportVenues.keys()]);
  const sports = [...sportKeys]
    .map((sport) => ({ sport, games: sportGames.get(sport) || 0, venues: sportVenues.get(sport) || 0 }))
    .sort((a, b) => b.games - a.games || b.venues - a.venues);

  const topVenues = [...venues].sort((a, b) => b.games - a.games).slice(0, 8);

  // Rings = venue-list progress. Featured = config.lists, else the user's
  // most-progressed sets (so the page feels earned from day one).
  const { data: candidateLists } = await supabase
    .from("lists")
    .select("id, name, sport, item_count, source, created_by")
    .eq("list_type", "venue")
    .or(`source.eq.system,created_by.eq.${userId}`);

  const listMeta = new Map((candidateLists || []).map((l) => [l.id as string, l]));
  const candidateIds = [...listMeta.keys()];

  const visitedByList = new Map<string, number>();
  if (candidateIds.length > 0) {
    const { data: items } = await supabase
      .from("list_items")
      .select("list_id, venue_id")
      .in("list_id", candidateIds)
      .not("venue_id", "is", null);
    for (const it of items || []) {
      if (visitedIds.has(it.venue_id as string)) {
        visitedByList.set(it.list_id as string, (visitedByList.get(it.list_id as string) || 0) + 1);
      }
    }
  }

  const buildRing = (id: string): PassportRing | null => {
    const l = listMeta.get(id);
    if (!l) return null;
    return {
      list_id: id,
      name: l.name,
      icon: getSportIconPath(l.sport) || "",
      visited: visitedByList.get(id) || 0,
      total: l.item_count || 0,
    };
  };

  let rings: PassportRing[];
  const configured = config?.lists;
  if (configured && configured.length > 0) {
    rings = configured.map(buildRing).filter((r): r is PassportRing => !!r);
  } else {
    rings = candidateIds
      .map(buildRing)
      .filter((r): r is PassportRing => !!r)
      .sort((a, b) => b.visited - a.visited || b.total - a.total)
      .slice(0, 6);
  }

  return {
    stats: { games: logs.length, venues: venues.length, cities, wins, losses, draws, winPct },
    venues,
    topVenues,
    rings,
    sports,
  };
}
