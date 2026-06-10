import type { SupabaseClient } from "@supabase/supabase-js";

export type TeamDetail = {
  id: string;
  name: string;
  short_name: string;
  abbreviation: string;
  city: string;
  logo_url: string | null;
  is_active: boolean;
  league_name: string;
  league_slug: string;
  sport: string;
};

export type TeamVenue = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  is_primary: boolean;
  is_spring_home: boolean;
};

export type TeamEventRow = {
  id: string;
  event_date: string;
  home_team_short: string | null;
  away_team_short: string | null;
  home_score: number | null;
  away_score: number | null;
  venue_name: string | null;
  is_postseason: boolean;
  attended: boolean;
};

export async function fetchTeamDetail(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamDetail | null> {
  const { data } = await supabase
    .from("teams")
    .select(
      "id, name, short_name, abbreviation, city, logo_url, is_active, leagues(name, slug, sport)"
    )
    .eq("id", teamId)
    .maybeSingle();

  if (!data) return null;

  const league = data.leagues as unknown as {
    name: string;
    slug: string;
    sport: string;
  } | null;

  return {
    id: data.id,
    name: data.name,
    short_name: data.short_name,
    abbreviation: data.abbreviation,
    city: data.city,
    logo_url: data.logo_url,
    is_active: data.is_active,
    league_name: league?.name || "",
    league_slug: league?.slug || "",
    sport: league?.sport || "",
  };
}

export async function fetchTeamVenues(
  supabase: SupabaseClient,
  teamId: string
): Promise<TeamVenue[]> {
  const [{ data }, { data: springEvents }] = await Promise.all([
    supabase
      .from("venue_teams")
      .select("is_primary, venues(id, name, city, state, status)")
      .eq("team_id", teamId),
    // Venues where this team regularly hosts preseason games (spring home);
    // a handful-of-games floor excludes one-off neutral-site exhibitions.
    supabase
      .from("events")
      .select("venue_id")
      .eq("home_team_id", teamId)
      .eq("is_preseason", true),
  ]);

  if (!data) return [];

  const springCounts = new Map<string, number>();
  for (const e of springEvents || []) {
    springCounts.set(e.venue_id, (springCounts.get(e.venue_id) || 0) + 1);
  }

  return data
    .map((row) => {
      const venue = row.venues as unknown as {
        id: string;
        name: string;
        city: string;
        state: string | null;
        status: string;
      } | null;
      if (!venue || venue.status !== "active") return null;
      const isSpringHome = (springCounts.get(venue.id) || 0) >= 5;
      return {
        id: venue.id,
        name: venue.name,
        city: venue.city,
        state: venue.state,
        is_primary: row.is_primary as boolean,
        is_spring_home: isSpringHome,
      };
    })
    .filter((v): v is TeamVenue => v !== null)
    // Show primary homes and real spring homes; hide one-off relocation sites
    .filter((v) => v.is_primary || v.is_spring_home)
    .sort((a, b) => Number(b.is_primary) - Number(a.is_primary));
}

/**
 * Recent completed events involving the team, flagged with whether the
 * current user attended (logged) each one.
 */
export async function fetchTeamRecentEvents(
  supabase: SupabaseClient,
  teamId: string,
  userId: string,
  limit = 15
): Promise<TeamEventRow[]> {
  const today = new Date().toISOString().slice(0, 10);

  const { data: events } = await supabase
    .from("events")
    .select(
      `id, event_date, home_score, away_score, is_postseason,
       home_team:teams!events_home_team_id_fkey(short_name),
       away_team:teams!events_away_team_id_fkey(short_name),
       venues(name)`
    )
    .or(`home_team_id.eq.${teamId},away_team_id.eq.${teamId}`)
    .lte("event_date", today)
    .order("event_date", { ascending: false })
    .limit(limit);

  if (!events || events.length === 0) return [];

  const eventIds = events.map((e) => e.id);
  const { data: logs } = await supabase
    .from("event_logs")
    .select("event_id")
    .eq("user_id", userId)
    .in("event_id", eventIds);

  const attendedIds = new Set((logs || []).map((l) => l.event_id as string));

  return events.map((e) => {
    const home = e.home_team as unknown as { short_name: string } | null;
    const away = e.away_team as unknown as { short_name: string } | null;
    const venue = e.venues as unknown as { name: string } | null;
    return {
      id: e.id,
      event_date: e.event_date,
      home_team_short: home?.short_name || null,
      away_team_short: away?.short_name || null,
      home_score: e.home_score,
      away_score: e.away_score,
      venue_name: venue?.name || null,
      is_postseason: e.is_postseason,
      attended: attendedIds.has(e.id),
    };
  });
}

export type TeamUserStats = {
  gamesAttended: number;
  wins: number;
  losses: number;
};

/**
 * The current user's attendance history for this team's games.
 * Wins/losses are from the team's perspective (not rooting interest).
 */
export async function fetchTeamUserStats(
  supabase: SupabaseClient,
  teamId: string,
  userId: string
): Promise<TeamUserStats> {
  const { data } = await supabase
    .from("event_logs")
    .select(
      `id, events!event_logs_event_id_fkey(home_team_id, away_team_id, home_score, away_score)`
    )
    .eq("user_id", userId)
    .not("event_id", "is", null);

  let gamesAttended = 0;
  let wins = 0;
  let losses = 0;

  for (const log of data || []) {
    const event = log.events as unknown as {
      home_team_id: string | null;
      away_team_id: string | null;
      home_score: number | null;
      away_score: number | null;
    } | null;
    if (!event) continue;
    const isHome = event.home_team_id === teamId;
    const isAway = event.away_team_id === teamId;
    if (!isHome && !isAway) continue;

    gamesAttended += 1;
    if (event.home_score === null || event.away_score === null) continue;
    const teamScore = isHome ? event.home_score : event.away_score;
    const oppScore = isHome ? event.away_score : event.home_score;
    if (teamScore > oppScore) wins += 1;
    else if (teamScore < oppScore) losses += 1;
  }

  return { gamesAttended, wins, losses };
}
