import { SupabaseClient } from "@supabase/supabase-js";
import { getSportIconPath } from "@/lib/sportIcons";

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
  source: string;
  created_by: string | null;
  creator_username?: string | null;
  creator_display_name?: string | null;
  forked_from: string | null;
};

export type ListVenueItem = {
  id: string;
  venue_id: string | null;
  event_tag: string | null;
  display_name: string;
  display_order: number;
  visited: boolean;
};


// ── Fetch all system lists with progress ──

export async function fetchAllLists(
  supabase: SupabaseClient,
  userId: string
): Promise<ListSummary[]> {
  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, description, list_type, sport, item_count, league_id, source")
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
    .select("event_id, events!event_logs_event_id_fkey(event_tags)")
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
      icon: getSportIconPath(list.sport) || "",
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
  const { data, error } = await supabase
    .from("lists")
    .select(
      "id, name, description, list_type, sport, item_count, source, created_by, forked_from, profiles!lists_created_by_fkey(username, display_name)"
    )
    .eq("id", listId)
    .single();

  if (error) {
    console.error("[fetchListDetail] error:", error.message, error.code, error.details, "listId:", listId);
  }

  if (!data) return null;

  const creator = data.profiles as unknown as {
    username: string;
    display_name: string | null;
  } | null;

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    list_type: data.list_type,
    sport: data.sport,
    item_count: data.item_count,
    source: data.source,
    created_by: data.created_by,
    creator_username: creator?.username || null,
    creator_display_name: creator?.display_name || null,
    forked_from: data.forked_from,
    icon: getSportIconPath(data.sport) || "",
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
      .select("event_id, events!event_logs_event_id_fkey(event_tags)")
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

// ── User-created lists ──

export type UserListSummary = {
  id: string;
  name: string;
  description: string | null;
  list_type: string;
  sport: string | null;
  icon: string;
  item_count: number;
  visited: number;
  source: string;
  created_by: string | null;
  creator_username?: string | null;
  creator_display_name?: string | null;
};

export async function fetchUserLists(
  supabase: SupabaseClient,
  userId: string
): Promise<UserListSummary[]> {
  const { data: lists } = await supabase
    .from("lists")
    .select("id, name, description, list_type, sport, item_count, source, created_by")
    .eq("source", "user")
    .eq("created_by", userId)
    .order("updated_at", { ascending: false });

  if (!lists || lists.length === 0) return [];

  return computeListProgress(supabase, userId, lists);
}

export async function fetchFollowedLists(
  supabase: SupabaseClient,
  userId: string
): Promise<UserListSummary[]> {
  // Get list IDs the user follows
  const { data: follows } = await supabase
    .from("list_follows")
    .select("list_id")
    .eq("user_id", userId);

  if (!follows || follows.length === 0) return [];

  const listIds = follows.map((f) => f.list_id);

  const { data: lists } = await supabase
    .from("lists")
    .select(
      "id, name, description, list_type, sport, item_count, source, created_by, profiles!lists_created_by_fkey(username, display_name)"
    )
    .in("id", listIds)
    .order("name");

  if (!lists || lists.length === 0) return [];

  const withProgress = await computeListProgress(supabase, userId, lists);

  // Attach creator info
  return withProgress.map((item, i) => {
    const creator = (lists[i] as unknown as { profiles: { username: string; display_name: string | null } | null })
      .profiles;
    return {
      ...item,
      creator_username: creator?.username || null,
      creator_display_name: creator?.display_name || null,
    };
  });
}

async function computeListProgress(
  supabase: SupabaseClient,
  userId: string,
  lists: { id: string; name: string; description: string | null; list_type: string; sport: string | null; item_count: number; source: string; created_by: string | null }[]
): Promise<UserListSummary[]> {
  const { data: venueVisits } = await supabase
    .from("venue_visits")
    .select("venue_id")
    .eq("user_id", userId)
    .eq("relationship", "visited");

  const visitedVenueIds = new Set((venueVisits || []).map((vv) => vv.venue_id));

  const { data: userEventLogs } = await supabase
    .from("event_logs")
    .select("event_id, events!event_logs_event_id_fkey(event_tags)")
    .eq("user_id", userId)
    .not("event_id", "is", null);

  const userEventTags = new Set<string>();
  if (userEventLogs) {
    for (const ue of userEventLogs) {
      const tags = (ue.events as unknown as { event_tags: string[] | null })?.event_tags;
      if (tags) for (const t of tags) userEventTags.add(t);
    }
  }

  const result: UserListSummary[] = [];

  for (const list of lists) {
    let visited = 0;
    const { data: items } = await supabase
      .from("list_items")
      .select("venue_id, event_tag")
      .eq("list_id", list.id);

    if (items) {
      if (list.list_type === "venue") {
        for (const item of items) {
          if (item.venue_id && visitedVenueIds.has(item.venue_id)) visited++;
        }
      } else if (list.list_type === "event") {
        for (const item of items) {
          if (item.event_tag && userEventTags.has(item.event_tag)) visited++;
        }
      }
    }

    result.push({
      id: list.id,
      name: list.name,
      description: list.description,
      list_type: list.list_type,
      sport: list.sport,
      icon: getSportIconPath(list.sport) || "",
      item_count: list.item_count,
      visited,
      source: list.source,
      created_by: list.created_by,
    });
  }

  return result;
}

// ── Create list ──

export async function createList(
  supabase: SupabaseClient,
  userId: string,
  data: { name: string; description: string; list_type: string; sport: string | null }
): Promise<{ id: string } | { error: string }> {
  const { data: list, error } = await supabase
    .from("lists")
    .insert({
      name: data.name,
      description: data.description || null,
      list_type: data.list_type,
      source: "user",
      created_by: userId,
      sport: data.sport || null,
      item_count: 0,
    })
    .select("id")
    .single();

  if (error) return { error: "Failed to create list." };
  return { id: list.id };
}

// ── Update list ──

export async function updateList(
  supabase: SupabaseClient,
  userId: string,
  listId: string,
  updates: { name?: string; description?: string }
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("lists")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", listId)
    .eq("created_by", userId);

  if (error) return { error: "Failed to update list." };
  return { success: true };
}

// ── Delete list ──

export async function deleteList(
  supabase: SupabaseClient,
  userId: string,
  listId: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("lists")
    .delete()
    .eq("id", listId)
    .eq("created_by", userId)
    .eq("source", "user");

  if (error) return { error: "Failed to delete list." };
  return { success: true };
}

// ── Add item to list ──

export async function addListItem(
  supabase: SupabaseClient,
  listId: string,
  item: { venue_id?: string; event_tag?: string; display_name: string }
): Promise<{ id: string } | { error: string }> {
  // Get max display_order
  const { data: maxRow } = await supabase
    .from("list_items")
    .select("display_order")
    .eq("list_id", listId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextOrder = (maxRow?.display_order ?? -1) + 1;

  const { data: newItem, error } = await supabase
    .from("list_items")
    .insert({
      list_id: listId,
      venue_id: item.venue_id || null,
      event_tag: item.event_tag || null,
      display_name: item.display_name,
      display_order: nextOrder,
    })
    .select("id")
    .single();

  if (error) return { error: "Failed to add item." };

  // Update item_count
  const { count } = await supabase
    .from("list_items")
    .select("id", { count: "exact", head: true })
    .eq("list_id", listId);

  await supabase
    .from("lists")
    .update({ item_count: count || 0, updated_at: new Date().toISOString() })
    .eq("id", listId);

  return { id: newItem.id };
}

// ── Remove item from list ──

export async function removeListItem(
  supabase: SupabaseClient,
  listId: string,
  itemId: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("list_items")
    .delete()
    .eq("id", itemId)
    .eq("list_id", listId);

  if (error) return { error: "Failed to remove item." };

  // Update item_count
  const { count } = await supabase
    .from("list_items")
    .select("id", { count: "exact", head: true })
    .eq("list_id", listId);

  await supabase
    .from("lists")
    .update({ item_count: count || 0, updated_at: new Date().toISOString() })
    .eq("id", listId);

  return { success: true };
}

// ── Follow / Unfollow list ──

export async function followList(
  supabase: SupabaseClient,
  userId: string,
  listId: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("list_follows")
    .insert({ user_id: userId, list_id: listId });

  if (error) return { error: "Failed to follow list." };
  return { success: true };
}

export async function unfollowList(
  supabase: SupabaseClient,
  userId: string,
  listId: string
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("list_follows")
    .delete()
    .eq("user_id", userId)
    .eq("list_id", listId);

  if (error) return { error: "Failed to unfollow list." };
  return { success: true };
}

export async function checkListFollow(
  supabase: SupabaseClient,
  userId: string,
  listId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("list_follows")
    .select("id")
    .eq("user_id", userId)
    .eq("list_id", listId)
    .maybeSingle();

  return !!data;
}

// ── Fork list ──

export async function forkList(
  supabase: SupabaseClient,
  userId: string,
  originalListId: string
): Promise<{ id: string } | { error: string }> {
  // Fetch original list
  const { data: original } = await supabase
    .from("lists")
    .select("name, description, list_type, sport, league_id, item_count")
    .eq("id", originalListId)
    .single();

  if (!original) return { error: "Original list not found." };

  // Create new list
  const { data: newList, error: createErr } = await supabase
    .from("lists")
    .insert({
      name: original.name,
      description: original.description,
      list_type: original.list_type,
      source: "user",
      created_by: userId,
      forked_from: originalListId,
      sport: original.sport,
      league_id: original.league_id,
      item_count: original.item_count,
    })
    .select("id")
    .single();

  if (createErr || !newList) return { error: "Failed to fork list." };

  // Copy items
  const { data: items } = await supabase
    .from("list_items")
    .select("venue_id, event_tag, display_name, display_order")
    .eq("list_id", originalListId)
    .order("display_order", { ascending: true });

  if (items && items.length > 0) {
    const newItems = items.map((item) => ({
      list_id: newList.id,
      venue_id: item.venue_id,
      event_tag: item.event_tag,
      display_name: item.display_name,
      display_order: item.display_order,
    }));

    await supabase.from("list_items").insert(newItems);
  }

  return { id: newList.id };
}

// ── Search venues for adding to lists ──

export async function searchVenuesForList(
  supabase: SupabaseClient,
  query: string,
  limit = 10
): Promise<{ id: string; name: string; city: string; state: string | null }[]> {
  const { data } = await supabase
    .from("venues")
    .select("id, name, city, state")
    .eq("status", "active")
    .ilike("name", `%${query}%`)
    .limit(limit)
    .order("name");

  return (data || []) as { id: string; name: string; city: string; state: string | null }[];
}

// ── Want to Visit venues ──

export type WantToVisitVenue = {
  venue_id: string;
  name: string;
  city: string;
  state: string | null;
  created_at: string;
};

export async function fetchWantToVisitCount(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count } = await supabase
    .from("venue_visits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("relationship", "want_to_visit");

  return count || 0;
}

export async function fetchWantToVisitVenues(
  supabase: SupabaseClient,
  userId: string
): Promise<WantToVisitVenue[]> {
  const { data } = await supabase
    .from("venue_visits")
    .select("venue_id, created_at, venues(name, city, state)")
    .eq("user_id", userId)
    .eq("relationship", "want_to_visit")
    .order("created_at", { ascending: false });

  if (!data) return [];

  return data.map((row) => {
    const venue = row.venues as unknown as {
      name: string;
      city: string;
      state: string | null;
    } | null;

    return {
      venue_id: row.venue_id,
      name: venue?.name || "Unknown Venue",
      city: venue?.city || "",
      state: venue?.state || null,
      created_at: row.created_at,
    };
  });
}
