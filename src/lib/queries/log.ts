import { SupabaseClient } from "@supabase/supabase-js";
import { getSportIconPath } from "@/lib/sportIcons";
import { checkAndAwardBadges, type BadgeData } from "@/lib/queries/badges";

// ── Types ──

export type VenueResult = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  visit_count: number;
  sport_icon: string | null;
};

export type EventMatch = {
  id: string;
  event_date: string;
  league_id: string;
  league_name: string;
  league_slug: string;
  sport: string;
  sport_icon: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_short: string | null;
  away_team_short: string | null;
  home_score: number | null;
  away_score: number | null;
  tournament_name: string | null;
  tournament_id: string | null;
  day_number: number | null;
  round_or_stage: string | null;
  event_template: string;
  start_time: string | null;
};

export type CompanionInput = {
  tagged_user_id: string | null;
  display_name: string;
};

export type ManualTeamScore = {
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
};

export type EventLogInsert = {
  user_id: string;
  event_id: string | null;
  venue_id: string;
  event_date: string;
  league_id: string | null;
  sport: string | null;
  rating: number | null;
  notes: string | null;
  seat_location: string | null;
  privacy: "show_all" | "hide_personal" | "hide_all";
  rooting_team_id: string | null;
  is_neutral: boolean;
  outcome: "win" | "loss" | "draw" | "neutral" | null;
  is_manual: boolean;
  manual_title: string | null;
  manual_description: string | null;
  manual_teams?: ManualTeamScore | null;
  companions: CompanionInput[];
};

// ── Sport icon helper ──
const sportIcon = (sport: string | null | undefined): string | null =>
  getSportIconPath(sport);

// ── Venue Search ──

/**
 * Fetch recently visited and most-visited venues for the current user.
 * Returns venues the user has logged events at, sorted by visit count desc.
 */
export async function fetchUserVenues(
  supabase: SupabaseClient,
  userId: string
): Promise<VenueResult[]> {
  // Get all venue IDs the user has event logs for, with counts
  const { data: logs } = await supabase
    .from("event_logs")
    .select("venue_id, sport")
    .eq("user_id", userId);

  if (!logs || logs.length === 0) return [];

  // Count visits per venue
  const venueCounts: Record<string, { count: number; sport: string | null }> = {};
  for (const log of logs) {
    if (!venueCounts[log.venue_id]) {
      venueCounts[log.venue_id] = { count: 0, sport: log.sport };
    }
    venueCounts[log.venue_id].count++;
  }

  const venueIds = Object.keys(venueCounts);

  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, city, state")
    .in("id", venueIds);

  if (!venues) return [];

  return venues
    .map((v) => ({
      id: v.id,
      name: v.name,
      city: v.city,
      state: v.state,
      visit_count: venueCounts[v.id]?.count || 0,
      sport_icon: sportIcon(venueCounts[v.id]?.sport),
    }))
    .sort((a, b) => b.visit_count - a.visit_count);
}

/**
 * Search venues by name using trigram/ilike.
 * Returns matching venues with visit count for the user.
 */
export async function searchVenues(
  supabase: SupabaseClient,
  query: string,
  userId: string
): Promise<VenueResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, city, state")
    .ilike("name", `%${trimmed}%`)
    .eq("status", "active")
    .order("name")
    .limit(20);

  if (!venues || venues.length === 0) return [];

  // Get user's visit counts for these venues
  const venueIds = venues.map((v) => v.id);
  const { data: logs } = await supabase
    .from("event_logs")
    .select("venue_id")
    .eq("user_id", userId)
    .in("venue_id", venueIds);

  const venueCounts: Record<string, number> = {};
  if (logs) {
    for (const log of logs) {
      venueCounts[log.venue_id] = (venueCounts[log.venue_id] || 0) + 1;
    }
  }

  // Look up sport for each venue via venue_teams → teams → leagues
  const { data: venueTeams } = await supabase
    .from("venue_teams")
    .select("venue_id, teams(leagues(sport))")
    .in("venue_id", venueIds)
    .eq("is_primary", true);

  const venueSport: Record<string, string | null> = {};
  if (venueTeams) {
    for (const vt of venueTeams) {
      if (!venueSport[vt.venue_id]) {
        const team = vt.teams as unknown as {
          leagues: { sport: string } | null;
        } | null;
        venueSport[vt.venue_id] = team?.leagues?.sport || null;
      }
    }
  }

  return venues.map((v) => ({
    id: v.id,
    name: v.name,
    city: v.city,
    state: v.state,
    visit_count: venueCounts[v.id] || 0,
    sport_icon: sportIcon(venueSport[v.id] || null),
  }));
}

// ── Event Dates for a Venue ──

/**
 * Fetch all event dates for a given venue.
 * Returns a Set of YYYY-MM-DD strings for fast lookup in the calendar.
 */
export async function fetchEventDatesForVenue(
  supabase: SupabaseClient,
  venueId: string
): Promise<Set<string>> {
  const { data } = await supabase
    .from("events")
    .select("event_date")
    .eq("venue_id", venueId)
    .order("event_date", { ascending: false });

  if (!data) return new Set();

  return new Set(data.map((e) => e.event_date));
}

// ── Event Matching ──

/**
 * Find events at a given venue on or near a given date.
 * Searches the exact date first, then +/- 1 day as fallback (for timezone issues).
 */
export async function findEventsAtVenueOnDate(
  supabase: SupabaseClient,
  venueId: string,
  date: string // YYYY-MM-DD
): Promise<EventMatch[]> {
  // First try exact date
  let { data } = await supabase
    .from("events")
    .select(
      `
      id, event_date, league_id, event_template, round_or_stage,
      home_team_id, away_team_id, home_score, away_score,
      tournament_name, tournament_id, day_number,
      leagues(name, slug, sport),
      home_team:teams!events_home_team_id_fkey(short_name),
      away_team:teams!events_away_team_id_fkey(short_name)
    `
    )
    .eq("venue_id", venueId)
    .eq("event_date", date)
    .order("event_date", { ascending: true });

  // If no results, try +/- 1 day
  if (!data || data.length === 0) {
    const dateObj = new Date(date + "T00:00:00");
    const prevDay = new Date(dateObj);
    prevDay.setDate(prevDay.getDate() - 1);
    const nextDay = new Date(dateObj);
    nextDay.setDate(nextDay.getDate() + 1);

    const prevStr = prevDay.toISOString().split("T")[0];
    const nextStr = nextDay.toISOString().split("T")[0];

    const { data: nearby } = await supabase
      .from("events")
      .select(
        `
        id, event_date, league_id, event_template, round_or_stage,
        home_team_id, away_team_id, home_score, away_score,
        tournament_name, tournament_id, day_number,
        leagues(name, slug, sport),
        home_team:teams!events_home_team_id_fkey(short_name),
        away_team:teams!events_away_team_id_fkey(short_name)
      `
      )
      .eq("venue_id", venueId)
      .gte("event_date", prevStr)
      .lte("event_date", nextStr)
      .order("event_date", { ascending: true });

    data = nearby;
  }

  if (!data) return [];

  return data.map((e) => {
    const league = e.leagues as unknown as {
      name: string;
      slug: string;
      sport: string;
    } | null;
    const homeTeam = e.home_team as unknown as { short_name: string } | null;
    const awayTeam = e.away_team as unknown as { short_name: string } | null;

    return {
      id: e.id,
      event_date: e.event_date,
      league_id: e.league_id,
      league_name: league?.name || "",
      league_slug: league?.slug || "",
      sport: league?.sport || "",
      sport_icon: sportIcon(league?.sport),
      home_team_id: e.home_team_id,
      away_team_id: e.away_team_id,
      home_team_short: homeTeam?.short_name || null,
      away_team_short: awayTeam?.short_name || null,
      home_score: e.home_score,
      away_score: e.away_score,
      tournament_name: e.tournament_name,
      tournament_id: e.tournament_id || null,
      day_number: e.day_number || null,
      round_or_stage: e.round_or_stage,
      event_template: e.event_template,
      start_time: null,
    };
  });
}

// ── Fetch all days of a multi-day tournament ──

/**
 * Given a tournament_id, fetch all event rows that share this tournament.
 * Returns them ordered by day_number (or event_date if day_number is null).
 * Used in Step 3 to let users pick which day(s) they attended.
 */
export async function fetchTournamentDays(
  supabase: SupabaseClient,
  tournamentId: string
): Promise<EventMatch[]> {
  const { data } = await supabase
    .from("events")
    .select(
      `
      id, event_date, league_id, event_template, round_or_stage,
      home_team_id, away_team_id, home_score, away_score,
      tournament_name, tournament_id, day_number,
      leagues(name, slug, sport),
      home_team:teams!events_home_team_id_fkey(short_name),
      away_team:teams!events_away_team_id_fkey(short_name)
    `
    )
    .eq("tournament_id", tournamentId)
    .order("day_number", { ascending: true })
    .order("event_date", { ascending: true });

  if (!data) return [];

  return data.map((e) => {
    const league = e.leagues as unknown as {
      name: string;
      slug: string;
      sport: string;
    } | null;
    const homeTeam = e.home_team as unknown as { short_name: string } | null;
    const awayTeam = e.away_team as unknown as { short_name: string } | null;

    return {
      id: e.id,
      event_date: e.event_date,
      league_id: e.league_id,
      league_name: league?.name || "",
      league_slug: league?.slug || "",
      sport: league?.sport || "",
      sport_icon: sportIcon(league?.sport),
      home_team_id: e.home_team_id,
      away_team_id: e.away_team_id,
      home_team_short: homeTeam?.short_name || null,
      away_team_short: awayTeam?.short_name || null,
      home_score: e.home_score,
      away_score: e.away_score,
      tournament_name: e.tournament_name,
      tournament_id: e.tournament_id || null,
      day_number: e.day_number || null,
      round_or_stage: e.round_or_stage,
      event_template: e.event_template,
      start_time: null,
    };
  });
}

// ── Outcome Computation ──

function computeOutcome(
  event: EventMatch | null,
  rootingTeamId: string | null,
  isNeutral: boolean
): "win" | "loss" | "draw" | "neutral" | null {
  if (isNeutral || !rootingTeamId || !event) return isNeutral ? "neutral" : null;
  if (event.home_score === null || event.away_score === null) return null;

  const rootedHome = rootingTeamId === event.home_team_id;
  const rootedAway = rootingTeamId === event.away_team_id;

  if (!rootedHome && !rootedAway) return "neutral";

  if (event.home_score === event.away_score) return "draw";

  if (rootedHome) {
    return event.home_score > event.away_score ? "win" : "loss";
  } else {
    return event.away_score > event.home_score ? "win" : "loss";
  }
}

// ── User-Friendly Error Messages ──

function friendlyError(message: string): string {
  if (message.includes("idx_event_logs_no_duplicates") || message.includes("duplicate key")) {
    return "You've already logged this event. Each event can only be logged once.";
  }
  if (message.includes("violates foreign key constraint")) {
    return "Something went wrong — one of the selected items no longer exists. Please go back and try again.";
  }
  if (message.includes("violates check constraint") && message.includes("rating")) {
    return "Rating must be between 1 and 5.";
  }
  if (message.includes("violates row-level security") || message.includes("new row violates row-level security")) {
    return "You don't have permission to perform this action. Please log in again.";
  }
  if (message.includes("JWT expired") || message.includes("not authenticated")) {
    return "Your session has expired. Please log in again.";
  }
  // Fallback — still avoid raw Postgres jargon
  return "Something went wrong while saving. Please try again.";
}

// ── Save Event Log ──

/**
 * Insert an event log with all denormalized fields.
 * Also inserts companion tags and upserts venue_visits.
 * Returns the new event log ID.
 */
export async function saveEventLog(
  supabase: SupabaseClient,
  input: EventLogInsert,
  selectedEvent: EventMatch | null
): Promise<{ id: string; newBadges?: BadgeData[] } | { error: string }> {
  const outcome = computeOutcome(
    selectedEvent,
    input.rooting_team_id,
    input.is_neutral
  );

  const { data: inserted, error } = await supabase
    .from("event_logs")
    .insert({
      user_id: input.user_id,
      event_id: input.event_id,
      venue_id: input.venue_id,
      event_date: input.event_date,
      league_id: input.league_id,
      sport: input.sport,
      rating: input.rating,
      notes: input.notes || null,
      seat_location: input.seat_location || null,
      privacy: input.privacy,
      rooting_team_id: input.rooting_team_id,
      is_neutral: input.is_neutral,
      outcome,
      is_manual: input.is_manual,
      manual_title: input.manual_title,
      manual_description: input.manual_description,
    })
    .select("id")
    .single();

  if (error) {
    return { error: friendlyError(error.message) };
  }

  // Insert companion tags
  if (input.companions.length > 0 && inserted) {
    const companionRows = input.companions.map((c) => ({
      event_log_id: inserted.id,
      tagged_user_id: c.tagged_user_id,
      display_name: c.display_name,
    }));

    await supabase.from("companion_tags").insert(companionRows);
  }

  // venue_visits upsert is handled by the auto_visit_venue trigger

  // Check if any lists are now complete → award badges
  const newBadges = await checkAndAwardBadges(supabase, input.user_id);

  return { id: inserted.id, newBadges: newBadges.length > 0 ? newBadges : undefined };
}

// ── Fetch Event Log for Editing ──

export type EditableEventLog = {
  id: string;
  user_id: string;
  event_id: string | null;
  venue_id: string;
  event_date: string;
  league_id: string | null;
  sport: string | null;
  rating: number | null;
  notes: string | null;
  seat_location: string | null;
  privacy: "show_all" | "hide_personal" | "hide_all";
  rooting_team_id: string | null;
  is_neutral: boolean;
  outcome: "win" | "loss" | "draw" | "neutral" | null;
  is_manual: boolean;
  manual_title: string | null;
  manual_description: string | null;
  venue: VenueResult;
  event: EventMatch | null;
  companions: CompanionInput[];
};

/**
 * Fetch a single event log with venue, event, and companion data for editing.
 * Only returns the log if it belongs to the given user.
 */
export async function fetchEventLogForEdit(
  supabase: SupabaseClient,
  logId: string,
  userId: string
): Promise<EditableEventLog | null> {
  const { data: log } = await supabase
    .from("event_logs")
    .select(
      `
      id, user_id, event_id, venue_id, event_date, league_id, sport,
      rating, notes, seat_location, privacy, rooting_team_id, is_neutral,
      outcome, is_manual, manual_title, manual_description
    `
    )
    .eq("id", logId)
    .eq("user_id", userId)
    .single();

  if (!log) return null;

  // Fetch venue
  const { data: venue } = await supabase
    .from("venues")
    .select("id, name, city, state")
    .eq("id", log.venue_id)
    .single();

  if (!venue) return null;

  // Fetch event if linked
  let event: EventMatch | null = null;
  if (log.event_id) {
    const { data: eventData } = await supabase
      .from("events")
      .select(
        `
        id, event_date, league_id, event_template, round_or_stage,
        home_team_id, away_team_id, home_score, away_score,
        tournament_name, tournament_id, day_number,
        leagues(name, slug, sport),
        home_team:teams!events_home_team_id_fkey(short_name),
        away_team:teams!events_away_team_id_fkey(short_name)
      `
      )
      .eq("id", log.event_id)
      .single();

    if (eventData) {
      const league = eventData.leagues as unknown as {
        name: string;
        slug: string;
        sport: string;
      } | null;
      const homeTeam = eventData.home_team as unknown as {
        short_name: string;
      } | null;
      const awayTeam = eventData.away_team as unknown as {
        short_name: string;
      } | null;

      event = {
        id: eventData.id,
        event_date: eventData.event_date,
        league_id: eventData.league_id,
        league_name: league?.name || "",
        league_slug: league?.slug || "",
        sport: league?.sport || "",
        sport_icon: sportIcon(league?.sport),
        home_team_id: eventData.home_team_id,
        away_team_id: eventData.away_team_id,
        home_team_short: homeTeam?.short_name || null,
        away_team_short: awayTeam?.short_name || null,
        home_score: eventData.home_score,
        away_score: eventData.away_score,
        tournament_name: eventData.tournament_name,
        tournament_id: eventData.tournament_id || null,
        day_number: eventData.day_number || null,
        round_or_stage: eventData.round_or_stage,
        event_template: eventData.event_template,
        start_time: null,
      };
    }
  }

  // Fetch companions
  const { data: companionRows } = await supabase
    .from("companion_tags")
    .select("tagged_user_id, display_name")
    .eq("event_log_id", log.id);

  const companions: CompanionInput[] = (companionRows || []).map((c) => ({
    tagged_user_id: c.tagged_user_id,
    display_name: c.display_name,
  }));

  return {
    ...log,
    venue: {
      id: venue.id,
      name: venue.name,
      city: venue.city,
      state: venue.state,
      visit_count: 0,
      sport_icon: sportIcon(log.sport),
    },
    event,
    companions,
  };
}

// ── Update Event Log ──

/**
 * Update an existing event log. Replaces companion tags.
 */
export async function updateEventLog(
  supabase: SupabaseClient,
  logId: string,
  input: EventLogInsert,
  selectedEvent: EventMatch | null
): Promise<{ id: string } | { error: string }> {
  const outcome = computeOutcome(
    selectedEvent,
    input.rooting_team_id,
    input.is_neutral
  );

  const { error } = await supabase
    .from("event_logs")
    .update({
      event_id: input.event_id,
      venue_id: input.venue_id,
      event_date: input.event_date,
      league_id: input.league_id,
      sport: input.sport,
      rating: input.rating,
      notes: input.notes || null,
      seat_location: input.seat_location || null,
      privacy: input.privacy,
      rooting_team_id: input.rooting_team_id,
      is_neutral: input.is_neutral,
      outcome,
      is_manual: input.is_manual,
      manual_title: input.manual_title,
      manual_description: input.manual_description,
    })
    .eq("id", logId)
    .eq("user_id", input.user_id);

  if (error) {
    return { error: friendlyError(error.message) };
  }

  // Replace companion tags: delete old, insert new
  await supabase.from("companion_tags").delete().eq("event_log_id", logId);

  if (input.companions.length > 0) {
    const companionRows = input.companions.map((c) => ({
      event_log_id: logId,
      tagged_user_id: c.tagged_user_id,
      display_name: c.display_name,
    }));
    await supabase.from("companion_tags").insert(companionRows);
  }

  return { id: logId };
}

// ── User Search (for companion tagging) ──

export type UserSearchResult = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export async function searchUsers(
  supabase: SupabaseClient,
  query: string,
  excludeUserId: string
): Promise<UserSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
    .neq("id", excludeUserId)
    .limit(10);

  return (data as UserSearchResult[]) || [];
}
