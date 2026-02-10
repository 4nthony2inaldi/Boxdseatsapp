import { SupabaseClient } from "@supabase/supabase-js";

// ── Types ──

export type ListSummary = {
  id: string;
  name: string;
  description: string | null;
  list_type: string;
  sport: string | null;
  icon: string;
  item_count: number;
  visited: number;
};

export type ListDetail = {
  id: string;
  name: string;
  description: string | null;
  list_type: string;
  sport: string | null;
  icon: string;
  item_count: number;
};

export type ListVenueItem = {
  id: string;
  venue_id: string | null;
  event_tag: string | null;
  display_name: string;
  display_order: number;
  visited: boolean;
};

// Sport icons lookup
const sportIcons: Record<string, string> = {
  baseball: "⚾",
  football: "🏈",
  basketball: "🏀",
  hockey: "🏒",
  soccer: "⚽",
  golf: "⛳",
  tennis: "🎾",
};

// ── Fetch all system lists with progress ──

export async function fetchAllLists(
  supabase: SupabaseClient,
  userId: string
): Promise<ListSummary[]> {
  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, description, list_type, sport, item_count, league_id")
    .eq("source", "system")
    .order("name");

  if (!lists || lists.length === 0) return [];

  // Get user's visited venue IDs
  const { data: venueVisits } = await supabase
    .from("venue_visits")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("relationship", "visited");

  const visitedVenueIds = new Set(
    (venueVisits || []).map((vv) => vv.venue_id)
  );

  // Get user's event logs for event-type list matching
  const { data: userEventLogs } = await supabase
    .from("event_logs")
    .select("event_id, events(event_tags)")
    .eq("user_id", userId)
    .not("event_id", "is", null);

  const userEventTags = new Set<string>();
  if (userEventLogs) {
    for (const ue of userEventLogs) {
      const tags = (ue.events as unknown as { event_tags: string[] | null })?.event_tags;
      if (tags) {
        for (const t of tags) userEventTags.add(t);
      }
    }
  }

  const result: ListSummary[] = [];

  for (const list of lists) {
    let visited = 0;

    // Get list items
    const { data: items } = await supabase
      .from("list_items")
      .select("venue_id, event_tag")
      .eq("list_id", list.id);

    if (items) {
      if (list.list_type === "venue") {
        for (const item of items) {
          if (item.venue_id && visitedVenueIds.has(item.venue_id)) {
            visited++;
          }
        }
      } else if (list.list_type === "event") {
        for (const item of items) {
          if (item.event_tag && userEventTags.has(item.event_tag)) {
            visited++;
          }
        }
      }
    }

    result.push({
      id: list.id,
      name: list.name,
      description: list.description,
      list_type: list.list_type,
      sport: list.sport,
      icon: list.sport ? sportIcons[list.sport] || "🏟️" : "🏟️",
      item_count: list.item_count,
      visited,
    });
  }

  return result;
}

// ── Fetch list detail ──

export async function fetchListDetail(
  supabase: SupabaseClient,
  listId: string
): Promise<ListDetail | null> {
  const { data } = await supabase
    .from("lists")
    .select("id, name, description, list_type, sport, item_count")
    .eq("id", listId)
    .single();

  if (!data) return null;

  return {
    ...data,
    icon: data.sport ? sportIcons[data.sport] || "🏟️" : "🏟️",
  };
}

// ── Fetch list items with visited status ──

export async function fetchListItems(
  supabase: SupabaseClient,
  listId: string,
  userId: string,
  listType: string
): Promise<ListVenueItem[]> {
  const { data: items } = await supabase
    .from("list_items")
    .select("id, venue_id, event_tag, display_name, display_order")
    .eq("list_id", listId)
    .order("display_order", { ascending: true });

  if (!items || items.length === 0) return [];

  if (listType === "venue") {
    // Get user's visited venue IDs
    const venueIds = items.map((i) => i.venue_id).filter(Boolean) as string[];
    const { data: visits } = await supabase
      .from("venue_visits")
      .select("venue_id")
      .eq("user_id", userId)
      .eq("relationship", "visited")
      .in("venue_id", venueIds);

    const visitedSet = new Set((visits || []).map((v) => v.venue_id));

    return items.map((item) => ({
      id: item.id,
      venue_id: item.venue_id,
      event_tag: item.event_tag,
      display_name: item.display_name,
      display_order: item.display_order,
      visited: item.venue_id ? visitedSet.has(item.venue_id) : false,
    }));
  } else if (listType === "event") {
    // Get user's event tags
    const { data: userEvents } = await supabase
      .from("event_logs")
      .select("event_id, events(event_tags)")
      .eq("user_id", userId)
      .not("event_id", "is", null);

    const userTags = new Set<string>();
    if (userEvents) {
      for (const ue of userEvents) {
        const tags = (ue.events as unknown as { event_tags: string[] | null })?.event_tags;
        if (tags) {
          for (const t of tags) userTags.add(t);
        }
      }
    }

    return items.map((item) => ({
      id: item.id,
      venue_id: item.venue_id,
      event_tag: item.event_tag,
      display_name: item.display_name,
      display_order: item.display_order,
      visited: item.event_tag ? userTags.has(item.event_tag) : false,
    }));
  }

  return items.map((item) => ({
    ...item,
    visited: false,
  }));
}
