import { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeSearchTerm } from "./searchSanitize";

// ── Username validation ──

export async function checkUsernameAvailable(
  supabase: SupabaseClient,
  username: string,
  currentUserId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username.toLowerCase().trim())
    .neq("id", currentUserId)
    .maybeSingle();

  return !data;
}

// ── Profile update for onboarding step 1 ──

export async function updateProfileSetup(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    username?: string;
    display_name?: string;
    avatar_url?: string;
    home_city?: string;
  }
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") return { error: "Username already taken." };
    return { error: "Failed to update profile." };
  }
  return { success: true };
}

// ── Big Four + Sport badge update (step 2) ──

export async function updateBigFourAndSport(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    fav_sport?: string | null;
    fav_team_id?: string | null;
    fav_venue_id?: string | null;
    fav_athlete_id?: string | null;
    fav_event_id?: string | null;
  }
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId);

  if (error) return { error: "Failed to update favorites." };
  return { success: true };
}

// ── Search functions for Big Four autocomplete ──

export async function searchTeams(
  supabase: SupabaseClient,
  query: string,
  limit = 10,
  leagueSlug?: string | null
): Promise<{ id: string; name: string; short_name: string; league_name: string | null }[]> {
  const raw = sanitizeSearchTerm(query);
  if (!raw) return [];
  const pattern = `%${raw}%`;
  // Pull a wider pool than we return, then rank — with full D1 membership a
  // league can have hundreds of teams and an unranked LIMIT can drop the
  // obvious match (e.g. shared mascots like "Bulldogs").
  let q = supabase
    .from("teams")
    .select("id, name, short_name, leagues!inner(name, slug)")
    .or(`name.ilike.${pattern},short_name.ilike.${pattern}`)
    .limit(Math.max(limit * 6, 60));
  if (leagueSlug) q = q.eq("leagues.slug", leagueSlug);
  const { data } = await q;
  if (!data) return [];

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const nq = norm(raw);
  const score = (name: string, short: string): number => {
    const n = norm(name), s = norm(short);
    if (n === nq || s === nq) return 0;
    if (n.startsWith(nq) || s.startsWith(nq)) return 1;
    if (n.split(/\s+/).some((w) => w.startsWith(nq)) || s.split(/\s+/).some((w) => w.startsWith(nq))) return 2;
    return 3;
  };

  return [...data]
    .sort((a, b) => score(a.name, a.short_name) - score(b.name, b.short_name) || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map((t) => {
      const league = t.leagues as unknown as { name: string } | null;
      return { id: t.id, name: t.name, short_name: t.short_name, league_name: league?.name || null };
    });
}

export async function searchVenuesForOnboarding(
  supabase: SupabaseClient,
  query: string,
  opts: { sport?: string | null; limit?: number } = {}
): Promise<{ id: string; name: string; city: string; state: string | null; sport: string | null }[]> {
  const { sport, limit = 30 } = opts;
  const trimmed = sanitizeSearchTerm(query);
  // Nothing to show until the user types or picks a sport to browse.
  if (!trimmed && !sport) return [];

  // Match former/alternate names too (e.g. "Staples Center" -> Crypto.com
  // Arena), so a venue logged under an outdated name is still findable.
  let aliasIds: string[] = [];
  if (trimmed) {
    const { data: aliasRows } = await supabase
      .from("venue_aliases")
      .select("venue_id")
      .ilike("alias_name", `%${trimmed}%`)
      .limit(limit);
    aliasIds = [...new Set((aliasRows || []).map((a) => a.venue_id as string))];
  }

  let q = supabase
    .from("venues")
    .select("id, name, city, state, primary_sport")
    .eq("status", "active");
  if (sport) q = q.eq("primary_sport", sport);
  if (trimmed) {
    const ors = [`name.ilike.%${trimmed}%`, `city.ilike.%${trimmed}%`];
    if (aliasIds.length) ors.push(`id.in.(${aliasIds.join(",")})`);
    q = q.or(ors.join(","));
  }

  const { data } = await q.order("name").limit(limit);
  return (data || []).map((v) => ({
    id: v.id,
    name: v.name,
    city: v.city,
    state: v.state,
    sport: v.primary_sport ?? null,
  }));
}

export async function searchAthletes(
  supabase: SupabaseClient,
  query: string,
  limit = 10,
  sport?: string | null
): Promise<{ id: string; name: string; sport: string | null }[]> {
  const raw = query.trim();
  if (!raw) return [];
  const pattern = `%${raw}%`;
  // Pull a wider candidate pool than we return so ranking can surface the best
  // match — with thousands of athletes (incl. retired legends who share common
  // names, e.g. dozens of "Jordan"s) an unranked LIMIT would drop the obvious
  // pick before we ever see it.
  let q = supabase
    .from("athletes")
    .select("id, name, sport")
    .ilike("name", pattern)
    .limit(Math.max(limit * 6, 60));
  if (sport) q = q.eq("sport", sport);
  const { data } = await q;
  if (!data) return [];

  const norm = (s: string) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
  const nq = norm(raw);

  // Lower score = better: exact name, then prefix of the whole name, then a
  // later word starting with the query (e.g. "Michael Jordan" for "jordan"),
  // then any substring. Ties break on shorter (more exact) names.
  const score = (name: string): number => {
    const nn = norm(name);
    if (nn === nq) return 0;
    if (nn.startsWith(nq)) return 1;
    if (nn.split(/\s+/).some((w) => w.startsWith(nq))) return 2;
    return 3;
  };

  return [...data]
    .sort((a, b) => score(a.name) - score(b.name) || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/**
 * Onboarding "best game": log the event for this user (seeds their timeline +
 * venue count via the auto_visit_venue trigger) and, when `feature` is true,
 * set it as the Big Four event. Idempotent on (user, event). The first pick
 * features; later "log another" picks pass feature=false so they don't steal
 * the headliner.
 */
export async function logAndFeatureBestGame(
  supabase: SupabaseClient,
  userId: string,
  eventId: string,
  feature = true
): Promise<{ success: boolean } | { error: string }> {
  const { data: event } = await supabase
    .from("events")
    .select("venue_id, league_id, event_date, leagues(sport)")
    .eq("id", eventId)
    .single();
  if (!event) return { error: "Couldn't find that game. Try another." };
  const sport = (event.leagues as unknown as { sport: string } | null)?.sport ?? null;

  const { data: existing } = await supabase
    .from("event_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase.from("event_logs").insert({
      user_id: userId,
      event_id: eventId,
      venue_id: event.venue_id,
      league_id: event.league_id,
      sport,
      event_date: event.event_date,
      privacy: "show_all",
      is_neutral: true,
      outcome: "neutral",
    });
    if (error) return { error: "Couldn't log that game. Please try again." };
  }

  if (feature) {
    const { error: favErr } = await supabase
      .from("profiles")
      .update({ fav_event_id: eventId })
      .eq("id", userId);
    if (favErr) return { error: "Couldn't feature that game. Please try again." };
  }
  return { success: true };
}

export async function searchEvents(
  supabase: SupabaseClient,
  query: string,
  limit = 12
): Promise<{ id: string; label: string; venue_name: string | null; event_date: string }[]> {
  const trimmed = sanitizeSearchTerm(query);
  if (!trimmed) return [];
  const pattern = `%${trimmed}%`;
  const today = new Date().toISOString().slice(0, 10);

  // Resolve the query to matching teams + venues first, then find games for
  // them — far more reliable than scanning a window of recent rows.
  const [teamsRes, venuesRes] = await Promise.all([
    supabase
      .from("teams")
      .select("id")
      .or(`name.ilike.${pattern},short_name.ilike.${pattern},abbreviation.ilike.${pattern}`)
      .limit(20),
    supabase.from("venues").select("id").ilike("name", pattern).limit(15),
  ]);
  const teamIds = (teamsRes.data || []).map((t) => t.id);
  const venueIds = (venuesRes.data || []).map((v) => v.id);

  const ors = [`tournament_name.ilike.${pattern}`];
  if (teamIds.length) {
    ors.push(`home_team_id.in.(${teamIds.join(",")})`, `away_team_id.in.(${teamIds.join(",")})`);
  }
  if (venueIds.length) ors.push(`venue_id.in.(${venueIds.join(",")})`);

  const { data } = await supabase
    .from("events")
    .select(
      `id, event_date, tournament_name,
       home_team:teams!events_home_team_id_fkey(short_name),
       away_team:teams!events_away_team_id_fkey(short_name),
       venues!events_venue_id_fkey(name)`
    )
    .or(ors.join(","))
    .lte("event_date", today) // you can't have attended a future game
    .order("event_date", { ascending: false })
    .limit(limit);

  return (data || []).map((e) => {
    const home = e.home_team as unknown as { short_name: string } | null;
    const away = e.away_team as unknown as { short_name: string } | null;
    const venue = e.venues as unknown as { name: string } | null;
    const label =
      home && away
        ? `${away.short_name} @ ${home.short_name}`
        : e.tournament_name || "Event";
    return {
      id: e.id,
      label,
      venue_name: venue?.name || null,
      event_date: e.event_date,
    };
  });
}

// ── Fetch all venues for step 3 (mark venues) ──

export async function fetchAllVenues(
  supabase: SupabaseClient
): Promise<{ id: string; name: string; city: string; state: string | null; sport: string | null }[]> {
  const { data } = await supabase
    .from("venues")
    .select("id, name, city, state, primary_sport")
    .eq("status", "active")
    .order("name");

  return (data || []).map((v) => ({
    id: v.id,
    name: v.name,
    city: v.city,
    state: v.state,
    sport: v.primary_sport,
  }));
}

// ── Bulk mark venues as visited (step 3) ──

export async function markVenuesVisited(
  supabase: SupabaseClient,
  userId: string,
  venueIds: string[]
): Promise<{ success: boolean } | { error: string }> {
  if (venueIds.length === 0) return { success: true };

  const rows = venueIds.map((venueId) => ({
    user_id: userId,
    venue_id: venueId,
    relationship: "visited" as const,
  }));

  const { error } = await supabase
    .from("venue_visits")
    .upsert(rows, { onConflict: "user_id,venue_id" });

  if (error) return { error: "Failed to mark venues." };
  return { success: true };
}

/**
 * Finishing touches when onboarding completes:
 *  - derive the avatar's sport badge from the #1 team's league,
 *  - mark every favorited venue as visited so the venue total reflects it,
 *  - auto-feature a home venue when none was chosen (the scan-first path skips
 *    the manual venue step), so the Big Four venue slot isn't left empty.
 */
export async function finalizeOnboardingExtras(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { data: topTeam } = await supabase
    .from("user_league_favorites")
    .select("leagues(sport)")
    .eq("user_id", userId)
    .eq("category", "team")
    .order("rank", { ascending: true })
    .limit(1)
    .maybeSingle();
  const sport = (topTeam?.leagues as unknown as { sport: string } | null)?.sport;
  if (sport) {
    await supabase.from("profiles").update({ fav_sport: sport }).eq("id", userId);
  }

  const { data: venues } = await supabase
    .from("user_league_favorites")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("category", "venue")
    .not("venue_id", "is", null);
  const ids = (venues || []).map((v) => v.venue_id as string).filter(Boolean);
  if (ids.length > 0) await markVenuesVisited(supabase, userId, ids);

  await autoFeatureVenue(supabase, userId, ids.length > 0);
}

/**
 * Set a featured venue from the user's activity when they haven't picked one.
 * The scan-first path never reaches the manual venue step, so without this the
 * Big Four venue slot would sit empty alongside the (intentionally empty) event
 * slot. Prefer the venue with the most logged games, else any visited venue.
 */
async function autoFeatureVenue(
  supabase: SupabaseClient,
  userId: string,
  hasRankedVenue: boolean
): Promise<void> {
  // A ranked venue favorite already feeds the slot — don't override it.
  if (hasRankedVenue) return;
  const { data: profile } = await supabase
    .from("profiles")
    .select("fav_venue_id")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.fav_venue_id) return;

  let chosen: string | null = null;
  const { data: logs } = await supabase
    .from("event_logs")
    .select("venue_id")
    .eq("user_id", userId)
    .not("venue_id", "is", null)
    .limit(1000);
  if (logs?.length) {
    const counts = new Map<string, number>();
    for (const l of logs) {
      const v = l.venue_id as string;
      counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    chosen = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  if (!chosen) {
    const { data: visited } = await supabase
      .from("venue_visits")
      .select("venue_id")
      .eq("user_id", userId)
      .eq("relationship", "visited")
      .limit(1)
      .maybeSingle();
    chosen = (visited?.venue_id as string) ?? null;
  }
  if (chosen) {
    await supabase.from("profiles").update({ fav_venue_id: chosen }).eq("id", userId);
  }
}

// ── Mark onboarding complete ──

export async function completeOnboarding(
  supabase: SupabaseClient
): Promise<void> {
  // We use the presence of display_name or fav_sport as indicators
  // that onboarding has been done, but also set a metadata flag
  await supabase.auth.updateUser({
    data: { onboarding_completed: true },
  });
}

// ── Check if onboarding is needed ──

export async function checkOnboardingNeeded(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  // If user has already completed onboarding via metadata flag
  if (user.user_metadata?.onboarding_completed) return false;

  // Check if profile has been set up (fav_sport or display_name)
  const { data: profile } = await supabase
    .from("profiles")
    .select("fav_sport, display_name, bio")
    .eq("id", userId)
    .single();

  if (!profile) return true;

  // If they have a fav_sport set, they've been through onboarding
  if (profile.fav_sport) return false;

  return true;
}
