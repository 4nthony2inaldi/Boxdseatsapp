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

  const [{ entries, hasMore }, profileRes] = await Promise.all([
    fetchFeed(supabase, user.id),
    supabase.from("profiles").select("home_city").eq("id", user.id).single(),
  ]);
  const homeCity = profileRes.data?.home_city ?? null;
  let nearby: NearbyPage = { events: [], before: null };
  if (homeCity) {
    nearby = await fetchNearbyEvents(supabase, homeCity);
  }

  // Cold-start: a brand-new account follows no one and has logged nothing, so
  // the friends feed is empty. Fall back to recent public activity so the home
  // screen is never blank.
  let discovery: FeedPage | null = null;
  if (entries.length === 0) {
    discovery = await fetchDiscoveryFeed(supabase, user.id);
  }
  const showDiscovery = entries.length === 0 && !!discovery && discovery.entries.length > 0;

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
        />
      ) : (
        <FeedList initialEntries={entries} initialHasMore={hasMore} userId={user.id} />
      )}
    </div>
    </PullToRefresh>
  );
}
