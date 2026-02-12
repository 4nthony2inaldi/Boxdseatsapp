import { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──

export type FeedEntry = {
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
  manual_title: string | null;
  is_manual: boolean;
  created_at: string;
  // Author info
  author: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  // Whether the current user has liked this entry
  liked_by_me: boolean;
};

export type FollowRelationship = {
  isFollowing: boolean;
  isPending: boolean;
  isFollowedBy: boolean;
};

export type FollowUser = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  isFollowing: boolean;
  isPending: boolean;
};

export type SearchResultUser = {
  type: "user";
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type SearchResultVenue = {
  type: "venue";
  id: string;
  name: string;
  city: string;
  state: string | null;
};

export type SearchResultTeam = {
  type: "team";
  id: string;
  name: string;
  short_name: string;
  league_name: string | null;
  league_icon: string | null;
};

export type SearchResults = {
  users: SearchResultUser[];
  venues: SearchResultVenue[];
  teams: SearchResultTeam[];
};

export type FeedPage = {
  entries: FeedEntry[];
  hasMore: boolean;
};

// ── Feed query ──

export async function fetchFeed(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
  offset = 0
): Promise<FeedPage> {
  // 1. Get IDs of users I follow (active only)
  const { data: followRows, error: followError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "active");

  if (followError) {
    console.error("[fetchFeed] follows query error:", followError.message, followError.code);
  }

  const followingIds = (followRows || []).map((r) => r.following_id);
  // Include own entries in the feed
  const feedUserIds = [userId, ...followingIds];
  console.log("[fetchFeed] feedUserIds:", feedUserIds.length, "userId:", userId);

  if (feedUserIds.length === 0) return { entries: [], hasMore: false };

  // 2. Get blocked user IDs (both directions)
  const { data: blockedRows } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);

  const blockedIds = new Set<string>();
  for (const b of blockedRows || []) {
    if (b.blocker_id === userId) blockedIds.add(b.blocked_id);
    if (b.blocked_id === userId) blockedIds.add(b.blocker_id);
  }

  // 3. Fetch event logs from followed users + self
  const { data: logs, error: logsError } = await supabase
    .from("event_logs")
    .select(
      `
      id, event_date, rating, notes, outcome, privacy, like_count, comment_count,
      seat_location, sport, is_manual, manual_title, created_at,
      photo_url, photo_is_verified,
      user_id,
      event_id,
      venue_id,
      venues(name),
      leagues(slug, name),
      events!event_logs_event_id_fkey(
        home_score, away_score,
        home_team:teams!events_home_team_id_fkey(short_name, abbreviation),
        away_team:teams!events_away_team_id_fkey(short_name, abbreviation),
        tournament_name
      )
    `
    )
    .in("user_id", feedUserIds)
    .neq("privacy", "hide_all")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit);

  if (logsError) {
    console.error("[fetchFeed] event_logs query error:", logsError.message, logsError.code, logsError.details);
  }

  if (!logs || logs.length === 0) return { entries: [], hasMore: false };

  // Detect if there are more pages
  const hasMore = logs.length > limit;
  const pageLogs = hasMore ? logs.slice(0, limit) : logs;

  // 4. Fetch profiles for all authors
  const authorIds = [...new Set(pageLogs.map((l) => l.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", authorIds);

  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, p])
  );

  // 5. Fetch which entries the current user has liked
  const logIds = pageLogs.map((l) => l.id);
  const { data: myLikes } = await supabase
    .from("likes")
    .select("event_log_id")
    .eq("user_id", userId)
    .in("event_log_id", logIds);

  const likedSet = new Set((myLikes || []).map((l) => l.event_log_id));

  // 6. Map to feed entries, filtering out blocked users
  const entries = pageLogs
    .filter((log) => !blockedIds.has(log.user_id))
    .map((log) => {
      const venue = log.venues as unknown as { name: string } | null;
      const league = log.leagues as unknown as {
        slug: string;
        name: string;
      } | null;
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

      const profile = profileMap.get(log.user_id);

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
        manual_title: log.manual_title,
        is_manual: log.is_manual,
        photo_url: log.photo_url || null,
        photo_is_verified: log.photo_is_verified || false,
        created_at: log.created_at,
        author: {
          id: log.user_id,
          username: profile?.username || "unknown",
          display_name: profile?.display_name || null,
          avatar_url: profile?.avatar_url || null,
        },
        liked_by_me: likedSet.has(log.id),
      };
    });

  return { entries, hasMore };
}

// ── Follow relationship check ──

export async function fetchFollowRelationship(
  supabase: SupabaseClient,
  currentUserId: string,
  targetUserId: string
): Promise<FollowRelationship> {
  const [outgoing, incoming] = await Promise.all([
    supabase
      .from("follows")
      .select("status")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetUserId)
      .maybeSingle(),
    supabase
      .from("follows")
      .select("status")
      .eq("follower_id", targetUserId)
      .eq("following_id", currentUserId)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  return {
    isFollowing: outgoing.data?.status === "active",
    isPending: outgoing.data?.status === "pending",
    isFollowedBy: !!incoming.data,
  };
}

// ── Follow / unfollow / cancel request ──

export async function followUser(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string
): Promise<{ status: "active" | "pending" } | { error: string }> {
  if (followerId === followingId) return { error: "Cannot follow yourself." };

  // Check if target profile is private
  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("is_private")
    .eq("id", followingId)
    .single();

  const status = targetProfile?.is_private ? "pending" : "active";

  const { error } = await supabase.from("follows").upsert(
    {
      follower_id: followerId,
      following_id: followingId,
      status,
    },
    { onConflict: "follower_id,following_id" }
  );

  if (error) {
    return { error: "Failed to follow user." };
  }

  return { status };
}

export async function unfollowUser(
  supabase: SupabaseClient,
  followerId: string,
  followingId: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("following_id", followingId);

  if (error) {
    return { error: "Failed to unfollow user." };
  }

  return { success: true };
}

// ── Accept/reject follow request ──

export async function acceptFollowRequest(
  supabase: SupabaseClient,
  currentUserId: string,
  requesterId: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("follows")
    .update({ status: "active" })
    .eq("follower_id", requesterId)
    .eq("following_id", currentUserId)
    .eq("status", "pending");

  if (error) return { error: "Failed to accept request." };
  return { success: true };
}

// ── Fetch followers/following lists ──

export async function fetchFollowersList(
  supabase: SupabaseClient,
  userId: string,
  currentUserId: string
): Promise<FollowUser[]> {
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("following_id", userId)
    .eq("status", "active");

  if (!data || data.length === 0) return [];

  const followerIds = data.map((d) => d.follower_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .in("id", followerIds);

  if (!profiles) return [];

  // Check which followers the current user is following
  let myFollowing = new Map<string, string>();
  if (currentUserId) {
    const { data: myFollows } = await supabase
      .from("follows")
      .select("following_id, status")
      .eq("follower_id", currentUserId)
      .in("following_id", followerIds);

    myFollowing = new Map(
      (myFollows || []).map((f) => [f.following_id, f.status])
    );
  }

  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: p.bio,
    isFollowing: myFollowing.get(p.id) === "active",
    isPending: myFollowing.get(p.id) === "pending",
  }));
}

export async function fetchFollowingList(
  supabase: SupabaseClient,
  userId: string,
  currentUserId: string
): Promise<FollowUser[]> {
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("status", "active");

  if (!data || data.length === 0) return [];

  const followingIds = data.map((d) => d.following_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .in("id", followingIds);

  if (!profiles) return [];

  // Check which of these the current user is also following
  let myFollowing = new Map<string, string>();
  if (currentUserId) {
    const { data: myFollows } = await supabase
      .from("follows")
      .select("following_id, status")
      .eq("follower_id", currentUserId)
      .in("following_id", followingIds);

    myFollowing = new Map(
      (myFollows || []).map((f) => [f.following_id, f.status])
    );
  }

  return profiles.map((p) => ({
    id: p.id,
    username: p.username,
    display_name: p.display_name,
    avatar_url: p.avatar_url,
    bio: p.bio,
    isFollowing:
      p.id === currentUserId ? false : myFollowing.get(p.id) === "active",
    isPending:
      p.id === currentUserId ? false : myFollowing.get(p.id) === "pending",
  }));
}

// ── Like toggle ──

export async function toggleLike(
  supabase: SupabaseClient,
  userId: string,
  eventLogId: string,
  currentlyLiked: boolean
): Promise<{ liked: boolean } | { error: string }> {
  if (currentlyLiked) {
    // Unlike
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("user_id", userId)
      .eq("event_log_id", eventLogId);

    if (error) return { error: "Failed to unlike." };
    return { liked: false };
  } else {
    // Like
    const { error } = await supabase
      .from("likes")
      .insert({ user_id: userId, event_log_id: eventLogId });

    if (error) {
      // Handle duplicate
      if (error.code === "23505") return { liked: true };
      return { error: "Failed to like." };
    }
    return { liked: true };
  }
}

// ── Check if user has liked an entry ──

export async function checkUserLike(
  supabase: SupabaseClient,
  userId: string,
  eventLogId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("likes")
    .select("id")
    .eq("user_id", userId)
    .eq("event_log_id", eventLogId)
    .maybeSingle();

  return !!data;
}

// ── Explore search ──

export async function searchAll(
  supabase: SupabaseClient,
  query: string,
  limit = 8
): Promise<SearchResults> {
  const q = query.trim();
  if (!q) return { users: [], venues: [], teams: [] };

  const pattern = `%${q}%`;

  const [usersRes, venuesRes, teamsRes] = await Promise.all([
    // Search users by username or display_name
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .or(`username.ilike.${pattern},display_name.ilike.${pattern}`)
      .limit(limit),

    // Search venues by name or city
    supabase
      .from("venues")
      .select("id, name, city, state")
      .eq("status", "active")
      .or(`name.ilike.${pattern},city.ilike.${pattern}`)
      .limit(limit),

    // Search teams by name or short_name
    supabase
      .from("teams")
      .select("id, name, short_name, leagues(name, slug)")
      .or(`name.ilike.${pattern},short_name.ilike.${pattern}`)
      .limit(limit),
  ]);

  const LEAGUE_ICONS: Record<string, string> = {
    nfl: "/football.svg",
    nba: "/basketball.svg",
    mlb: "/baseball.svg",
    nhl: "/hockey.svg",
    mls: "/soccer.svg",
    "pga-tour": "/golf.svg",
    pga: "/golf.svg",
  };

  return {
    users: (usersRes.data || []).map((u) => ({
      type: "user" as const,
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
    })),
    venues: (venuesRes.data || []).map((v) => ({
      type: "venue" as const,
      id: v.id,
      name: v.name,
      city: v.city,
      state: v.state,
    })),
    teams: (teamsRes.data || []).map((t) => {
      const league = t.leagues as unknown as {
        name: string;
        slug: string;
      } | null;
      return {
        type: "team" as const,
        id: t.id,
        name: t.name,
        short_name: t.short_name,
        league_name: league?.name || null,
        league_icon: league?.slug ? LEAGUE_ICONS[league.slug] || null : null,
      };
    }),
  };
}

// ── Block / unblock ──

export async function blockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string
): Promise<{ success: boolean } | { error: string }> {
  if (blockerId === blockedId) return { error: "Cannot block yourself." };

  // Insert block
  const { error: blockError } = await supabase
    .from("blocks")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (blockError) {
    if (blockError.code === "23505") return { success: true }; // Already blocked
    return { error: "Failed to block user." };
  }

  // Remove any follow relationships in both directions
  await Promise.all([
    supabase
      .from("follows")
      .delete()
      .eq("follower_id", blockerId)
      .eq("following_id", blockedId),
    supabase
      .from("follows")
      .delete()
      .eq("follower_id", blockedId)
      .eq("following_id", blockerId),
  ]);

  return { success: true };
}

export async function unblockUser(
  supabase: SupabaseClient,
  blockerId: string,
  blockedId: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) return { error: "Failed to unblock user." };
  return { success: true };
}

export async function checkBlocked(
  supabase: SupabaseClient,
  userId1: string,
  userId2: string
): Promise<boolean> {
  const { data } = await supabase
    .from("blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`
    )
    .limit(1);

  return (data?.length || 0) > 0;
}

// ── Report ──

export async function reportContent(
  supabase: SupabaseClient,
  reporterId: string,
  targetType: "user" | "comment" | "event_log",
  targetId: string,
  reason: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase.from("reports").insert({
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim() || null,
    status: "pending",
  });

  if (error) return { error: "Failed to submit report." };
  return { success: true };
}

// ── Fetch other user's profile with privacy check ──

export async function fetchUserProfileByUsername(
  supabase: SupabaseClient,
  username: string
): Promise<{
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  fav_sport: string | null;
  fav_team_id: string | null;
  fav_venue_id: string | null;
  fav_athlete_id: string | null;
  fav_event_id: string | null;
  pinned_list_1_id: string | null;
  pinned_list_2_id: string | null;
  is_private: boolean;
} | null> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, fav_sport, fav_team_id, fav_venue_id, fav_athlete_id, fav_event_id, pinned_list_1_id, pinned_list_2_id, is_private"
    )
    .eq("username", username)
    .single();

  return data;
}
