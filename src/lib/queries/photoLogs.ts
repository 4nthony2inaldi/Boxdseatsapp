import { SupabaseClient } from "@supabase/supabase-js";

export type LogPick = { eventId: string; rootingTeamId: string | null };

export type CreateLogsResult = {
  created: number;
  venues: number;
  /** New log ids by event, so the client can attach the matched photo. */
  logs: { eventId: string; logId: string }[];
};

type Outcome = "win" | "loss" | "draw" | "neutral";

/**
 * Create event logs from approved photo suggestions. Outcome is derived from
 * the rooting team + the final score we already store (so win/loss fills in
 * with no extra input). A null rooting team = neutral. Already-logged events
 * are skipped, so committing twice is safe.
 */
export async function createLogsFromSuggestions(
  supabase: SupabaseClient,
  userId: string,
  picks: LogPick[]
): Promise<CreateLogsResult> {
  if (!picks.length) return { created: 0, venues: 0, logs: [] };

  const rootingByEvent = new Map(picks.map((p) => [p.eventId, p.rootingTeamId]));
  const eventIds = [...rootingByEvent.keys()];

  const { data: events } = await supabase
    .from("events")
    .select(
      "id, venue_id, league_id, event_date, home_team_id, away_team_id, home_score, away_score, leagues(sport)"
    )
    .in("id", eventIds);
  if (!events?.length) return { created: 0, venues: 0, logs: [] };

  const { data: existing } = await supabase
    .from("event_logs")
    .select("event_id")
    .eq("user_id", userId)
    .in("event_id", eventIds);
  const alreadyLogged = new Set((existing || []).map((e) => e.event_id as string));

  const rows = events
    .filter((e) => !alreadyLogged.has(e.id))
    .map((e) => {
      // Only honor a rooting team that's actually in this game — a bad id would
      // otherwise store a phantom rooting team and miscompute win/loss.
      const picked = rootingByEvent.get(e.id) ?? null;
      const rooting = picked === e.home_team_id || picked === e.away_team_id ? picked : null;
      let outcome: Outcome = "neutral";
      if (rooting && e.home_score != null && e.away_score != null) {
        const mine = rooting === e.home_team_id ? e.home_score : e.away_score;
        const opp = rooting === e.home_team_id ? e.away_score : e.home_score;
        outcome = mine > opp ? "win" : mine < opp ? "loss" : "draw";
      }
      const league = e.leagues as unknown as { sport: string | null } | null;
      return {
        user_id: userId,
        event_id: e.id,
        venue_id: e.venue_id,
        league_id: e.league_id,
        sport: league?.sport ?? null,
        event_date: e.event_date,
        outcome,
        rooting_team_id: rooting,
        is_neutral: rooting === null,
        privacy: "show_all",
      };
    });

  if (!rows.length) return { created: 0, venues: 0, logs: [] };

  const { data: inserted, error } = await supabase
    .from("event_logs")
    .insert(rows)
    .select("id, event_id");
  if (error) throw new Error(error.message);

  const logs = (inserted || []).map((r) => ({ eventId: r.event_id as string, logId: r.id as string }));
  return { created: logs.length, venues: new Set(rows.map((r) => r.venue_id)).size, logs };
}
