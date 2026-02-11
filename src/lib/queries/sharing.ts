import { SupabaseClient } from "@supabase/supabase-js";

export type PublicEventLog = {
  id: string;
  event_date: string;
  rating: number | null;
  notes: string | null;
  outcome: string | null;
  privacy: string;
  seat_location: string | null;
  like_count: number;
  comment_count: number;
  is_manual: boolean;
  manual_title: string | null;
  // Event fields
  event_id: string | null;
  venue_name: string | null;
  venue_id: string | null;
  league_slug: string | null;
  league_name: string | null;
  matchup: string | null;
  sport: string | null;
  // Author fields
  author_id: string;
  author_username: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
};

/**
 * Fetch a single event log entry by ID for public sharing.
 * Respects privacy settings — entries with hide_all are not returned.
 */
export async function fetchPublicEventLog(
  supabase: SupabaseClient,
  eventLogId: string
): Promise<PublicEventLog | null> {
  const { data } = await supabase
    .from("event_logs")
    .select(
      `
      id, event_date, rating, notes, outcome, privacy, like_count, comment_count,
      seat_location, sport, is_manual, manual_title,
      user_id,
      event_id,
      venue_id,
      venues(name),
      leagues(slug, name),
      events(
        home_score, away_score,
        home_team:teams!events_home_team_id_fkey(short_name, abbreviation),
        away_team:teams!events_away_team_id_fkey(short_name, abbreviation),
        tournament_name
      )
    `
    )
    .eq("id", eventLogId)
    .neq("privacy", "hide_all")
    .single();

  if (!data) return null;

  // Fetch author profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("id", data.user_id)
    .single();

  if (!profile) return null;

  const venue = data.venues as unknown as { name: string } | null;
  const league = data.leagues as unknown as {
    slug: string;
    name: string;
  } | null;
  const event = data.events as unknown as {
    home_score: number | null;
    away_score: number | null;
    home_team: { short_name: string; abbreviation: string } | null;
    away_team: { short_name: string; abbreviation: string } | null;
    tournament_name: string | null;
  } | null;

  let matchup: string | null = null;
  if (event?.home_team && event?.away_team) {
    const hs = event.home_score ?? "";
    const as_ = event.away_score ?? "";
    matchup = `${event.home_team.short_name} ${hs} — ${event.away_team.short_name} ${as_}`;
  } else if (event?.tournament_name) {
    matchup = event.tournament_name;
  }

  return {
    id: data.id,
    event_date: data.event_date,
    rating: data.rating,
    notes: data.notes,
    outcome: data.outcome,
    privacy: data.privacy,
    seat_location: data.seat_location,
    like_count: data.like_count,
    comment_count: data.comment_count,
    is_manual: data.is_manual,
    manual_title: data.manual_title,
    event_id: data.event_id,
    venue_name: venue?.name || null,
    venue_id: data.venue_id,
    league_slug: league?.slug?.toUpperCase() || null,
    league_name: league?.name || null,
    matchup,
    sport: data.sport,
    author_id: profile.id,
    author_username: profile.username,
    author_display_name: profile.display_name,
    author_avatar_url: profile.avatar_url,
  };
}
