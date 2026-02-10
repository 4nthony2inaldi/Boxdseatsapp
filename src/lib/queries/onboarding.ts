import { SupabaseClient } from "@supabase/supabase-js";

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
  limit = 10
): Promise<{ id: string; name: string; short_name: string; league_name: string | null }[]> {
  const pattern = `%${query.trim()}%`;
  const { data } = await supabase
    .from("teams")
    .select("id, name, short_name, leagues(name)")
    .or(`name.ilike.${pattern},short_name.ilike.${pattern}`)
    .limit(limit);

  return (data || []).map((t) => {
    const league = t.leagues as unknown as { name: string } | null;
    return {
      id: t.id,
      name: t.name,
      short_name: t.short_name,
      league_name: league?.name || null,
    };
  });
}

export async function searchVenuesForOnboarding(
  supabase: SupabaseClient,
  query: string,
  limit = 10
): Promise<{ id: string; name: string; city: string; state: string | null }[]> {
  const pattern = `%${query.trim()}%`;
  const { data } = await supabase
    .from("venues")
    .select("id, name, city, state")
    .eq("status", "active")
    .or(`name.ilike.${pattern},city.ilike.${pattern}`)
    .order("name")
    .limit(limit);

  return data || [];
}

export async function searchAthletes(
  supabase: SupabaseClient,
  query: string,
  limit = 10
): Promise<{ id: string; name: string; sport: string | null }[]> {
  const pattern = `%${query.trim()}%`;
  const { data } = await supabase
    .from("athletes")
    .select("id, name, sport")
    .ilike("name", pattern)
    .limit(limit);

  return data || [];
}

export async function searchEvents(
  supabase: SupabaseClient,
  query: string,
  limit = 10
): Promise<{ id: string; label: string; venue_name: string | null; event_date: string }[]> {
  const pattern = `%${query.trim()}%`;
  const { data } = await supabase
    .from("events")
    .select(
      `id, event_date, tournament_name,
       home_team:teams!events_home_team_id_fkey(short_name),
       away_team:teams!events_away_team_id_fkey(short_name),
       venues(name)`
    )
    .or(`tournament_name.ilike.${pattern}`)
    .order("event_date", { ascending: false })
    .limit(limit);

  // Also search by team names
  const { data: teamMatches } = await supabase
    .from("events")
    .select(
      `id, event_date, tournament_name,
       home_team:teams!events_home_team_id_fkey(short_name, name),
       away_team:teams!events_away_team_id_fkey(short_name, name),
       venues(name)`
    )
    .limit(limit * 2);

  const allEvents = [...(data || [])];
  const seenIds = new Set(allEvents.map((e) => e.id));
  const lowerQ = query.trim().toLowerCase();

  for (const e of teamMatches || []) {
    if (seenIds.has(e.id)) continue;
    const home = e.home_team as unknown as { short_name: string; name: string } | null;
    const away = e.away_team as unknown as { short_name: string; name: string } | null;
    if (
      home?.short_name?.toLowerCase().includes(lowerQ) ||
      home?.name?.toLowerCase().includes(lowerQ) ||
      away?.short_name?.toLowerCase().includes(lowerQ) ||
      away?.name?.toLowerCase().includes(lowerQ)
    ) {
      allEvents.push(e);
      seenIds.add(e.id);
    }
    if (allEvents.length >= limit) break;
  }

  return allEvents.slice(0, limit).map((e) => {
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

// ── Mark onboarding complete ──

export async function completeOnboarding(
  supabase: SupabaseClient,
  userId: string
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
