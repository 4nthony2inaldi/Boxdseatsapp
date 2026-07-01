import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Leaderboard data access. Calls the read-only `leaderboard` RPC (a
 * SECURITY DEFINER function that enforces the public-only / scope / block rules
 * itself — see docs/leaderboards.md). Safe to call from the browser with the
 * user's session; auth.uid() inside the function is the caller.
 *
 * Returns an empty result on any error (e.g. before the function is applied to
 * the DB), so the screen degrades gracefully rather than throwing.
 */

export type LeaderboardScope = "global" | "city" | "following";
export type LeaderboardWindow = "all" | "12m";
export type LeaderboardSeason = "all" | "regular" | "postseason";

export type LeaderboardRow = {
  rank: number;
  games: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type LeaderboardResult = {
  rows: LeaderboardRow[];
  me: { rank: number; games: number } | null;
  total: number;
};

export type LeaderboardParams = {
  scope: LeaderboardScope;
  sport?: string | null;
  team?: string | null;
  venue?: string | null;
  /** 'regular' | 'postseason' | 'preseason', or null for all. */
  season?: string | null;
  /** ISO date (YYYY-MM-DD) lower bound, or null for all-time. */
  since?: string | null;
  limit?: number;
};

const EMPTY: LeaderboardResult = { rows: [], me: null, total: 0 };

export async function fetchLeaderboard(
  supabase: SupabaseClient,
  params: LeaderboardParams
): Promise<LeaderboardResult> {
  const { data, error } = await supabase.rpc("leaderboard", {
    p_scope: params.scope,
    p_sport: params.sport ?? null,
    p_team: params.team ?? null,
    p_venue: params.venue ?? null,
    p_since: params.since ?? null,
    p_season: params.season ?? null,
    p_limit: params.limit ?? 100,
  });
  if (error || !data) return EMPTY;
  return data as LeaderboardResult;
}
