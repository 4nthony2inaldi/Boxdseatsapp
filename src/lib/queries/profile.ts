import { SupabaseClient } from "@supabase/supabase-js";
import { getSportIconPath } from "@/lib/sportIcons";

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
};

export type ActivityMonth = {
  month: string;
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
  home_score: number | null;
  away_score: number | null;
  sport: string | null;
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

export async function fetchProfileStats(
  supabase: SupabaseClient,
  userId: string
): Promise<ProfileStats> {
  const [eventsRes, venuesRes, followersRes, followingRes, outcomesRes] =
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
        .select("outcome")
        .eq("user_id", userId)
        .not("outcome", "is", null),
    ]);

  const outcomes = outcomesRes.data || [];
  const wins = outcomes.filter((o) => o.outcome === "win").length;
  const losses = outcomes.filter((o) => o.outcome === "loss").length;
  const draws = outcomes.filter((o) => o.outcome === "draw").length;

  return {
    totalEvents: eventsRes.count || 0,
    totalVenues: venuesRes.count || 0,
    followers: followersRes.count || 0,
    following: followingRes.count || 0,
    wins,
    losses,
    draws,
  };
}

export async function fetchBigFour(
  supabase: SupabaseClient,
  profile: ProfileData
): Promise<BigFourItem[]> {
  const items: BigFourItem[] = [];

  // Fetch team
  if (profile.fav_team_id) {
    const { data } = await supabase
      .from("teams")
      .select("name, short_name, leagues(name)")
      .eq("id", profile.fav_team_id)
      .single();
    if (data) {
      const league = (data.leagues as unknown as { name: string } | null)?.name || "";
      items.push({
        category: "team",
        name: data.short_name || data.name,
        subtitle: league,
      });
    }
  } else {
    items.push({ category: "team", name: "Not set", subtitle: "" });
  }

  // Fetch venue
  if (profile.fav_venue_id) {
    const { data } = await supabase
      .from("venues")
      .select("name, city, state")
      .eq("id", profile.fav_venue_id)
      .single();
    if (data) {
      items.push({
        category: "venue",
        name: data.name,
        subtitle: `${data.city}${data.state ? `, ${data.state}` : ""}`,
      });
    }
  } else {
    items.push({ category: "venue", name: "Not set", subtitle: "" });
  }

  // Fetch athlete
  if (profile.fav_athlete_id) {
    const { data } = await supabase
      .from("athletes")
      .select("name, sport")
      .eq("id", profile.fav_athlete_id)
      .single();
    if (data) {
      items.push({
        category: "athlete",
        name: data.name,
        subtitle: data.sport || "",
      });
    }
  } else {
    items.push({ category: "athlete", name: "Not set", subtitle: "" });
  }

  // Fetch event
  if (profile.fav_event_id) {
    const { data } = await supabase
      .from("events")
      .select(
        "event_date, home_team:teams!events_home_team_id_fkey(short_name, abbreviation), away_team:teams!events_away_team_id_fkey(short_name, abbreviation), tournament_name, venues(name)"
      )
      .eq("id", profile.fav_event_id)
      .single();
    if (data) {
      const home = (data.home_team as unknown as { short_name: string; abbreviation: string } | null);
      const away = (data.away_team as unknown as { short_name: string; abbreviation: string } | null);
      const venue = (data.venues as unknown as { name: string } | null)?.name || "";
      const d = new Date(data.event_date + "T00:00:00");
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`;
      const homeAbbr = home?.abbreviation || home?.short_name;
      const awayAbbr = away?.abbreviation || away?.short_name;
      const name =
        homeAbbr && awayAbbr
          ? `${awayAbbr} @ ${homeAbbr} ${dateStr}`
          : data.tournament_name || "Event";
      items.push({
        category: "event",
        name,
        subtitle: venue,
      });
    }
  } else {
    items.push({ category: "event", name: "Not set", subtitle: "" });
  }

  return items;
}

export async function fetchActivityChart(
  supabase: SupabaseClient,
  userId: string
): Promise<{ months: ActivityMonth[]; total: number }> {
  const now = new Date();
  const months: ActivityMonth[] = [];

  // Build last 12 months
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthLabel = d.toLocaleString("en-US", { month: "short" });
    months.push({ month: monthLabel, count: 0 });
  }

  // Query event_logs for last 12 months
  const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const startStr = startDate.toISOString().split("T")[0];

  const { data } = await supabase
    .from("event_logs")
    .select("event_date")
    .eq("user_id", userId)
    .gte("event_date", startStr)
    .order("event_date", { ascending: true });

  if (data) {
    for (const log of data) {
      const logDate = new Date(log.event_date);
      const monthDiff =
        (now.getFullYear() - logDate.getFullYear()) * 12 +
        (now.getMonth() - logDate.getMonth());
      const index = 11 - monthDiff;
      if (index >= 0 && index < 12) {
        months[index].count++;
      }
    }
  }

  const total = months.reduce((sum, m) => sum + m.count, 0);
  return { months, total };
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

  const result: PinnedListData[] = [];

  for (const list of lists) {
    let visited = 0;

    if (list.list_type === "venue") {
      // Count venue list items the user has visited
      const { data: listItems } = await supabase
        .from("list_items")
        .select("venue_id")
        .eq("list_id", list.id)
        .not("venue_id", "is", null);

      if (listItems && listItems.length > 0) {
        const venueIds = listItems.map((li) => li.venue_id).filter(Boolean);
        const { count } = await supabase
          .from("venue_visits")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("relationship", "visited")
          .in("venue_id", venueIds);
        visited = count || 0;
      }
    } else if (list.list_type === "event") {
      // Count event list items the user has logged
      const { data: listItems } = await supabase
        .from("list_items")
        .select("event_tag")
        .eq("list_id", list.id)
        .not("event_tag", "is", null);

      if (listItems && listItems.length > 0) {
        const tags = listItems.map((li) => li.event_tag).filter(Boolean);
        // Check user's event_logs for events with matching tags
        const { data: userEvents } = await supabase
          .from("event_logs")
          .select("event_id, events!inner(event_tags)")
          .eq("user_id", userId)
          .not("event_id", "is", null);

        if (userEvents) {
          for (const ue of userEvents) {
            const eventTags = (ue.events as unknown as { event_tags: string[] | null })
              ?.event_tags;
            if (eventTags && tags.some((t) => eventTags.includes(t!))) {
              visited++;
            }
          }
        }
      }
    }

    result.push({
      id: list.id,
      name: list.name,
      icon: getSportIconPath(list.sport) || "",
      list_type: list.list_type,
      sport: list.sport,
      item_count: list.item_count,
      visited,
    });
  }

  return result;
}

export async function fetchTimeline(
  supabase: SupabaseClient,
  userId: string,
  leagueFilter?: string
): Promise<TimelineEntry[]> {
  let query = supabase
    .from("event_logs")
    .select(
      `
      id, event_date, rating, notes, outcome, privacy, like_count, comment_count, seat_location, sport,
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
    .eq("user_id", userId)
    .order("event_date", { ascending: false })
    .limit(50);

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
    };
  });
}
