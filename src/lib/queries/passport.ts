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

export type PassportPlayer = {
  id: string;
  name: string;
  sport: string | null;
  headshot_url: string | null;
  count: number;
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
  /** Athletes the user has seen in person, most-seen first (top slice). */
  players: PassportPlayer[];
  /** Total distinct athletes seen across all attended games. */
  playersTotal: number;
  /** Section keys the owner has hidden (map | rings | topVenues | sports | players). */
  hidden: string[];
  /** Top 4 most-complete list sets, for the share card. */
  topComplete: PassportRing[];
  /** Favorite teams (by stack rank). The page shows all; the share card uses the first 4. */
  teams: { id: string; name: string; logo_url: string | null }[];
};

export type PassportListOption = {
  id: string;
  name: string;
  sport: string | null;
  icon: string;
  visited: number;
  total: number;
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

  // All of the user's logs (sport + outcome + event) for totals, fan record,
  // sport mix, and the athletes-seen aggregation.
  const logs: { sport: string | null; outcome: string | null; event_id: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("event_logs")
      .select("sport, outcome, event_id")
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

  const allRings = candidateIds
    .map(buildRing)
    .filter((r): r is PassportRing => !!r);

  let rings: PassportRing[];
  const configured = config?.lists;
  if (configured && configured.length > 0) {
    rings = configured.map(buildRing).filter((r): r is PassportRing => !!r);
  } else {
    rings = [...allRings].sort((a, b) => b.visited - a.visited || b.total - a.total).slice(0, 6);
  }

  // Most-complete sets (highest visited/total) — used by the share card.
  const topComplete = allRings
    .filter((r) => r.total > 0 && r.visited > 0)
    .sort((a, b) => b.visited / b.total - a.visited / a.total || b.visited - a.visited)
    .slice(0, 4);

  // Favorite teams from the stack rank (team-backed picks only). The passport
  // page shows all of them (horizontally scrollable); the share card slices to
  // the first 4 (which is what fits the card layout).
  const { data: teamFavs } = await supabase
    .from("user_league_favorites")
    .select("rank, team_id, teams(name, short_name, logo_url)")
    .eq("user_id", userId)
    .eq("category", "team")
    .not("team_id", "is", null)
    .order("rank", { ascending: true })
    .limit(20);
  const teams = (teamFavs || []).map((t) => {
    const tm = t.teams as unknown as { name: string; short_name: string | null; logo_url: string | null } | null;
    return { id: t.team_id as string, name: tm?.short_name || tm?.name || "", logo_url: tm?.logo_url || null };
  });

  // Players you've seen: every athlete who appeared in a game this user logged.
  // event_athletes is public reference data, so the privacy boundary is the set
  // of event_ids the viewer can see (event_logs is RLS-filtered above). Count
  // distinct attended games per athlete; (event, athlete) rows are unique.
  const attendedEventIds = [...new Set(logs.map((l) => l.event_id).filter((e): e is string => !!e))];
  const playerCounts = new Map<string, number>();
  for (let i = 0; i < attendedEventIds.length; i += 200) {
    const chunk = attendedEventIds.slice(i, i + 200);
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from("event_athletes")
        .select("athlete_id")
        .in("event_id", chunk)
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      for (const row of data) {
        const aid = row.athlete_id as string | null;
        if (aid) playerCounts.set(aid, (playerCounts.get(aid) || 0) + 1);
      }
      if (data.length < 1000) break;
    }
  }
  const playersTotal = playerCounts.size;
  const topPlayerIds = [...playerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([id]) => id);
  const playerMeta = new Map<string, { name: string; sport: string | null; headshot_url: string | null }>();
  for (let i = 0; i < topPlayerIds.length; i += 100) {
    const { data } = await supabase
      .from("athletes")
      .select("id, name, sport, headshot_url")
      .in("id", topPlayerIds.slice(i, i + 100));
    for (const a of data || []) {
      playerMeta.set(a.id as string, {
        name: (a.name as string) || "Unknown",
        sport: (a.sport as string | null) ?? null,
        headshot_url: (a.headshot_url as string | null) ?? null,
      });
    }
  }
  const players: PassportPlayer[] = topPlayerIds
    .map((id) => {
      const m = playerMeta.get(id);
      if (!m) return null;
      return { id, name: m.name, sport: m.sport, headshot_url: m.headshot_url, count: playerCounts.get(id) || 0 };
    })
    .filter((p): p is PassportPlayer => !!p);

  return {
    stats: { games: logs.length, venues: venues.length, cities, wins, losses, draws, winPct },
    venues,
    topVenues,
    rings,
    sports,
    players,
    playersTotal,
    hidden: Array.isArray(config?.hidden) ? config!.hidden : [],
    topComplete,
    teams,
  };
}

/**
 * All venue lists the user could feature as rings (system + their own), each
 * with the user's visited/total — for the passport editor.
 */
export async function fetchPassportListOptions(
  supabase: SupabaseClient,
  userId: string
): Promise<PassportListOption[]> {
  const { data: venueRows } = await supabase.rpc("passport_venues", { p_user: userId });
  const visited = new Set((venueRows || []).map((v: PassportVenue) => v.venue_id));

  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, sport, item_count, source, created_by")
    .eq("list_type", "venue")
    .or(`source.eq.system,created_by.eq.${userId}`);
  const ids = (lists || []).map((l) => l.id as string);

  const byList = new Map<string, number>();
  if (ids.length > 0) {
    const { data: items } = await supabase
      .from("list_items")
      .select("list_id, venue_id")
      .in("list_id", ids)
      .not("venue_id", "is", null);
    for (const it of items || []) {
      if (visited.has(it.venue_id as string)) {
        byList.set(it.list_id as string, (byList.get(it.list_id as string) || 0) + 1);
      }
    }
  }

  return (lists || [])
    .map((l) => ({
      id: l.id as string,
      name: l.name as string,
      sport: l.sport as string | null,
      icon: getSportIconPath(l.sport) || "",
      visited: byList.get(l.id as string) || 0,
      total: (l.item_count as number) || 0,
    }))
    .sort((a, b) => b.visited - a.visited || b.total - a.total);
}
