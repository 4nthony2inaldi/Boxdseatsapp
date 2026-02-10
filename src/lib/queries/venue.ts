import { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──

export type VenueDetail = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  country: string;
  capacity: number | null;
  photo_url: string | null;
  description: string | null;
  opened_year: number | null;
};

export type VenueHistory = {
  totalVisits: number;
  firstVisit: string | null; // YYYY-MM-DD
  lastVisit: string | null;
};

export type VenueTeam = {
  id: string;
  name: string;
  short_name: string;
  abbreviation: string;
  league_name: string;
  league_slug: string;
  league_icon: string;
};

export type VenueCommunityStats = {
  totalCheckIns: number;
  friendsWhoVisited: { id: string; username: string; display_name: string | null; avatar_url: string | null }[];
};

export type VenueTimelineEntry = {
  id: string;
  event_date: string;
  rating: number | null;
  notes: string | null;
  outcome: string | null;
  privacy: string;
  like_count: number;
  comment_count: number;
  seat_location: string | null;
  league_slug: string | null;
  league_name: string | null;
  venue_name: string | null;
  venue_id: string | null;
  event_id: string | null;
  matchup: string | null;
  home_team_short: string | null;
  away_team_short: string | null;
  home_score: number | null;
  away_score: number | null;
  sport: string | null;
  is_manual?: boolean;
  manual_title?: string | null;
};

// Sport icons lookup
const sportIcons: Record<string, string> = {
  football: "🏈",
  basketball: "🏀",
  baseball: "⚾",
  hockey: "🏒",
  soccer: "⚽",
  golf: "⛳",
  tennis: "🎾",
};

// ── Fetch venue details ──

export async function fetchVenueDetail(
  supabase: SupabaseClient,
  venueId: string
): Promise<VenueDetail | null> {
  const { data } = await supabase
    .from("venues")
    .select("id, name, city, state, country, capacity, photo_url, description, opened_year")
    .eq("id", venueId)
    .single();

  return data;
}

// ── Fetch user's history at venue ──

export async function fetchVenueHistory(
  supabase: SupabaseClient,
  userId: string,
  venueId: string
): Promise<VenueHistory> {
  const { data } = await supabase
    .from("event_logs")
    .select("event_date")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .order("event_date", { ascending: true });

  if (!data || data.length === 0) {
    return { totalVisits: 0, firstVisit: null, lastVisit: null };
  }

  return {
    totalVisits: data.length,
    firstVisit: data[0].event_date,
    lastVisit: data[data.length - 1].event_date,
  };
}

// ── Fetch home teams for a venue ──

export async function fetchVenueTeams(
  supabase: SupabaseClient,
  venueId: string
): Promise<VenueTeam[]> {
  // venue_teams is the join table between venues and teams
  const { data } = await supabase
    .from("venue_teams")
    .select(`
      team_id,
      teams(id, name, short_name, abbreviation, leagues(name, slug, sport))
    `)
    .eq("venue_id", venueId);

  if (!data) return [];

  return data
    .map((vt) => {
      const team = vt.teams as unknown as {
        id: string;
        name: string;
        short_name: string;
        abbreviation: string;
        leagues: { name: string; slug: string; sport: string } | null;
      } | null;

      if (!team) return null;

      return {
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        abbreviation: team.abbreviation,
        league_name: team.leagues?.name || "",
        league_slug: (team.leagues?.slug || "").toUpperCase(),
        league_icon: team.leagues?.sport ? sportIcons[team.leagues.sport] || "🏟️" : "🏟️",
      };
    })
    .filter(Boolean) as VenueTeam[];
}

// ── Fetch community stats ──

export async function fetchVenueCommunityStats(
  supabase: SupabaseClient,
  userId: string,
  venueId: string
): Promise<VenueCommunityStats> {
  // Total check-ins across all users
  const { count: totalCheckIns } = await supabase
    .from("event_logs")
    .select("id", { count: "exact", head: true })
    .eq("venue_id", venueId);

  // Friends (people the user follows) who visited this venue
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "active");

  const friendIds = following?.map((f) => f.following_id) || [];
  let friendsWhoVisited: VenueCommunityStats["friendsWhoVisited"] = [];

  if (friendIds.length > 0) {
    // Get distinct user_ids from event_logs at this venue who are friends
    const { data: friendLogs } = await supabase
      .from("event_logs")
      .select("user_id")
      .eq("venue_id", venueId)
      .in("user_id", friendIds);

    if (friendLogs) {
      const uniqueFriendIds = [...new Set(friendLogs.map((fl) => fl.user_id))];
      if (uniqueFriendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", uniqueFriendIds);

        friendsWhoVisited = (profiles || []) as VenueCommunityStats["friendsWhoVisited"];
      }
    }
  }

  return {
    totalCheckIns: totalCheckIns || 0,
    friendsWhoVisited,
  };
}

// ── Fetch user's events at this venue (timeline entries) ──

export async function fetchVenueTimeline(
  supabase: SupabaseClient,
  userId: string,
  venueId: string
): Promise<VenueTimelineEntry[]> {
  const { data } = await supabase
    .from("event_logs")
    .select(`
      id, event_date, rating, notes, outcome, privacy, like_count, comment_count, seat_location, sport,
      event_id, venue_id, is_manual, manual_title,
      venues(name),
      leagues(slug, name),
      events(
        home_score, away_score,
        home_team:teams!events_home_team_id_fkey(short_name, abbreviation),
        away_team:teams!events_away_team_id_fkey(short_name, abbreviation),
        tournament_name
      )
    `)
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .order("event_date", { ascending: false });

  if (!data) return [];

  return data.map((log) => {
    const venue = log.venues as unknown as { name: string } | null;
    const league = log.leagues as unknown as { slug: string; name: string } | null;
    const event = log.events as unknown as {
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
      id: log.id,
      event_date: log.event_date,
      rating: log.rating,
      notes: log.notes,
      outcome: log.outcome,
      privacy: log.privacy,
      like_count: log.like_count,
      comment_count: log.comment_count,
      seat_location: log.seat_location,
      league_slug: league?.slug?.toUpperCase() || null,
      league_name: league?.name || null,
      venue_name: venue?.name || null,
      venue_id: log.venue_id,
      event_id: log.event_id,
      matchup,
      home_team_short: event?.home_team?.short_name || null,
      away_team_short: event?.away_team?.short_name || null,
      home_score: event?.home_score ?? null,
      away_score: event?.away_score ?? null,
      sport: log.sport,
      is_manual: log.is_manual,
      manual_title: log.manual_title,
    };
  });
}
