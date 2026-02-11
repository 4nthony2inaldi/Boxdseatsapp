import { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──

export type EventDetail = {
  id: string;
  event_date: string;
  event_template: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_short: string | null;
  away_team_short: string | null;
  home_team_abbr: string | null;
  away_team_abbr: string | null;
  home_score: number | null;
  away_score: number | null;
  tournament_name: string | null;
  round_or_stage: string | null;
  season: number;
  venue_id: string;
  venue_name: string;
  league_slug: string;
  league_name: string;
  league_icon: string;
  league_color: string;
  sport: string | null;
  cover_photo_url: string | null;
  cover_photo_event_log_id: string | null;
};

export type UserEventLog = {
  id: string;
  user_id: string;
  rating: number | null;
  notes: string | null;
  outcome: string | null;
  seat_location: string | null;
  privacy: string;
  like_count: number;
  comment_count: number;
  is_manual: boolean;
  manual_title: string | null;
  photo_url: string | null;
  photo_is_verified: boolean;
  companions: { display_name: string; tagged_user_id: string | null }[];
};

export type EventAttendee = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  rating: number | null;
  outcome: string | null;
};

export type EventComment = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  body: string;
  created_at: string;
  event_log_id: string;
};

// League config
const LEAGUE_CONFIG: Record<string, { icon: string; color: string }> = {
  nfl: { icon: "/football.svg", color: "#013369" },
  nba: { icon: "/basketball.svg", color: "#1D428A" },
  mlb: { icon: "/baseball.svg", color: "#002D72" },
  nhl: { icon: "/hockey.svg", color: "#000000" },
  mls: { icon: "/soccer.svg", color: "#5B2C82" },
  "pga-tour": { icon: "/golf.svg", color: "#003B2F" },
  pga: { icon: "/golf.svg", color: "#003B2F" },
};

// ── Fetch event details ──

export async function fetchEventDetail(
  supabase: SupabaseClient,
  eventId: string
): Promise<EventDetail | null> {
  const { data } = await supabase
    .from("events")
    .select(`
      id, event_date, event_template, season, round_or_stage,
      home_team_id, away_team_id, home_score, away_score,
      tournament_name, venue_id,
      cover_photo_url, cover_photo_event_log_id,
      venues(name),
      leagues(name, slug, sport),
      home_team:teams!events_home_team_id_fkey(short_name, abbreviation),
      away_team:teams!events_away_team_id_fkey(short_name, abbreviation)
    `)
    .eq("id", eventId)
    .single();

  if (!data) return null;

  const venue = data.venues as unknown as { name: string } | null;
  const league = data.leagues as unknown as { name: string; slug: string; sport: string } | null;
  const homeTeam = data.home_team as unknown as { short_name: string; abbreviation: string } | null;
  const awayTeam = data.away_team as unknown as { short_name: string; abbreviation: string } | null;

  const slug = league?.slug || "";
  const config = LEAGUE_CONFIG[slug] || { icon: "", color: "#D4872C" };

  return {
    id: data.id,
    event_date: data.event_date,
    event_template: data.event_template,
    home_team_id: data.home_team_id,
    away_team_id: data.away_team_id,
    home_team_short: homeTeam?.short_name || null,
    away_team_short: awayTeam?.short_name || null,
    home_team_abbr: homeTeam?.abbreviation || null,
    away_team_abbr: awayTeam?.abbreviation || null,
    home_score: data.home_score,
    away_score: data.away_score,
    tournament_name: data.tournament_name,
    round_or_stage: data.round_or_stage,
    season: data.season,
    venue_id: data.venue_id,
    venue_name: venue?.name || "",
    league_slug: slug.toUpperCase(),
    league_name: league?.name || "",
    league_icon: config.icon,
    league_color: config.color,
    sport: league?.sport || null,
    cover_photo_url: data.cover_photo_url || null,
    cover_photo_event_log_id: data.cover_photo_event_log_id || null,
  };
}

// ── Fetch the current user's event log for this event ──

export async function fetchUserEventLog(
  supabase: SupabaseClient,
  userId: string,
  eventId: string
): Promise<UserEventLog | null> {
  const { data } = await supabase
    .from("event_logs")
    .select("id, user_id, rating, notes, outcome, seat_location, privacy, like_count, comment_count, is_manual, manual_title, photo_url, photo_is_verified")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .single();

  if (!data) return null;

  // Fetch companions for this log
  const { data: companions } = await supabase
    .from("companion_tags")
    .select("display_name, tagged_user_id")
    .eq("event_log_id", data.id);

  return {
    ...data,
    companions: companions || [],
  };
}

// ── Fetch BoxdSeats attendees (other users who logged this event) ──

export async function fetchEventAttendees(
  supabase: SupabaseClient,
  eventId: string,
  excludeUserId: string
): Promise<EventAttendee[]> {
  const { data } = await supabase
    .from("event_logs")
    .select("id, user_id, rating, outcome, privacy")
    .eq("event_id", eventId)
    .neq("user_id", excludeUserId)
    .neq("privacy", "hide_all");

  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((d) => d.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  return data.map((log) => {
    const profile = profileMap.get(log.user_id);
    return {
      id: log.id,
      user_id: log.user_id,
      username: profile?.username || "unknown",
      display_name: profile?.display_name || null,
      avatar_url: profile?.avatar_url || null,
      rating: log.rating,
      outcome: log.outcome,
    };
  });
}

// ── Fetch comments for an event log ──

export async function fetchEventComments(
  supabase: SupabaseClient,
  eventLogId: string
): Promise<EventComment[]> {
  const { data } = await supabase
    .from("comments")
    .select("id, user_id, body, created_at, event_log_id")
    .eq("event_log_id", eventLogId)
    .order("created_at", { ascending: true });

  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((d) => d.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  return data.map((c) => {
    const profile = profileMap.get(c.user_id);
    return {
      id: c.id,
      user_id: c.user_id,
      username: profile?.username || "unknown",
      display_name: profile?.display_name || null,
      avatar_url: profile?.avatar_url || null,
      body: c.body,
      created_at: c.created_at,
      event_log_id: c.event_log_id,
    };
  });
}

// ── Post a comment ──

export async function postComment(
  supabase: SupabaseClient,
  userId: string,
  eventLogId: string,
  body: string
): Promise<{ id: string } | { error: string }> {
  const trimmed = body.trim();
  if (!trimmed) return { error: "Comment cannot be empty." };

  const { data, error } = await supabase
    .from("comments")
    .insert({ user_id: userId, event_log_id: eventLogId, body: trimmed })
    .select("id")
    .single();

  if (error) {
    return { error: "Failed to post comment. Please try again." };
  }

  return { id: data.id };
}

// ── Delete a comment ──
// Allows deletion if the user is either the comment author or the log owner.

export async function deleteComment(
  supabase: SupabaseClient,
  commentId: string,
  userId: string,
  logOwnerId?: string
): Promise<{ success: boolean } | { error: string }> {
  // If the user is the log owner, they can delete any comment on their log
  if (logOwnerId && logOwnerId === userId) {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) return { error: "Failed to delete comment." };
    return { success: true };
  }

  // Otherwise, only allow deleting own comments
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) {
    return { error: "Failed to delete comment." };
  }

  return { success: true };
}

// ── Photo Gallery Types ──

export type GalleryPhoto = {
  event_log_id: string;
  photo_url: string;
  photo_is_verified: boolean;
  photo_like_count: number;
  photo_captured_at: string | null;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  liked_by_me: boolean;
};

// ── Fetch photo gallery for an event ──

export async function fetchEventGallery(
  supabase: SupabaseClient,
  eventId: string,
  currentUserId: string
): Promise<GalleryPhoto[]> {
  // Get all event logs with photos for this event
  const { data: logs } = await supabase
    .from("event_logs")
    .select("id, user_id, photo_url, photo_is_verified, photo_like_count, photo_captured_at")
    .eq("event_id", eventId)
    .not("photo_url", "is", null)
    .neq("privacy", "hide_all");

  if (!logs || logs.length === 0) return [];

  // Fetch profiles for all photographers
  const userIds = [...new Set(logs.map((l) => l.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  // Fetch current user's likes on these photos
  const logIds = logs.map((l) => l.id);
  const { data: myLikes } = await supabase
    .from("photo_likes")
    .select("event_log_id")
    .eq("user_id", currentUserId)
    .in("event_log_id", logIds);

  const likedSet = new Set((myLikes || []).map((l) => l.event_log_id));

  // Map and sort: likes desc, then capture time asc
  return logs
    .map((log) => {
      const profile = profileMap.get(log.user_id);
      return {
        event_log_id: log.id,
        photo_url: log.photo_url!,
        photo_is_verified: log.photo_is_verified || false,
        photo_like_count: log.photo_like_count || 0,
        photo_captured_at: log.photo_captured_at,
        user_id: log.user_id,
        username: profile?.username || "unknown",
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
        liked_by_me: likedSet.has(log.id),
      };
    })
    .sort((a, b) => {
      // Sort by like count descending
      if (b.photo_like_count !== a.photo_like_count) {
        return b.photo_like_count - a.photo_like_count;
      }
      // Tiebreaker: capture time ascending
      const aTime = a.photo_captured_at ? new Date(a.photo_captured_at).getTime() : Infinity;
      const bTime = b.photo_captured_at ? new Date(b.photo_captured_at).getTime() : Infinity;
      return aTime - bTime;
    });
}

// ── Toggle photo like ──

export async function togglePhotoLike(
  supabase: SupabaseClient,
  userId: string,
  eventLogId: string,
  currentlyLiked: boolean
): Promise<{ success: boolean } | { error: string }> {
  if (currentlyLiked) {
    const { error } = await supabase
      .from("photo_likes")
      .delete()
      .eq("user_id", userId)
      .eq("event_log_id", eventLogId);

    if (error) return { error: "Failed to unlike photo." };
  } else {
    const { error } = await supabase
      .from("photo_likes")
      .insert({ user_id: userId, event_log_id: eventLogId });

    if (error) return { error: "Failed to like photo." };
  }

  return { success: true };
}
