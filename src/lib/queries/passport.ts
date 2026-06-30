import { SupabaseClient } from "@supabase/supabase-js";
import { getSportIconPath } from "@/lib/sportIcons";
import { LEADERBOARD_STATS, addLeaderboardContribution, parseStatLine } from "@/lib/statLine";
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

export type LeaderboardEntry = {
  id: string;
  name: string;
  headshot_url: string | null;
  value: string;
};

export type LeaderboardRow = {
  key: string;
  label: string;
  short: string;
  players: LeaderboardEntry[];
};

export type SportLeaderboard = {
  sport: string;
  stats: LeaderboardRow[];
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
  /** "Most X you've seen" rows per sport, ranked over attended games. */
  leaderboards: SportLeaderboard[];
  /** Section keys the owner has hidden (map | rings | topVenues | sports | players | leaderboards). */
  hidden: string[];
  /** Top 4 most-complete list sets, for the share card. */
  topComplete: PassportRing[];
  /** "Rooting For": team favorites + field-sport player favorites in one row.
   *  Default order is teams then field-sport players; a saved custom order
   *  (passport_config.rootingOrder) overrides it. The share card uses the first 4. */
  rooting: RootingEntry[];
};

export type PassportListOption = {
  id: string;
  name: string;
  sport: string | null;
  icon: string;
  visited: number;
  total: number;
};

type PassportConfig = { lists?: string[]; hidden?: string[]; rootingOrder?: string[] } | null;

/** No-team sports: the rooting interest is a person (driver/golfer/etc.), not a
 *  team. Their favorite athletes surface in the Rooting For row alongside teams. */
const FIELD_SPORTS = new Set(["tennis", "golf", "motorsports", "mma", "horse_racing"]);

/** One entry in the "Rooting For" row: a team (team sports) or an athlete
 *  (field sports). `key` is the stable id used by the saved custom order. */
export type RootingEntry = {
  kind: "team" | "athlete";
  /** team_id or athlete_id. */
  id: string;
  key: string; // `${kind}:${id}`
  name: string;
  imageUrl: string | null; // team logo or athlete headshot
  sport: string | null;
};

/**
 * "Rooting For" entries: team favorites + field-sport player favorites, in one
 * ordered list. Default order is teams (by rank) then field-sport players (by
 * rank); a saved `rootingOrder` (array of `${kind}:${id}` keys) overrides it,
 * with any newly-added picks not yet in that order falling to the end.
 */
export async function fetchRooting(
  supabase: SupabaseClient,
  userId: string,
  rootingOrder: string[] = []
): Promise<RootingEntry[]> {
  const [{ data: teamFavs }, { data: athFavs }] = await Promise.all([
    supabase
      .from("user_league_favorites")
      .select("rank, team_id, teams(name, short_name, logo_url, leagues(sport))")
      .eq("user_id", userId)
      .eq("category", "team")
      .not("team_id", "is", null)
      .order("rank", { ascending: true })
      .limit(30),
    supabase
      .from("user_league_favorites")
      .select("rank, athlete_id, athletes(name, headshot_url, sport)")
      .eq("user_id", userId)
      .eq("category", "athlete")
      .not("athlete_id", "is", null)
      .order("rank", { ascending: true })
      .limit(30),
  ]);

  const teamEntries: RootingEntry[] = (teamFavs || []).map((t) => {
    const tm = t.teams as unknown as {
      name: string; short_name: string | null; logo_url: string | null; leagues: { sport: string | null } | null;
    } | null;
    const id = t.team_id as string;
    return { kind: "team", id, key: `team:${id}`, name: tm?.short_name || tm?.name || "", imageUrl: tm?.logo_url || null, sport: tm?.leagues?.sport ?? null };
  });
  const fieldAthleteEntries: RootingEntry[] = (athFavs || [])
    .map((a) => {
      const am = a.athletes as unknown as { name: string; headshot_url: string | null; sport: string | null } | null;
      const id = a.athlete_id as string;
      return { kind: "athlete" as const, id, key: `athlete:${id}`, name: am?.name || "", imageUrl: am?.headshot_url || null, sport: am?.sport ?? null };
    })
    .filter((e) => e.sport && FIELD_SPORTS.has(e.sport));

  // Default: teams, then field-sport players. A saved custom order reshuffles
  // the ones it names; anything new (not yet placed) keeps the default tail.
  const defaultOrder = [...teamEntries, ...fieldAthleteEntries];
  const byKey = new Map(defaultOrder.map((e) => [e.key, e]));
  const ordered: RootingEntry[] = [];
  const placed = new Set<string>();
  for (const key of rootingOrder) {
    const e = byKey.get(key);
    if (e && !placed.has(key)) { ordered.push(e); placed.add(key); }
  }
  for (const e of defaultOrder) if (!placed.has(e.key)) ordered.push(e);
  return ordered;
}

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

  // Featured sets for the share card, ranked by raw progress (most venues
  // actually collected) then completion %. Ranking by percentage alone let a
  // barely-started small set headline just because its denominator is tiny
  // (e.g. 3/13 spring-training parks, 23%, beating 7/30 MLB stadiums, 23%) —
  // the opposite of what reads as an accomplishment. Most-collected first, with
  // the fuller ring breaking ties, surfaces the more representative set.
  const topComplete = allRings
    .filter((r) => r.total > 0 && r.visited > 0)
    .sort((a, b) => b.visited - a.visited || b.visited / b.total - a.visited / a.total)
    .slice(0, 4);

  const rooting = await fetchRooting(supabase, userId, Array.isArray(config?.rootingOrder) ? config!.rootingOrder! : []);

  // Players you've seen: every athlete who appeared in a game this user logged.
  // event_athletes is public reference data, so the privacy boundary is the set
  // of event_ids the viewer can see (event_logs is RLS-filtered above). Count
  // distinct attended games per athlete; (event, athlete) rows are unique.
  const attendedEventIds = [...new Set(logs.map((l) => l.event_id).filter((e): e is string => !!e))];
  const playerCounts = new Map<string, number>();
  // Per-athlete leaderboard totals (stat key -> total) summed over attended games.
  const statTotals = new Map<string, Map<string, number>>();
  for (let i = 0; i < attendedEventIds.length; i += 200) {
    const chunk = attendedEventIds.slice(i, i + 200);
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from("event_athletes")
        .select("athlete_id, stat_line")
        .in("event_id", chunk)
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      for (const row of data) {
        const aid = row.athlete_id as string | null;
        if (!aid) continue;
        playerCounts.set(aid, (playerCounts.get(aid) || 0) + 1);
        const sl = parseStatLine(row.stat_line as string | null);
        if (sl) {
          let totals = statTotals.get(aid);
          if (!totals) statTotals.set(aid, (totals = new Map()));
          addLeaderboardContribution(totals, sl);
        }
      }
      if (data.length < 1000) break;
    }
  }
  const playersTotal = playerCounts.size;
  const topPlayerIds = [...playerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([id]) => id);

  // Rank athletes by each leaderboard stat key, keeping a generous top slice as
  // candidates (sport is confirmed once we have athlete metadata below).
  const byKey = new Map<string, [string, number][]>();
  for (const [aid, totals] of statTotals) {
    for (const [key, total] of totals) {
      if (total <= 0) continue;
      const list = byKey.get(key) || [];
      list.push([aid, total]);
      byKey.set(key, list);
    }
  }
  const leaderCandidateIds = new Set<string>();
  for (const [key, list] of byKey) {
    list.sort((a, b) => b[1] - a[1]);
    byKey.set(key, list.slice(0, 12));
    for (const [aid] of byKey.get(key)!) leaderCandidateIds.add(aid);
  }

  // One metadata fetch covering both the times-seen row and leaderboard rows.
  const metaIds = [...new Set([...topPlayerIds, ...leaderCandidateIds])];
  const playerMeta = new Map<string, { name: string; sport: string | null; headshot_url: string | null }>();
  for (let i = 0; i < metaIds.length; i += 100) {
    const { data } = await supabase
      .from("athletes")
      .select("id, name, sport, headshot_url")
      .in("id", metaIds.slice(i, i + 100));
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

  // Build per-sport leaderboards, ordered to match the user's sport mix so the
  // sport they watch most leads. Each stat shows the top athletes of that sport.
  const sportOrder = new Map(sports.map((s, i) => [s.sport, i]));
  const leaderboards: SportLeaderboard[] = Object.entries(LEADERBOARD_STATS)
    .map(([sport, statDefs]) => {
      const rows: LeaderboardRow[] = [];
      for (const st of statDefs) {
        const ranked = (byKey.get(st.key) || [])
          .filter(([aid]) => playerMeta.get(aid)?.sport === sport)
          .slice(0, 8)
          .map(([aid, total]) => {
            const m = playerMeta.get(aid)!;
            return { id: aid, name: m.name, headshot_url: m.headshot_url, value: st.format(total) };
          });
        if (ranked.length) rows.push({ key: st.key, label: st.label, short: st.short, players: ranked });
      }
      return { sport, stats: rows };
    })
    .filter((lb) => lb.stats.length > 0)
    .sort((a, b) => (sportOrder.get(a.sport) ?? 99) - (sportOrder.get(b.sport) ?? 99));

  return {
    stats: { games: logs.length, venues: venues.length, cities, wins, losses, draws, winPct },
    venues,
    topVenues,
    rings,
    sports,
    players,
    playersTotal,
    leaderboards,
    hidden: Array.isArray(config?.hidden) ? config!.hidden : [],
    topComplete,
    rooting,
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
