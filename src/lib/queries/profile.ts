import { SupabaseClient } from "@supabase/supabase-js";
import { fetchUserEventTags } from "./eventTags";
import { getSportIconPath } from "@/lib/sportIcons";
import { redactTimelineEntry } from "./timelinePrivacy";

export type ProfileData = {
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
};

export type ProfileStats = {
  totalEvents: number;
  totalVenues: number;
  followers: number;
  following: number;
  wins: number;
  losses: number;
  draws: number;
};

export type BigFourItem = {
  category: "team" | "venue" | "athlete" | "event";
  name: string;
  subtitle: string;
  image_url?: string | null;
  /** True when the user hasn't picked this favorite yet. */
  empty?: boolean;
};

export type ActivityMonth = {
  /** YYYY-MM key, used for timeline month links */
  ym: string;
  month: string;
  year: number;
  count: number;
};

export type PinnedListData = {
  id: string;
  name: string;
  icon: string;
  list_type: string;
  sport: string | null;
  item_count: number;
  visited: number;
};

export type TimelineEntry = {
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
  home_team_abbr: string | null;
  away_team_abbr: string | null;
  home_score: number | null;
  away_score: number | null;
  sport: string | null;
  photo_url: string | null;
  photo_is_verified: boolean;
  is_manual?: boolean;
  manual_title?: string | null;
  manual_description?: string | null;
};

export async function fetchProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileData | null> {
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, fav_sport, fav_team_id, fav_venue_id, fav_athlete_id, fav_event_id, pinned_list_1_id, pinned_list_2_id"
    )
    .eq("id", userId)
    .single();
  return data;
}

/**
 * Distinct cities among a user's visited venues. Uses the same RLS-respecting
 * RPC the passport/share card uses, so the count matches the card exactly.
 */
export async function fetchVisitedCityCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { data } = await supabase.rpc("passport_venues", { p_user: userId });
  const cities = new Set<string>();
  for (const v of (data as { city: string | null; state: string | null }[] | null) || []) {
    if (v?.city) cities.add(`${v.city}|${v.state ?? ""}`);
  }
  return cities.size;
}

export async function fetchProfileStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileStats> {
  const [eventsRes, venuesRes, followersRes, followingRes, winsRes, lossesRes, drawsRes] =
    await Promise.all([
      supabase
        .from("event_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("venue_visits")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("relationship", "visited"),
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", userId)
        .eq("status", "active"),
      supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", userId)
        .eq("status", "active"),
      supabase
        .from("event_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("outcome", "win"),
      supabase
        .from("event_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("outcome", "loss"),
      supabase
        .from("event_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("outcome", "draw"),
    ]);

  return {
    totalEvents: eventsRes.count || 0,
    totalVenues: venuesRes.count || 0,
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
    wins: winsRes.count || 0,
    losses: lossesRes.count || 0,
    draws: drawsRes.count || 0,
  };
}

export async function fetchBigFour(
  supabase: SupabaseClient,
  profile: ProfileData
): Promise<BigFourItem[]> {
  // The featured pick per category is the #1 (lowest-rank) entry in the user's
  // ranking. Fall back to the legacy profiles.fav_*_id for anyone who has no
  // ranked favorites yet. The team slot may hold an athlete (individual sports).
  const { data: favRows } = await supabase
    .from("user_league_favorites")
    .select("category, rank, team_id, athlete_id, venue_id, event_id")
    .eq("user_id", profile.id)
    .order("rank", { ascending: true });

  const topByCat = new Map<string, { team_id: string | null; athlete_id: string | null; venue_id: string | null; event_id: string | null }>();
  for (const f of favRows || []) {
    if (!topByCat.has(f.category)) topByCat.set(f.category, f);
  }
  const teamTop = topByCat.get("team");
  const venueTop = topByCat.get("venue");
  const athleteTop = topByCat.get("athlete");
  const eventTop = topByCat.get("event");

  // Resolve effective ids: ranking first, else legacy column.
  const teamId = teamTop ? teamTop.team_id : profile.fav_team_id;
  const teamAthleteId = teamTop ? teamTop.athlete_id : null;
  const venueId = venueTop ? venueTop.venue_id : profile.fav_venue_id;
  const athleteId = athleteTop ? athleteTop.athlete_id : profile.fav_athlete_id;
  const eventId = eventTop ? eventTop.event_id : profile.fav_event_id;

  // The four lookups are independent \u2014 run them concurrently, then assemble
  // in fixed display order (team, venue, athlete, event).
  const [teamRes, teamAthleteRes, venueRes, athleteRes, eventRes, ownLogRes] = await Promise.all([
    teamId
      ? supabase.from("teams").select("name, short_name, logo_url, leagues(name)").eq("id", teamId).single()
      : Promise.resolve({ data: null }),
    teamAthleteId
      ? supabase.from("athletes").select("name, sport, headshot_url").eq("id", teamAthleteId).single()
      : Promise.resolve({ data: null }),
    venueId
      ? supabase.from("venues").select("name, city, state, photo_url").eq("id", venueId).single()
      : Promise.resolve({ data: null }),
    athleteId
      ? supabase.from("athletes").select("name, sport, headshot_url").eq("id", athleteId).single()
      : Promise.resolve({ data: null }),
    eventId
      ? supabase.from("events").select(
          "event_date, home_score, away_score, home_team:teams!events_home_team_id_fkey(short_name, abbreviation), away_team:teams!events_away_team_id_fkey(short_name, abbreviation), tournament_name, venues!events_venue_id_fkey(name, photo_url)"
        ).eq("id", eventId).single()
      : Promise.resolve({ data: null }),
    eventId
      ? supabase.from("event_logs").select("photo_url").eq("user_id", profile.id).eq("event_id", eventId).not("photo_url", "is", null).limit(1).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const items: BigFourItem[] = [];

  const team = teamRes.data as { name: string; short_name: string; logo_url: string | null; leagues: unknown } | null;
  const teamAthlete = teamAthleteRes.data as { name: string; sport: string | null; headshot_url: string | null } | null;
  if (team) {
    const league = (team.leagues as unknown as { name: string } | null)?.name || "";
    items.push({ category: "team", name: team.short_name || team.name, subtitle: league, image_url: team.logo_url });
  } else if (teamAthlete) {
    // Individual-sport pick ranked #1 in the team slot (e.g. a tennis player)
    items.push({ category: "team", name: teamAthlete.name, subtitle: teamAthlete.sport || "", image_url: teamAthlete.headshot_url });
  } else {
    items.push({ category: "team", name: "Not set", subtitle: "", empty: true });
  }

  const venue = venueRes.data as { name: string; city: string; state: string | null; photo_url: string | null } | null;
  if (venue) {
    items.push({ category: "venue", name: venue.name, subtitle: `${venue.city}${venue.state ? `, ${venue.state}` : ""}`, image_url: venue.photo_url });
  } else {
    items.push({ category: "venue", name: "Not set", subtitle: "", empty: true });
  }

  const athlete = athleteRes.data as { name: string; sport: string | null; headshot_url: string | null } | null;
  if (athlete) {
    items.push({ category: "athlete", name: athlete.name, subtitle: athlete.sport || "", image_url: athlete.headshot_url });
  } else {
    items.push({ category: "athlete", name: "Not set", subtitle: "", empty: true });
  }

  const data = eventRes.data as {
    event_date: string; home_score: number | null; away_score: number | null;
    home_team: unknown; away_team: unknown; tournament_name: string | null; venues: unknown;
  } | null;
  if (data) {
    const home = data.home_team as unknown as { short_name: string; abbreviation: string } | null;
    const away = data.away_team as unknown as { short_name: string; abbreviation: string } | null;
    const venueData = data.venues as unknown as { name: string; photo_url: string | null } | null;
    const venueName = venueData?.name || "";
    const d = new Date(data.event_date + "T00:00:00");
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
    const homeAbbr = home?.abbreviation || home?.short_name;
    const awayAbbr = away?.abbreviation || away?.short_name;
    const name = homeAbbr && awayAbbr ? `${awayAbbr} @ ${homeAbbr} ${dateStr}` : data.tournament_name || "Event";
    const score = data.home_score !== null && data.away_score !== null ? `${data.away_score}\u2013${data.home_score}` : null;
    const ownLog = ownLogRes.data as { photo_url: string | null } | null;
    items.push({
      category: "event",
      name,
      subtitle: score ? `${score} \u00b7 ${venueName}` : venueName,
      image_url: ownLog?.photo_url ?? venueData?.photo_url ?? null,
    });
  } else {
    items.push({ category: "event", name: "Not set", subtitle: "", empty: true });
  }

  return items;
}

export async function fetchActivityChart(
  supabase: SupabaseClient,
  userId: string
): Promise<{ months: ActivityMonth[]; total: number }> {
  // All-time, capped-pagination over event dates (Supabase returns max 1,000
  // rows per request). The chart scrolls back to the user's first event.
  const dates: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("event_logs")
      .select("event_date")
      .eq("user_id", userId)
      .order("event_date", { ascending: true })
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) dates.push(r.event_date);
    if (data.length < 1000) break;
  }

  const counts = new Map<string, number>();
  for (const d of dates) {
    const ym = d.slice(0, 7);
    counts.set(ym, (counts.get(ym) || 0) + 1);
  }

  const now = new Date();
  // Start at the user's first event month, but always show at least 12 months
  const first = dates.length
    ? new Date(Number(dates[0].slice(0, 4)), Number(dates[0].slice(5, 7)) - 1, 1)
    : now;
  const minStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const start = first < minStart ? new Date(first.getFullYear(), first.getMonth(), 1) : minStart;

  const months: ActivityMonth[] = [];
  const cursor = new Date(start);
  while (cursor <= now) {
    const ym = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      ym,
      month: cursor.toLocaleString("en-US", { month: "short" }),
      year: cursor.getFullYear(),
      count: counts.get(ym) || 0,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return { months, total: dates.length };
}

export async function fetchPinnedLists(
  supabase: SupabaseClient,
  userId: string,
  listIds: (string | null)[]
): Promise<PinnedListData[]> {
  const validIds = listIds.filter(Boolean) as string[];
  if (validIds.length === 0) return [];

  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, list_type, sport, item_count, league_id")
    .in("id", validIds);

  if (!lists || lists.length === 0) return [];

  const hasVenueList = lists.some((l) => l.list_type === "venue");
  const hasEventList = lists.some((l) => l.list_type === "event");

  // Batch every list's items in one query instead of one-per-list (N+1).
  const { data: allItems } = await supabase
    .from("list_items")
    .select("list_id, venue_id, event_tag")
    .in("list_id", lists.map((l) => l.id));
  const itemsByList = new Map<string, { venue_id: string | null; event_tag: string | null }[]>();
  for (const it of allItems || []) {
    const arr = itemsByList.get(it.list_id) ?? [];
    arr.push(it);
    itemsByList.set(it.list_id, arr);
  }

  // One pass for the user's visited venues across all venue lists…
  let visitedVenues = new Set<string>();
  if (hasVenueList) {
    const venueIds = (allItems || []).map((i) => i.venue_id).filter(Boolean) as string[];
    if (venueIds.length > 0) {
      const { data: visits } = await supabase
        .from("venue_visits")
        .select("venue_id")
        .eq("user_id", userId)
        .eq("relationship", "visited")
        .in("venue_id", venueIds);
      visitedVenues = new Set((visits || []).map((v) => v.venue_id as string));
    }
  }
  // …and one pass for the user's attended event tags across all event lists.
  const userTags = hasEventList ? await fetchUserEventTags(supabase, userId) : new Set<string>();

  return lists.map((list) => {
    const items = itemsByList.get(list.id) ?? [];
    let visited = 0;
    if (list.list_type === "venue") {
      visited = items.filter((i) => i.venue_id && visitedVenues.has(i.venue_id)).length;
    } else if (list.list_type === "event") {
      visited = items.filter((i) => i.event_tag && userTags.has(i.event_tag)).length;
    }
    return {
      id: list.id,
      name: list.name,
      icon: getSportIconPath(list.sport) || "",
      list_type: list.list_type,
      sport: list.sport,
      item_count: list.item_count,
      visited,
    };
  });
}

/**
 * When a user hasn't manually pinned lists, auto-pick the two with the most
 * items completed (highest visited count) from the lists they follow or own.
 * Manual pins (pinned_list_1_id / pinned_list_2_id) take precedence at the call
 * site. Returns up to two list ids (only lists with any progress).
 */
export async function fetchAutoPinnedListIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const [followsRes, ownedRes] = await Promise.all([
    supabase.from("list_follows").select("list_id").eq("user_id", userId),
    supabase.from("lists").select("id").eq("created_by", userId).eq("source", "user"),
  ]);
  const ids = new Set<string>();
  for (const f of followsRes.data || []) ids.add(f.list_id as string);
  for (const o of ownedRes.data || []) ids.add(o.id as string);
  if (ids.size === 0) return [];
  const idArr = [...ids];

  const { data: lists } = await supabase
    .from("lists")
    .select("id, list_type, item_count")
    .in("id", idArr);
  if (!lists || lists.length === 0) return [];

  const { data: allItems } = await supabase
    .from("list_items")
    .select("list_id, venue_id, event_tag")
    .in("list_id", idArr);
  const itemsByList = new Map<string, { venue_id: string | null; event_tag: string | null }[]>();
  for (const it of allItems || []) {
    const arr = itemsByList.get(it.list_id as string) ?? [];
    arr.push({ venue_id: it.venue_id, event_tag: it.event_tag });
    itemsByList.set(it.list_id as string, arr);
  }

  const hasVenue = lists.some((l) => l.list_type === "venue");
  const hasEvent = lists.some((l) => l.list_type === "event");
  let visitedVenues = new Set<string>();
  if (hasVenue) {
    const venueIds = (allItems || []).map((i) => i.venue_id).filter(Boolean) as string[];
    if (venueIds.length > 0) {
      const { data: visits } = await supabase
        .from("venue_visits")
        .select("venue_id")
        .eq("user_id", userId)
        .eq("relationship", "visited")
        .in("venue_id", venueIds);
      visitedVenues = new Set((visits || []).map((v) => v.venue_id as string));
    }
  }
  const userTags = hasEvent ? await fetchUserEventTags(supabase, userId) : new Set<string>();

  return lists
    .map((l) => {
      const items = itemsByList.get(l.id as string) ?? [];
      let visited = 0;
      if (l.list_type === "venue") visited = items.filter((i) => i.venue_id && visitedVenues.has(i.venue_id)).length;
      else if (l.list_type === "event") visited = items.filter((i) => i.event_tag && userTags.has(i.event_tag)).length;
      return { id: l.id as string, visited };
    })
    .filter((s) => s.visited > 0)
    .sort((a, b) => b.visited - a.visited)
    .slice(0, 2)
    .map((s) => s.id);
}

/** The two lists to pin on a profile: the user's manual pins win; otherwise
 *  their two most-completed lists. Shared by the own, in-app, and public
 *  profile pages so the choice can't drift between them. */
export async function resolvePinnedListIds(
  supabase: SupabaseClient,
  profile: Pick<ProfileData, "id" | "pinned_list_1_id" | "pinned_list_2_id">
): Promise<string[]> {
  const manualPins = [profile.pinned_list_1_id, profile.pinned_list_2_id].filter(Boolean) as string[];
  return manualPins.length > 0 ? manualPins : fetchAutoPinnedListIds(supabase, profile.id);
}

export type ProfileSummaryCounts = {
  totalVenues: number;
  venuesThisYear: number;
  totalEvents: number;
  eventsThisYear: number;
  createdLists: number;
  wantToVisit: number;
};

export async function fetchProfileSummaryCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileSummaryCounts> {
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01`;

  const [
    totalVenuesRes,
    totalEventsRes,
    eventsThisYearRes,
    createdListsRes,
    wantToVisitRes,
  ] = await Promise.all([
    // Total visited venues
    supabase
      .from("venue_visits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("relationship", "visited"),
    // Total event logs
    supabase
      .from("event_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    // Events this year
    supabase
      .from("event_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("event_date", yearStart),
    // User-created lists
    supabase
      .from("lists")
      .select("id", { count: "exact", head: true })
      .eq("source", "user")
      .eq("created_by", userId),
    // Want to visit
    supabase
      .from("venue_visits")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("relationship", "want_to_visit"),
  ]);

  // Distinct venues visited this year. This genuinely needs the venue_id set
  // (a head count would count games, not distinct venues), so page through the
  // rows rather than a single select that PostgREST would cap at 1000.
  const uniqueVenuesThisYear = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("event_logs")
      .select("venue_id")
      .eq("user_id", userId)
      .gte("event_date", yearStart)
      .range(from, from + 999);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const e of data) if (e.venue_id) uniqueVenuesThisYear.add(e.venue_id as string);
    if (data.length < 1000) break;
  }

  return {
    totalVenues: totalVenuesRes.count || 0,
    venuesThisYear: uniqueVenuesThisYear.size,
    totalEvents: totalEventsRes.count || 0,
    eventsThisYear: eventsThisYearRes.count || 0,
    createdLists: createdListsRes.count || 0,
    wantToVisit: wantToVisitRes.count || 0,
  };
}

export type TimelinePage = {
  entries: TimelineEntry[];
  hasMore: boolean;
};

export async function fetchTimeline(
  supabase: SupabaseClient,
  userId: string,
  leagueFilter?: string,
  limit = 20,
  offset = 0,
  monthFilter?: string, // YYYY-MM
  viewerId?: string | null // the logged-in viewer (null when logged out); owner sees everything
): Promise<TimelinePage> {
  const isOwner = !!viewerId && viewerId === userId;
  let query = supabase
    .from("event_logs")
    .select(
      `
      id, event_date, rating, notes, outcome, privacy, like_count, comment_count, seat_location, sport,
      photo_url, photo_is_verified,
      is_manual, manual_title, manual_description,
      event_id,
      venue_id,
      venues(name),
      leagues(slug, name),
      events!event_logs_event_id_fkey(
        home_score, away_score,
        home_team:teams!events_home_team_id_fkey(name, short_name, abbreviation, city),
        away_team:teams!events_away_team_id_fkey(name, short_name, abbreviation, city),
        tournament_name
      )
    `
    )
    .eq("user_id", userId)
    .order("event_date", { ascending: false })
    .range(offset, offset + limit);

  // Defense-in-depth: never return hide_all rows to a non-owner, even if RLS
  // were to regress (RLS is the primary guard; this is the second).
  if (!isOwner) query = query.neq("privacy", "hide_all");

  if (monthFilter && /^\d{4}-\d{2}$/.test(monthFilter)) {
    const [y, mo] = monthFilter.split("-").map(Number);
    const from = `${monthFilter}-01`;
    const to = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, "0")}-01`;
    query = query.gte("event_date", from).lt("event_date", to);
  }

  if (leagueFilter && leagueFilter !== "All") {
    // Look up league id by slug
    const { data: league } = await supabase
      .from("leagues")
      .select("id")
      .eq("slug", leagueFilter.toLowerCase())
      .single();
    if (league) {
      query = query.eq("league_id", league.id);
    }
  }

  const { data } = await query;

  if (!data) return { entries: [], hasMore: false };

  // If we got limit+1 rows, there are more pages
  const hasMore = data.length > limit;
  const pageData = hasMore ? data.slice(0, limit) : data;

  const entries = pageData.map((log) => {
    const venue = log.venues as unknown as { name: string } | null;
    const league = log.leagues as unknown as { slug: string; name: string } | null;
    const event = log.events as unknown as {
      home_score: number | null;
      away_score: number | null;
      home_team: { name: string; short_name: string; abbreviation: string; city: string | null } | null;
      away_team: { name: string; short_name: string; abbreviation: string; city: string | null } | null;
      tournament_name: string | null;
    } | null;

    let matchup: string | null = null;
    let homeTeamShort: string | null = event?.home_team?.short_name || null;
    let awayTeamShort: string | null = event?.away_team?.short_name || null;
    const homeTeamAbbr: string | null = event?.home_team?.abbreviation || null;
    const awayTeamAbbr: string | null = event?.away_team?.abbreviation || null;
    let homeScore: number | null = event?.home_score ?? null;
    let awayScore: number | null = event?.away_score ?? null;

    if (event?.home_team && event?.away_team) {
      const hs = event.home_score ?? "";
      const as_ = event.away_score ?? "";
      // Full team name so the matchup isn't ambiguous (shared nicknames).
      matchup = `${event.home_team.name} ${hs} — ${event.away_team.name} ${as_}`;
    } else if (event?.tournament_name) {
      matchup = event.tournament_name;
    }

    // For manual entries, try to construct matchup from manual_description
    if (log.is_manual && log.manual_description) {
      try {
        const manualTeams = JSON.parse(log.manual_description);
        if (manualTeams.home_team && manualTeams.away_team) {
          homeTeamShort = manualTeams.home_team;
          awayTeamShort = manualTeams.away_team;
          homeScore = manualTeams.home_score ?? null;
          awayScore = manualTeams.away_score ?? null;
          const hs = manualTeams.home_score ?? "";
          const as_ = manualTeams.away_score ?? "";
          matchup = `${manualTeams.home_team} ${hs} — ${manualTeams.away_team} ${as_}`;
        }
      } catch {
        // manual_description isn't JSON, ignore
      }
    }

    return redactTimelineEntry({
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
      home_team_short: homeTeamShort,
      home_team_abbr: homeTeamAbbr,
      away_team_abbr: awayTeamAbbr,
      away_team_short: awayTeamShort,
      home_score: homeScore,
      away_score: awayScore,
      sport: log.sport,
      photo_url: log.photo_url || null,
      photo_is_verified: log.photo_is_verified || false,
      is_manual: log.is_manual || false,
      manual_title: log.manual_title || null,
      manual_description: log.manual_description || null,
    }, isOwner);
  });

  return { entries, hasMore };
}
