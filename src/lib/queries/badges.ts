import { SupabaseClient } from "@supabase/supabase-js";
import { getSportIconPath } from "@/lib/sportIcons";

// ── Types ──

export type BadgeData = {
  id: string;
  list_id: string;
  list_name: string;
  list_sport: string | null;
  list_icon: string;
  completed_at: string;
  item_count_at_completion: number;
  is_legacy: boolean;
  /** Current item_count on the list (may differ from completion count if list was updated) */
  current_item_count: number;
  /** Current user progress against the updated list */
  current_visited: number;
};

export type TrackedListProgress = {
  list_id: string;
  list_name: string;
  list_sport: string | null;
  list_icon: string;
  item_count: number;
  visited: number;
};

// ── Fetch all earned badges for a user ──

export async function fetchUserBadges(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeData[]> {
  const { data: badges } = await supabase
    .from("badges")
    .select("id, list_id, completed_at, item_count_at_completion, is_legacy, lists(name, sport, item_count)")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (!badges || badges.length === 0) return [];

  // Get user's visited venue IDs for current progress
  const { data: venueVisits } = await supabase
    .from("venue_visits")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("relationship", "visited");

  const visitedVenueIds = new Set((venueVisits || []).map((vv) => vv.venue_id));

  // Get user's event tags for current progress
  const { data: userEventLogs } = await supabase
    .from("event_logs")
    .select("event_id, events(event_tags)")
    .eq("user_id", userId)
    .not("event_id", "is", null);

  const userEventTags = new Set<string>();
  if (userEventLogs) {
    for (const ue of userEventLogs) {
      const tags = (ue.events as unknown as { event_tags: string[] | null })?.event_tags;
      if (tags) for (const t of tags) userEventTags.add(t);
    }
  }

  const result: BadgeData[] = [];

  for (const badge of badges) {
    const list = badge.lists as unknown as {
      name: string;
      sport: string | null;
      item_count: number;
    } | null;

    if (!list) continue;

    const isLegacy = badge.is_legacy || list.item_count !== badge.item_count_at_completion;

    // Calculate current progress against the (potentially updated) list
    let currentVisited = 0;
    if (isLegacy) {
      const { data: items } = await supabase
        .from("list_items")
        .select("venue_id, event_tag")
        .eq("list_id", badge.list_id);

      if (items) {
        for (const item of items) {
          if (item.venue_id && visitedVenueIds.has(item.venue_id)) currentVisited++;
          else if (item.event_tag && userEventTags.has(item.event_tag)) currentVisited++;
        }
      }
    } else {
      currentVisited = list.item_count; // 100% since badge is current
    }

    result.push({
      id: badge.id,
      list_id: badge.list_id,
      list_name: list.name,
      list_sport: list.sport,
      list_icon: getSportIconPath(list.sport) || "",
      completed_at: badge.completed_at,
      item_count_at_completion: badge.item_count_at_completion,
      is_legacy: isLegacy,
      current_item_count: list.item_count,
      current_visited: currentVisited,
    });
  }

  return result;
}

// ── Fetch tracked (followed) lists that user hasn't completed yet ──

export async function fetchTrackedIncomplete(
  supabase: SupabaseClient,
  userId: string
): Promise<TrackedListProgress[]> {
  // Get lists the user follows
  const { data: follows } = await supabase
    .from("list_follows")
    .select("list_id")
    .eq("user_id", userId);

  if (!follows || follows.length === 0) return [];

  const followedIds = follows.map((f) => f.list_id);

  // Get lists the user already has badges for
  const { data: earnedBadges } = await supabase
    .from("badges")
    .select("list_id")
    .eq("user_id", userId);

  const completedListIds = new Set((earnedBadges || []).map((b) => b.list_id));

  // Filter to followed lists without a badge (unless the badge is legacy — they still show progress)
  const incompleteIds = followedIds.filter((id) => !completedListIds.has(id));
  if (incompleteIds.length === 0) return [];

  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, sport, item_count, list_type")
    .in("id", incompleteIds);

  if (!lists || lists.length === 0) return [];

  // Get user progress data
  const { data: venueVisits } = await supabase
    .from("venue_visits")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("relationship", "visited");

  const visitedVenueIds = new Set((venueVisits || []).map((vv) => vv.venue_id));

  const { data: userEventLogs } = await supabase
    .from("event_logs")
    .select("event_id, events(event_tags)")
    .eq("user_id", userId)
    .not("event_id", "is", null);

  const userEventTags = new Set<string>();
  if (userEventLogs) {
    for (const ue of userEventLogs) {
      const tags = (ue.events as unknown as { event_tags: string[] | null })?.event_tags;
      if (tags) for (const t of tags) userEventTags.add(t);
    }
  }

  const result: TrackedListProgress[] = [];

  for (const list of lists) {
    let visited = 0;
    const { data: items } = await supabase
      .from("list_items")
      .select("venue_id, event_tag")
      .eq("list_id", list.id);

    if (items) {
      for (const item of items) {
        if (list.list_type === "venue" && item.venue_id && visitedVenueIds.has(item.venue_id)) {
          visited++;
        } else if (list.list_type === "event" && item.event_tag && userEventTags.has(item.event_tag)) {
          visited++;
        }
      }
    }

    result.push({
      list_id: list.id,
      list_name: list.name,
      list_sport: list.sport,
      list_icon: getSportIconPath(list.sport) || "",
      item_count: list.item_count,
      visited,
    });
  }

  return result;
}

// ── Check and award badges after a venue visit or event log ──

export async function checkAndAwardBadges(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeData[]> {
  // Get all lists (system + user-created that user follows)
  const { data: systemLists } = await supabase
    .from("lists")
    .select("id, name, sport, item_count, list_type, source")
    .eq("source", "system");

  const { data: followedListRefs } = await supabase
    .from("list_follows")
    .select("list_id")
    .eq("user_id", userId);

  const followedIds = new Set((followedListRefs || []).map((f) => f.list_id));

  // Combine: all system lists + followed user lists
  const { data: followedUserLists } = followedIds.size > 0
    ? await supabase
        .from("lists")
        .select("id, name, sport, item_count, list_type, source")
        .eq("source", "user")
        .in("id", Array.from(followedIds))
    : { data: [] };

  const allLists = [...(systemLists || []), ...(followedUserLists || [])];
  if (allLists.length === 0) return [];

  // Get existing badges
  const { data: existingBadges } = await supabase
    .from("badges")
    .select("list_id, item_count_at_completion")
    .eq("user_id", userId);

  const existingBadgeMap = new Map<string, number>();
  if (existingBadges) {
    for (const b of existingBadges) {
      existingBadgeMap.set(b.list_id, b.item_count_at_completion);
    }
  }

  // Get user progress data
  const { data: venueVisits } = await supabase
    .from("venue_visits")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("relationship", "visited");

  const visitedVenueIds = new Set((venueVisits || []).map((vv) => vv.venue_id));

  const { data: userEventLogs } = await supabase
    .from("event_logs")
    .select("event_id, events(event_tags)")
    .eq("user_id", userId)
    .not("event_id", "is", null);

  const userEventTags = new Set<string>();
  if (userEventLogs) {
    for (const ue of userEventLogs) {
      const tags = (ue.events as unknown as { event_tags: string[] | null })?.event_tags;
      if (tags) for (const t of tags) userEventTags.add(t);
    }
  }

  const newBadges: BadgeData[] = [];

  for (const list of allLists) {
    if (list.item_count === 0) continue;

    // Skip if user already has a badge at the current item count
    const existingCount = existingBadgeMap.get(list.id);
    if (existingCount !== undefined && existingCount === list.item_count) continue;

    // Calculate progress
    let visited = 0;
    const { data: items } = await supabase
      .from("list_items")
      .select("venue_id, event_tag")
      .eq("list_id", list.id);

    if (items) {
      for (const item of items) {
        if (list.list_type === "venue" && item.venue_id && visitedVenueIds.has(item.venue_id)) {
          visited++;
        } else if (list.list_type === "event" && item.event_tag && userEventTags.has(item.event_tag)) {
          visited++;
        }
      }
    }

    // Check if list is complete
    if (visited >= list.item_count) {
      // If user had an old badge at a different count, mark it legacy and create new one
      if (existingCount !== undefined && existingCount !== list.item_count) {
        // Update existing badge to legacy
        await supabase
          .from("badges")
          .update({ is_legacy: true })
          .eq("user_id", userId)
          .eq("list_id", list.id);
      }

      if (existingCount === undefined) {
        // Award new badge
        const { data: newBadge } = await supabase
          .from("badges")
          .insert({
            user_id: userId,
            list_id: list.id,
            item_count_at_completion: list.item_count,
            is_legacy: false,
          })
          .select("id, completed_at")
          .single();

        if (newBadge) {
          newBadges.push({
            id: newBadge.id,
            list_id: list.id,
            list_name: list.name,
            list_sport: list.sport,
            list_icon: getSportIconPath(list.sport) || "",
            completed_at: newBadge.completed_at,
            item_count_at_completion: list.item_count,
            is_legacy: false,
            current_item_count: list.item_count,
            current_visited: visited,
          });
        }
      }
    }
  }

  return newBadges;
}

// ── Fetch badge items (list items with visited status) for badge detail ──

export async function fetchBadgeItems(
  supabase: SupabaseClient,
  listId: string,
  userId: string
): Promise<{ display_name: string; visited: boolean }[]> {
  const { data: list } = await supabase
    .from("lists")
    .select("list_type")
    .eq("id", listId)
    .single();

  if (!list) return [];

  const { data: items } = await supabase
    .from("list_items")
    .select("venue_id, event_tag, display_name, display_order")
    .eq("list_id", listId)
    .order("display_order", { ascending: true });

  if (!items || items.length === 0) return [];

  if (list.list_type === "venue") {
    const venueIds = items.map((i) => i.venue_id).filter(Boolean) as string[];
    const { data: visits } = await supabase
      .from("venue_visits")
      .select("venue_id")
      .eq("user_id", userId)
      .eq("relationship", "visited")
      .in("venue_id", venueIds);

    const visitedSet = new Set((visits || []).map((v) => v.venue_id));

    return items.map((item) => ({
      display_name: item.display_name,
      visited: item.venue_id ? visitedSet.has(item.venue_id) : false,
    }));
  } else if (list.list_type === "event") {
    const { data: userEvents } = await supabase
      .from("event_logs")
      .select("event_id, events(event_tags)")
      .eq("user_id", userId)
      .not("event_id", "is", null);

    const userTags = new Set<string>();
    if (userEvents) {
      for (const ue of userEvents) {
        const tags = (ue.events as unknown as { event_tags: string[] | null })?.event_tags;
        if (tags) for (const t of tags) userTags.add(t);
      }
    }

    return items.map((item) => ({
      display_name: item.display_name,
      visited: item.event_tag ? userTags.has(item.event_tag) : false,
    }));
  }

  return items.map((item) => ({ display_name: item.display_name, visited: false }));
}
