import { SupabaseClient } from "@supabase/supabase-js";
import { getSportIconPath } from "@/lib/sportIcons";

export type AthleteGame = {
  eventId: string;
  eventDate: string;
  template: string;
  homeAbbr: string | null;
  awayAbbr: string | null;
  homeScore: number | null;
  awayScore: number | null;
  tournamentName: string | null;
  roundOrStage: string | null;
  venueId: string;
  venueName: string;
  city: string | null;
  state: string | null;
  leagueName: string;
  sport: string | null;
  icon: string;
  /** The viewer's own log for this game (rooting outcome + rating). */
  userOutcome: string | null;
  userRating: number | null;
  /** The athlete's line for this game, from the box score. */
  athleteTeamId: string | null;
  finishPosition: number | null;
  isWinner: boolean | null;
};

export type AthleteForUser = {
  id: string;
  name: string;
  sport: string | null;
  icon: string;
  headshotUrl: string | null;
  /** Individual sports (golf/tennis/motorsports) get finish-based stats. */
  isIndividual: boolean;
  seenCount: number;
  /** The viewer's fan record across the games they saw this athlete in. */
  wins: number;
  losses: number;
  draws: number;
  /** Individual sports: events the athlete won / finished top-3 while you watched. */
  victories: number;
  podiums: number;
  bestFinish: number | null;
  teams: { id: string; name: string; logoUrl: string | null }[];
  games: AthleteGame[];
};

const INDIVIDUAL = new Set(["golf", "tennis", "motorsports"]);

type AthleteRow = { id: string; name: string | null; sport: string | null; headshot_url: string | null };

function base(ath: AthleteRow): AthleteForUser {
  return {
    id: ath.id,
    name: ath.name || "Unknown",
    sport: ath.sport,
    icon: getSportIconPath(ath.sport) || "",
    headshotUrl: ath.headshot_url,
    isIndividual: !!ath.sport && INDIVIDUAL.has(ath.sport),
    seenCount: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    victories: 0,
    podiums: 0,
    bestFinish: null,
    teams: [],
    games: [],
  };
}

/**
 * One athlete's profile through the lens of a specific fan: the games that fan
 * logged where this athlete appeared, plus stats derived from those games.
 *
 * Privacy: `event_athletes` is public reference data, so the boundary is the
 * set of `event_logs` the caller's session can see (RLS-filtered). When the
 * owner views their own passport they see everything; a visitor only sees the
 * owner's public logs. Pass the *profile owner's* id as `userId`.
 */
export async function fetchAthleteForUser(
  supabase: SupabaseClient,
  userId: string,
  athleteId: string
): Promise<AthleteForUser | null> {
  const { data: ath } = await supabase
    .from("athletes")
    .select("id, name, sport, headshot_url")
    .eq("id", athleteId)
    .maybeSingle();
  if (!ath) return null;

  // The fan's logs: event_id -> their rooting outcome + rating.
  const logMap = new Map<string, { outcome: string | null; rating: number | null }>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("event_logs")
      .select("event_id, outcome, rating")
      .eq("user_id", userId)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const l of data) {
      if (l.event_id) logMap.set(l.event_id as string, { outcome: l.outcome ?? null, rating: l.rating ?? null });
    }
    if (data.length < 1000) break;
  }
  const eventIds = [...logMap.keys()];
  if (eventIds.length === 0) return base(ath);

  // The athlete's box-score rows within the fan's attended events (chunked to
  // stay under the PostgREST .in() list cap).
  type EaRow = { event_id: string; team_id: string | null; finish_position: number | null; is_winner: boolean | null };
  const eaRows: EaRow[] = [];
  for (let i = 0; i < eventIds.length; i += 200) {
    const { data } = await supabase
      .from("event_athletes")
      .select("event_id, team_id, finish_position, is_winner")
      .eq("athlete_id", athleteId)
      .in("event_id", eventIds.slice(i, i + 200));
    for (const r of data || []) eaRows.push(r as EaRow);
  }
  if (eaRows.length === 0) return base(ath);

  const eaByEvent = new Map(eaRows.map((r) => [r.event_id, r]));
  const gameEventIds = [...eaByEvent.keys()];

  // Event details for those games.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const eventMap = new Map<string, any>();
  for (let i = 0; i < gameEventIds.length; i += 100) {
    const { data } = await supabase
      .from("events")
      .select(`
        id, event_date, event_template, home_score, away_score,
        tournament_name, round_or_stage, venue_id,
        venues!events_venue_id_fkey(name, city, state),
        leagues(name, sport),
        home_team:teams!events_home_team_id_fkey(abbreviation, short_name),
        away_team:teams!events_away_team_id_fkey(abbreviation, short_name)
      `)
      .in("id", gameEventIds.slice(i, i + 100));
    for (const e of data || []) eventMap.set(e.id as string, e);
  }

  // Teams the athlete suited up for, across these games.
  const teamIds = [...new Set(eaRows.map((r) => r.team_id).filter((t): t is string => !!t))];
  const teamMap = new Map<string, { name: string; logoUrl: string | null }>();
  if (teamIds.length > 0) {
    const { data } = await supabase.from("teams").select("id, name, short_name, logo_url").in("id", teamIds);
    for (const t of data || []) {
      teamMap.set(t.id as string, { name: (t.short_name as string) || (t.name as string) || "", logoUrl: (t.logo_url as string | null) ?? null });
    }
  }

  const games: AthleteGame[] = gameEventIds
    .map((eid): AthleteGame | null => {
      const e = eventMap.get(eid);
      if (!e) return null;
      const ea = eaByEvent.get(eid)!;
      const log = logMap.get(eid);
      const v = e.venues as { name: string; city: string | null; state: string | null } | null;
      const lg = e.leagues as { name: string; sport: string | null } | null;
      const ht = e.home_team as { abbreviation: string | null; short_name: string | null } | null;
      const at = e.away_team as { abbreviation: string | null; short_name: string | null } | null;
      return {
        eventId: eid,
        eventDate: e.event_date as string,
        template: (e.event_template as string) || "",
        homeAbbr: ht?.abbreviation || ht?.short_name || null,
        awayAbbr: at?.abbreviation || at?.short_name || null,
        homeScore: e.home_score ?? null,
        awayScore: e.away_score ?? null,
        tournamentName: (e.tournament_name as string | null) ?? null,
        roundOrStage: (e.round_or_stage as string | null) ?? null,
        venueId: e.venue_id as string,
        venueName: v?.name || "",
        city: v?.city ?? null,
        state: v?.state ?? null,
        leagueName: lg?.name || "",
        sport: lg?.sport ?? null,
        icon: getSportIconPath(lg?.sport) || "",
        userOutcome: log?.outcome ?? null,
        userRating: log?.rating ?? null,
        athleteTeamId: ea.team_id,
        finishPosition: ea.finish_position,
        isWinner: ea.is_winner,
      };
    })
    .filter((g): g is AthleteGame => !!g)
    .sort((a, b) => (a.eventDate < b.eventDate ? 1 : a.eventDate > b.eventDate ? -1 : 0));

  let wins = 0, losses = 0, draws = 0, victories = 0, podiums = 0;
  let bestFinish: number | null = null;
  for (const g of games) {
    if (g.userOutcome === "win") wins++;
    else if (g.userOutcome === "loss") losses++;
    else if (g.userOutcome === "draw") draws++;
    if (g.isWinner) victories++;
    if (g.finishPosition != null) {
      if (g.finishPosition <= 3) podiums++;
      if (bestFinish == null || g.finishPosition < bestFinish) bestFinish = g.finishPosition;
    }
  }

  const result = base(ath);
  result.seenCount = games.length;
  result.wins = wins;
  result.losses = losses;
  result.draws = draws;
  result.victories = victories;
  result.podiums = podiums;
  result.bestFinish = bestFinish;
  result.teams = [...teamMap.entries()].map(([id, t]) => ({ id, name: t.name, logoUrl: t.logoUrl }));
  result.games = games;
  return result;
}
