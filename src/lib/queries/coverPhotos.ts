import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Set voting_closes_at on an event.
 * Voting closes at 11:59 PM local time on the day after the event.
 * Since we don't have timezone info, we use UTC and add 1 day + 23:59:59.
 */
export function computeVotingClosesAt(eventDate: string): string {
  const date = new Date(eventDate + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + 1);
  date.setUTCHours(23, 59, 59, 0);
  return date.toISOString();
}

/**
 * Ensure voting_closes_at is set for an event.
 * Called when event data is loaded or when a photo is uploaded.
 */
export async function ensureVotingWindow(
  supabase: SupabaseClient,
  eventId: string,
  eventDate: string
): Promise<void> {
  const votingClosesAt = computeVotingClosesAt(eventDate);

  await supabase
    .from("events")
    .update({ voting_closes_at: votingClosesAt })
    .eq("id", eventId)
    .is("voting_closes_at", null);
}

/**
 * Select and set the cover photo for an event.
 * Picks the photo with the most likes.
 * Tiebreaker: verified preferred, then earliest capture time.
 *
 * Returns the winning event_log_id or null if no photos exist.
 */
export async function selectCoverPhoto(
  supabase: SupabaseClient,
  eventId: string
): Promise<string | null> {
  // Get all photos for this event
  const { data: photos } = await supabase
    .from("event_logs")
    .select("id, user_id, photo_url, photo_is_verified, photo_like_count, photo_captured_at")
    .eq("event_id", eventId)
    .not("photo_url", "is", null)
    .neq("privacy", "hide_all");

  if (!photos || photos.length === 0) return null;

  // Sort: most likes desc, then verified preferred, then earliest capture
  const sorted = [...photos].sort((a, b) => {
    // Most likes first
    const likeDiff = (b.photo_like_count || 0) - (a.photo_like_count || 0);
    if (likeDiff !== 0) return likeDiff;

    // Verified preferred in ties
    const aVerified = a.photo_is_verified ? 1 : 0;
    const bVerified = b.photo_is_verified ? 1 : 0;
    if (bVerified !== aVerified) return bVerified - aVerified;

    // Earliest capture time
    const aTime = a.photo_captured_at ? new Date(a.photo_captured_at).getTime() : Infinity;
    const bTime = b.photo_captured_at ? new Date(b.photo_captured_at).getTime() : Infinity;
    return aTime - bTime;
  });

  const winner = sorted[0];

  // Update event with cover photo
  const { error } = await supabase
    .from("events")
    .update({
      cover_photo_event_log_id: winner.id,
      cover_photo_url: winner.photo_url,
    })
    .eq("id", eventId);

  if (error) return null;

  return winner.id;
}

/**
 * Process all events where voting has closed but no cover photo selected.
 * This can be called as a scheduled job or on-demand.
 */
export async function processClosedVoting(
  supabase: SupabaseClient
): Promise<{ processed: number; errors: number }> {
  const now = new Date().toISOString();

  // Find events where voting closed and no cover photo yet
  const { data: events } = await supabase
    .from("events")
    .select("id, venue_id")
    .lt("voting_closes_at", now)
    .is("cover_photo_event_log_id", null)
    .not("voting_closes_at", "is", null);

  if (!events || events.length === 0) return { processed: 0, errors: 0 };

  let processed = 0;
  let errors = 0;

  for (const event of events) {
    const winnerId = await selectCoverPhoto(supabase, event.id);
    if (winnerId) {
      // Update venue hero if this is the most recent event at the venue
      await propagateVenueHero(supabase, event.id, event.venue_id);
      // Send notification to winner
      await notifyCoverPhotoWinner(supabase, event.id, winnerId);
      processed++;
    } else {
      // No photos — mark as processed by setting a null cover
      // (voting_closes_at is already set, cover_photo_event_log_id stays null)
      errors++;
    }
  }

  return { processed, errors };
}

/**
 * If this event is the most recent at the venue, set the venue's cover image.
 */
export async function propagateVenueHero(
  supabase: SupabaseClient,
  eventId: string,
  venueId: string
): Promise<void> {
  // Check if this is the most recent event at the venue that has a cover photo
  const { data: latestEvent } = await supabase
    .from("events")
    .select("id")
    .eq("venue_id", venueId)
    .not("cover_photo_url", "is", null)
    .order("event_date", { ascending: false })
    .limit(1)
    .single();

  if (latestEvent && latestEvent.id === eventId) {
    await supabase
      .from("venues")
      .update({ current_cover_event_id: eventId })
      .eq("id", venueId);
  }
}

/**
 * Send a notification to the winning photographer and increment their cover photo count.
 */
export async function notifyCoverPhotoWinner(
  supabase: SupabaseClient,
  eventId: string,
  winnerEventLogId: string
): Promise<void> {
  // Get the winner's user_id
  const { data: log } = await supabase
    .from("event_logs")
    .select("user_id")
    .eq("id", winnerEventLogId)
    .single();

  if (!log) return;

  // Get event info for notification message
  const { data: event } = await supabase
    .from("events")
    .select(`
      tournament_name,
      home_team:teams!events_home_team_id_fkey(short_name),
      away_team:teams!events_away_team_id_fkey(short_name)
    `)
    .eq("id", eventId)
    .single();

  let eventName = "an event";
  if (event) {
    const homeTeam = event.home_team as unknown as { short_name: string } | null;
    const awayTeam = event.away_team as unknown as { short_name: string } | null;
    if (homeTeam && awayTeam) {
      eventName = `${awayTeam.short_name} @ ${homeTeam.short_name}`;
    } else if (event.tournament_name) {
      eventName = event.tournament_name;
    }
  }

  // Insert notification
  await supabase
    .from("notifications")
    .insert({
      user_id: log.user_id,
      type: "badge_earned", // reusing existing type, closest fit
      target_id: eventId,
      target_type: "cover_photo",
      message: `Your photo was selected as the cover photo for ${eventName}!`,
    });

  // Increment cover photo count on profile
  // We use a raw SQL increment via RPC or direct update
  const { data: profile } = await supabase
    .from("profiles")
    .select("cover_photo_count")
    .eq("id", log.user_id)
    .single();

  const currentCount = (profile as unknown as { cover_photo_count: number | null })?.cover_photo_count || 0;

  await supabase
    .from("profiles")
    .update({ cover_photo_count: currentCount + 1 })
    .eq("id", log.user_id);
}

/**
 * Fetch cover photo info for an event (photographer credit).
 */
export type CoverPhotoCredit = {
  photo_url: string;
  username: string;
  display_name: string | null;
};

export async function fetchCoverPhotoCredit(
  supabase: SupabaseClient,
  eventLogId: string
): Promise<CoverPhotoCredit | null> {
  const { data: log } = await supabase
    .from("event_logs")
    .select("photo_url, user_id")
    .eq("id", eventLogId)
    .single();

  if (!log || !log.photo_url) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", log.user_id)
    .single();

  if (!profile) return null;

  return {
    photo_url: log.photo_url,
    username: profile.username,
    display_name: profile.display_name,
  };
}

/**
 * Fetch venue cover photo from its most recent event's cover photo.
 */
export async function fetchVenueCoverPhoto(
  supabase: SupabaseClient,
  venueId: string
): Promise<{ photo_url: string; username: string } | null> {
  // Get the venue's current cover event
  const { data: venue } = await supabase
    .from("venues")
    .select("current_cover_event_id")
    .eq("id", venueId)
    .single();

  if (!venue?.current_cover_event_id) return null;

  // Get the event's cover photo
  const { data: event } = await supabase
    .from("events")
    .select("cover_photo_event_log_id, cover_photo_url")
    .eq("id", venue.current_cover_event_id)
    .single();

  if (!event?.cover_photo_url || !event.cover_photo_event_log_id) return null;

  // Get photographer info
  const { data: log } = await supabase
    .from("event_logs")
    .select("user_id")
    .eq("id", event.cover_photo_event_log_id)
    .single();

  if (!log) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", log.user_id)
    .single();

  return {
    photo_url: event.cover_photo_url,
    username: profile?.username || "unknown",
  };
}
