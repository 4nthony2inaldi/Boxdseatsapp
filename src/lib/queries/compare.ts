import { SupabaseClient } from "@supabase/supabase-js";
import { fetchPassport } from "./passport";
import type { ProfileData } from "./profile";

// ── Types ──

export type CompareGame = {
  /** Stable de-dupe key (event id, memory id, or log id). */
  key: string;
  /** "logged" = a companion tag / co-log confirms you were together;
   *  "both_there" = you each logged the same event but never tagged. */
  kind: "logged" | "both_there";
  eventId: string | null;
  date: string;
  title: string;
  venueId: string | null;
  venueName: string | null;
  sport: string | null;
  /** The viewer's own log of this game (for the "tag each other" CTA). */
  myLogId: string | null;
  /** The target's log of this game (for the "tag each other" CTA). */
  theirLogId: string | null;
};

export type CompareVenue = {
  venue_id: string;
  name: string;
  city: string;
  sport: string | null;
  photo_url: string | null;
};

export type CompareTeam = { id: string; name: string; logo_url: string | null };

export type RivalryPair = {
  league: string;
  mine: CompareTeam;
  theirs: CompareTeam;
};

export type CompareAthlete = { id: string; name: string; headshot_url: string | null };

export type CompareStat = {
  label: string;
  mine: string;
  theirs: string;
  /** true = viewer leads, false = target leads, null = tie / not comparable. */
  leader: "mine" | "theirs" | "tie";
};

export type ComparisonData = {
  together: { logged: CompareGame[]; bothThere: CompareGame[] };
  venues: { both: CompareVenue[]; onlyMine: CompareVenue[]; onlyTheirs: CompareVenue[] };
  fandom: {
    sharedTeams: CompareTeam[];
    rivalries: RivalryPair[];
    sharedAthletes: CompareAthlete[];
    sharedSport: string | null;
  };
  stats: CompareStat[];
};

// ── Helpers ──

type RawLog = {
  id: string;
  user_id: string;
  event_id: string | null;
  venue_id: string;
  event_date: string;
  sport: string | null;
  memory_id: string | null;
  manual_title: string | null;
  venues: { name: string } | null;
  events: {
    home_team: { short_name: string | null } | null;
    away_team: { short_name: string | null } | null;
    tournament_name: string | null;
  } | null;
};

function logTitle(log: RawLog): string {
  const ev = log.events;
  if (ev?.home_team?.short_name && ev?.away_team?.short_name) {
    return `${ev.away_team.short_name} @ ${ev.home_team.short_name}`;
  }
  if (ev?.tournament_name) return ev.tournament_name;
  if (log.manual_title) return log.manual_title;
  return log.venues?.name || "Game";
}

function toGame(log: RawLog, kind: CompareGame["kind"], key: string, myLogId: string | null, theirLogId: string | null): CompareGame {
  return {
    key,
    kind,
    eventId: log.event_id,
    date: log.event_date,
    title: logTitle(log),
    venueId: log.venue_id,
    venueName: log.venues?.name ?? null,
    sport: log.sport,
    myLogId,
    theirLogId,
  };
}

const LOG_SELECT = `
  id, user_id, event_id, venue_id, event_date, sport, memory_id, manual_title,
  venues(name),
  events!event_logs_event_id_fkey(
    home_team:teams!events_home_team_id_fkey(short_name),
    away_team:teams!events_away_team_id_fkey(short_name),
    tournament_name
  )
`;

// ── Main query ──

/**
 * Build the "You & them" comparison. Runs entirely under the viewer's RLS, so
 * the target's hidden logs / private data never surface. Callers must gate the
 * page first (public profile or following).
 */
export async function fetchComparison(
  supabase: SupabaseClient,
  viewer: ProfileData & { passport_config?: unknown },
  target: ProfileData & { passport_config?: unknown }
): Promise<ComparisonData> {
  const viewerId = viewer.id;
  const targetId = target.id;

  // Paginate the dual-user log fetch: a single PostgREST response caps at 1000
  // rows, so two heavy users together would otherwise truncate and drop
  // games-together / venue-Venn matches.
  const fetchBothLogs = async (): Promise<RawLog[]> => {
    const all: RawLog[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from("event_logs")
        .select(LOG_SELECT)
        .in("user_id", [viewerId, targetId])
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      all.push(...(data as unknown as RawLog[]));
      if (data.length < 1000) break;
    }
    return all;
  };

  const [myPassport, theirPassport, allLogs, tagsRes, favsRes] = await Promise.all([
    fetchPassport(supabase, viewer),
    fetchPassport(supabase, target),
    fetchBothLogs(),
    supabase
      .from("companion_tags")
      .select("event_log_id, tagged_user_id, status")
      .eq("status", "accepted")
      .in("tagged_user_id", [viewerId, targetId]),
    supabase
      .from("user_league_favorites")
      .select(
        "user_id, category, rank, team_id, athlete_id, league_id, teams(short_name, name, logo_url), leagues(name), athletes(name, headshot_url)"
      )
      .in("user_id", [viewerId, targetId])
      .in("category", ["team", "athlete"])
      .order("rank", { ascending: true }),
  ]);

  // ── Venue Venn (from each user's visited-venue list) ──
  const mineVenueMap = new Map(myPassport.venues.map((v) => [v.venue_id, v]));
  const theirVenueMap = new Map(theirPassport.venues.map((v) => [v.venue_id, v]));
  const slim = (v: { venue_id: string; name: string; city: string; sport: string | null; photo_url: string | null }): CompareVenue => ({
    venue_id: v.venue_id, name: v.name, city: v.city, sport: v.sport, photo_url: v.photo_url,
  });
  const both: CompareVenue[] = [];
  const onlyMine: CompareVenue[] = [];
  const onlyTheirs: CompareVenue[] = [];
  for (const v of myPassport.venues) {
    if (theirVenueMap.has(v.venue_id)) both.push(slim(v));
    else onlyMine.push(slim(v));
  }
  for (const v of theirPassport.venues) {
    if (!mineVenueMap.has(v.venue_id)) onlyTheirs.push(slim(v));
  }

  // ── Games together ──
  const logs = allLogs;
  const myLogs = logs.filter((l) => l.user_id === viewerId);
  const theirLogs = logs.filter((l) => l.user_id === targetId);
  const logById = new Map(logs.map((l) => [l.id, l]));

  const myByEvent = new Map<string, RawLog>();
  const myByMemory = new Map<string, RawLog>();
  for (const l of myLogs) {
    if (l.event_id) myByEvent.set(l.event_id, l);
    if (l.memory_id) myByMemory.set(l.memory_id, l);
  }
  const theirByEvent = new Map<string, RawLog>();
  const theirByMemory = new Map<string, RawLog>();
  for (const l of theirLogs) {
    if (l.event_id) theirByEvent.set(l.event_id, l);
    if (l.memory_id) theirByMemory.set(l.memory_id, l);
  }

  const loggedByKey = new Map<string, CompareGame>();
  const claimGame = (anchor: RawLog) => {
    // Resolve both sides of the pairing where we can.
    const key = anchor.event_id
      ? `e:${anchor.event_id}`
      : anchor.memory_id
        ? `m:${anchor.memory_id}`
        : `l:${anchor.id}`;
    if (loggedByKey.has(key)) return;
    const myLog = anchor.event_id ? myByEvent.get(anchor.event_id) : anchor.memory_id ? myByMemory.get(anchor.memory_id) : (anchor.user_id === viewerId ? anchor : undefined);
    const theirLog = anchor.event_id ? theirByEvent.get(anchor.event_id) : anchor.memory_id ? theirByMemory.get(anchor.memory_id) : (anchor.user_id === targetId ? anchor : undefined);
    const display = myLog?.events || myLog?.venues ? myLog! : theirLog?.events || theirLog?.venues ? theirLog! : anchor;
    loggedByKey.set(key, toGame(display, "logged", key, myLog?.id ?? null, theirLog?.id ?? null));
  };

  // Accepted companion tags linking the two users (in either direction).
  for (const tag of tagsRes.data || []) {
    const ownerLog = logById.get(tag.event_log_id as string);
    if (!ownerLog) continue; // owner log not visible to viewer
    const owner = ownerLog.user_id;
    const tagged = tag.tagged_user_id as string;
    const pair = new Set([owner, tagged]);
    if (pair.has(viewerId) && pair.has(targetId)) claimGame(ownerLog);
  }
  // Shared co-log memory ids (accept_companion_and_colog links both logs).
  for (const [memId, myLog] of myByMemory) {
    if (theirByMemory.has(memId)) claimGame(myLog);
  }

  // ── "You were both there" — same event, never tagged ──
  const bothThere: CompareGame[] = [];
  for (const [eventId, myLog] of myByEvent) {
    const theirLog = theirByEvent.get(eventId);
    if (!theirLog) continue;
    if (loggedByKey.has(`e:${eventId}`)) continue; // already confirmed together
    bothThere.push(toGame(myLog, "both_there", `e:${eventId}`, myLog.id, theirLog.id));
  }

  const logged = [...loggedByKey.values()].sort((a, b) => b.date.localeCompare(a.date));
  bothThere.sort((a, b) => b.date.localeCompare(a.date));

  // ── Fandom ──
  type Fav = {
    user_id: string;
    category: string;
    rank: number;
    team_id: string | null;
    athlete_id: string | null;
    league_id: string | null;
    teams: { short_name: string | null; name: string | null; logo_url: string | null } | null;
    leagues: { name: string | null } | null;
    athletes: { name: string | null; headshot_url: string | null } | null;
  };
  const favs = (favsRes.data || []) as unknown as Fav[];
  const myFavs = favs.filter((f) => f.user_id === viewerId);
  const theirFavs = favs.filter((f) => f.user_id === targetId);

  const myTeamIds = new Set(myFavs.filter((f) => f.team_id).map((f) => f.team_id as string));
  const teamMeta = new Map<string, CompareTeam>();
  for (const f of favs) {
    if (f.team_id && f.teams) {
      teamMeta.set(f.team_id, { id: f.team_id, name: f.teams.short_name || f.teams.name || "", logo_url: f.teams.logo_url });
    }
  }

  // Shared teams (both favorite the exact same team).
  const sharedTeams: CompareTeam[] = [];
  const seenShared = new Set<string>();
  for (const f of theirFavs) {
    if (f.team_id && myTeamIds.has(f.team_id) && !seenShared.has(f.team_id)) {
      seenShared.add(f.team_id);
      sharedTeams.push(teamMeta.get(f.team_id)!);
    }
  }

  // Rivalries: same league, different top team.
  const myTopByLeague = new Map<string, Fav>();
  for (const f of myFavs) if (f.team_id && f.league_id && !myTopByLeague.has(f.league_id)) myTopByLeague.set(f.league_id, f);
  const theirTopByLeague = new Map<string, Fav>();
  for (const f of theirFavs) if (f.team_id && f.league_id && !theirTopByLeague.has(f.league_id)) theirTopByLeague.set(f.league_id, f);

  const rivalries: RivalryPair[] = [];
  for (const [leagueId, mineFav] of myTopByLeague) {
    const theirsFav = theirTopByLeague.get(leagueId);
    if (!theirsFav) continue;
    if (mineFav.team_id === theirsFav.team_id) continue; // that's a shared team, not a rivalry
    rivalries.push({
      league: mineFav.leagues?.name || theirsFav.leagues?.name || "",
      mine: teamMeta.get(mineFav.team_id as string)!,
      theirs: teamMeta.get(theirsFav.team_id as string)!,
    });
  }

  // Shared athletes.
  const myAthleteIds = new Set(myFavs.filter((f) => f.athlete_id).map((f) => f.athlete_id as string));
  const sharedAthletes: CompareAthlete[] = [];
  const seenAth = new Set<string>();
  for (const f of theirFavs) {
    if (f.athlete_id && myAthleteIds.has(f.athlete_id) && f.athletes && !seenAth.has(f.athlete_id)) {
      seenAth.add(f.athlete_id);
      sharedAthletes.push({ id: f.athlete_id, name: f.athletes.name || "", headshot_url: f.athletes.headshot_url });
    }
  }

  const sharedSport = viewer.fav_sport && viewer.fav_sport === target.fav_sport ? viewer.fav_sport : null;

  // ── Tale of the tape ──
  const num = (n: number) => String(n);
  const lead = (a: number, b: number): CompareStat["leader"] => (a > b ? "mine" : b > a ? "theirs" : "tie");
  const myPct = myPassport.stats.winPct;
  const theirPct = theirPassport.stats.winPct;
  const stats: CompareStat[] = [
    { label: "Games", mine: num(myPassport.stats.games), theirs: num(theirPassport.stats.games), leader: lead(myPassport.stats.games, theirPassport.stats.games) },
    { label: "Venues", mine: num(myPassport.stats.venues), theirs: num(theirPassport.stats.venues), leader: lead(myPassport.stats.venues, theirPassport.stats.venues) },
    { label: "Cities", mine: num(myPassport.stats.cities), theirs: num(theirPassport.stats.cities), leader: lead(myPassport.stats.cities, theirPassport.stats.cities) },
    {
      label: "Fan Win%",
      mine: myPct !== null ? `${myPct}%` : "—",
      theirs: theirPct !== null ? `${theirPct}%` : "—",
      leader: myPct !== null && theirPct !== null ? lead(myPct, theirPct) : "tie",
    },
  ];

  return {
    together: { logged, bothThere },
    venues: { both, onlyMine, onlyTheirs },
    fandom: { sharedTeams, rivalries, sharedAthletes, sharedSport },
    stats,
  };
}
