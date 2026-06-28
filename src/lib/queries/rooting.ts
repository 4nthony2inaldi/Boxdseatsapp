import { SupabaseClient } from "@supabase/supabase-js";

/**
 * A logged game that has no rooting team yet but could have one — a team-vs-team
 * game with a final score. Field/individual sports (no two teams) and unscored
 * games are excluded, since there's nothing to root for / no result to compute.
 */
export type RootlessGame = {
  logId: string;
  eventId: string;
  date: string;
  venueName: string | null;
  sport: string | null;
  leagueSlug: string | null;
  home: { id: string; name: string; score: number };
  away: { id: string; name: string; score: number };
};

const SELECT = `id, event_date, sport,
  events!event_logs_event_id_fkey(
    id, home_team_id, away_team_id, home_score, away_score,
    venues!events_venue_id_fkey(name),
    leagues(slug),
    home_team:teams!events_home_team_id_fkey(id, name, short_name),
    away_team:teams!events_away_team_id_fkey(id, name, short_name)
  )`;

type EventRel = {
  id: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  venues: { name: string } | null;
  leagues: { slug: string | null } | null;
  home_team: { id: string; name: string | null; short_name: string | null } | null;
  away_team: { id: string; name: string | null; short_name: string | null } | null;
} | null;

/** True only for a team-vs-team game with both final scores. */
function isRootable(e: EventRel): e is NonNullable<EventRel> & {
  home_team_id: string; away_team_id: string; home_score: number; away_score: number;
} {
  return !!e && !!e.home_team_id && !!e.away_team_id && e.home_score != null && e.away_score != null;
}

/**
 * Games the user logged without picking a side. Paginated (a heavy attendee can
 * have hundreds), newest first. Field sports and unscored games are filtered out
 * in JS off the joined event, so the definition matches countRootlessLogs.
 */
export async function fetchRootlessLogs(
  supabase: SupabaseClient,
  userId: string
): Promise<RootlessGame[]> {
  const out: RootlessGame[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("event_logs")
      .select(SELECT)
      .eq("user_id", userId)
      .is("rooting_team_id", null)
      .not("event_id", "is", null)
      .order("event_date", { ascending: false })
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const e = row.events as unknown as EventRel;
      if (!isRootable(e)) continue;
      out.push({
        logId: row.id as string,
        eventId: e.id,
        date: row.event_date as string,
        venueName: e.venues?.name ?? null,
        sport: (row.sport as string | null) ?? null,
        leagueSlug: e.leagues?.slug ?? null,
        home: { id: e.home_team_id, name: e.home_team?.name || e.home_team?.short_name || "", score: e.home_score },
        away: { id: e.away_team_id, name: e.away_team?.name || e.away_team?.short_name || "", score: e.away_score },
      });
    }
    if (data.length < 1000) break;
  }
  return out;
}

/** Count of rootless games, using the same definition as fetchRootlessLogs. */
export async function countRootlessLogs(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  let n = 0;
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("event_logs")
      .select("id, events!event_logs_event_id_fkey(home_team_id, away_team_id, home_score, away_score)")
      .eq("user_id", userId)
      .is("rooting_team_id", null)
      .not("event_id", "is", null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const row of data) {
      if (isRootable(row.events as unknown as EventRel)) n++;
    }
    if (data.length < 1000) break;
  }
  return n;
}

function computeOutcome(
  rootingTeamId: string,
  homeTeamId: string,
  homeScore: number,
  awayScore: number
): "win" | "loss" | "draw" {
  if (homeScore === awayScore) return "draw";
  const rootedHome = rootingTeamId === homeTeamId;
  const homeWon = homeScore > awayScore;
  return rootedHome === homeWon ? "win" : "loss";
}

export type RootingPick = { logId: string; rootingTeamId: string };

/**
 * Set a rooting team on already-logged games and recompute win/loss from the
 * stored score. Validates each pick against the actual game (rooting team must
 * be one of the two), so a bad id can't store a phantom rooting team. Only the
 * caller's own logs are touched (user_id scoped + RLS).
 */
export async function applyRooting(
  supabase: SupabaseClient,
  userId: string,
  picks: RootingPick[]
): Promise<{ updated: number }> {
  if (!picks.length) return { updated: 0 };
  const wanted = new Map(picks.map((p) => [p.logId, p.rootingTeamId]));
  const logIds = [...wanted.keys()];

  type Row = {
    id: string;
    events: { home_team_id: string | null; away_team_id: string | null; home_score: number | null; away_score: number | null } | null;
  };
  const rows: Row[] = [];
  for (let i = 0; i < logIds.length; i += 200) {
    const { data } = await supabase
      .from("event_logs")
      .select("id, events!event_logs_event_id_fkey(home_team_id, away_team_id, home_score, away_score)")
      .eq("user_id", userId)
      .in("id", logIds.slice(i, i + 200));
    if (data) rows.push(...(data as unknown as Row[]));
  }

  let updated = 0;
  for (let i = 0; i < rows.length; i += 10) {
    const batch = rows.slice(i, i + 10);
    await Promise.all(
      batch.map(async (r) => {
        const rt = wanted.get(r.id);
        const e = r.events;
        if (!rt || !e || e.home_score == null || e.away_score == null) return;
        if (rt !== e.home_team_id && rt !== e.away_team_id) return; // not in this game
        const outcome = computeOutcome(rt, e.home_team_id as string, e.home_score, e.away_score);
        const { error } = await supabase
          .from("event_logs")
          .update({ rooting_team_id: rt, is_neutral: false, outcome })
          .eq("id", r.id)
          .eq("user_id", userId);
        if (!error) updated++;
      })
    );
  }
  return { updated };
}
