import { createClient } from "@/lib/supabase/server";
import { fetchFeed, fetchDiscoveryFeed, type FeedPage } from "@/lib/queries/social";
import { fetchNearbyEvents, type NearbyPage } from "@/lib/queries/nearby";
import FeedList from "@/components/feed/FeedList";
import NearbySection from "@/components/feed/NearbySection";
import PullToRefresh from "@/components/PullToRefresh";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view your feed.</p>
      </div>
    );
  }

  const [{ entries, hasMore }, profileRes, followCountRes] = await Promise.all([
    fetchFeed(supabase, user.id),
    supabase.from("profiles").select("home_city").eq("id", user.id).single(),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id).eq("status", "active"),
  ]);
  const homeCity = profileRes.data?.home_city ?? null;
  const followingCount = followCountRes.count ?? 0;
  let nearby: NearbyPage = { events: [], before: null };
  if (homeCity) {
    nearby = await fetchNearbyEvents(supabase, homeCity);
  }

  // Cold-start: keep the community discovery feed until the user has built a
  // small network (~3 follows), so home stays alive while they get going. Their
  // followed people's public logs still appear in discovery, and their own logs
  // live on their profile. At 3+ follows the friends feed takes over.
  const COLD_START_FOLLOW_THRESHOLD = 3;
  let discovery: FeedPage | null = null;
  if (followingCount < COLD_START_FOLLOW_THRESHOLD) {
    discovery = await fetchDiscoveryFeed(supabase, user.id);
  }
  const showDiscovery = followingCount < COLD_START_FOLLOW_THRESHOLD && !!discovery && discovery.entries.length > 0;

  return (
    <PullToRefresh>
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-2 mb-3">
        <h1 className="font-display text-[22px] text-text-primary tracking-wide">
          Feed
        </h1>
      </div>

      <NearbySection userId={user.id} initialCity={homeCity} initialPage={nearby} />

      <div className="px-4 mb-2.5">
        <span className="font-display text-[13px] text-text-muted tracking-[2px] uppercase">
          {showDiscovery ? "Popular on BoxdSeats" : "From Friends"}
        </span>
      </div>
      {showDiscovery ? (
        <FeedList
          initialEntries={discovery!.entries}
          initialHasMore={discovery!.hasMore}
          userId={user.id}
          endpoint="/api/discovery"
          showFollow
        />
      ) : (
        <FeedList initialEntries={entries} initialHasMore={hasMore} userId={user.id} />
      )}
    </div>
    </PullToRefresh>
  );
}
