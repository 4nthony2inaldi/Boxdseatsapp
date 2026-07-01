import { createClient } from "@/lib/supabase/server";
import {
  fetchProfile,
  fetchProfileStats,
  fetchBigFour,
  fetchActivityChart,
  fetchPinnedLists,
  resolvePinnedListIds,
  fetchTimeline,
  fetchProfileSummaryCounts,
  fetchVisitedCityCount,
} from "@/lib/queries/profile";
import { fetchUserAchievements } from "@/lib/queries/achievements";
import ProfileHeader from "@/components/profile/ProfileHeader";
import StatsRow from "@/components/profile/StatsRow";
import BigFourSection from "@/components/profile/BigFourSection";
import ActivityChart from "@/components/profile/ActivityChart";
import PinnedLists from "@/components/profile/PinnedLists";
import AchievementBadges from "@/components/profile/AchievementBadges";
import ProfileStickyBar from "@/components/profile/ProfileStickyBar";
import LatestEvent from "@/components/profile/LatestEvent";
import SummaryRows from "@/components/profile/SummaryRows";
import ShareButton from "@/components/sharing/ShareButton";
import HeadshotBackfill from "@/components/profile/HeadshotBackfill";
import PullToRefresh from "@/components/PullToRefresh";
import { fanStatsLine } from "@/lib/formatters";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view your profile.</p>
      </div>
    );
  }

  const profile = await fetchProfile(supabase, user.id);

  if (!profile) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Profile not found.</p>
      </div>
    );
  }

  // Pinned lists: manual pins win; otherwise the user's two most-completed.
  const pinIds = await resolvePinnedListIds(supabase, profile);

  const [stats, bigFour, activityData, pinnedLists, timelinePage, summaryCounts, achievements, cityCount] =
    await Promise.all([
      fetchProfileStats(supabase, user.id),
      fetchBigFour(supabase, profile),
      fetchActivityChart(supabase, user.id),
      fetchPinnedLists(supabase, user.id, pinIds),
      fetchTimeline(supabase, user.id, undefined, 1, 0, undefined, user.id),
      fetchProfileSummaryCounts(supabase, user.id),
      fetchUserAchievements(supabase, user.id, true),
      fetchVisitedCityCount(supabase, user.id),
    ]);

  // Mirror the fan passport's share line: "X games at X venues in X cities".
  const shareText = `Check out my BoxdSeats profile: ${fanStatsLine(stats.totalEvents, stats.totalVenues, cityCount)}`;

  // Latest event is the first (most recent) entry
  const latestEvent = timelinePage.entries.length > 0 ? timelinePage.entries[0] : null;

  return (
    <PullToRefresh>
    <div className="max-w-lg mx-auto pb-5">
      <HeadshotBackfill />
      <ProfileHeader profile={profile} stats={stats} />
      <StatsRow stats={stats} eventsHref="/timeline" venuesHref="/venues" />
      <ProfileStickyBar
        avatarUrl={profile.avatar_url}
        initial={(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
        stats={stats}
      />
      <BigFourSection items={bigFour} isOwner />
      <ActivityChart months={activityData.months} total={activityData.total} timelineHref="/timeline" />
      <PinnedLists lists={pinnedLists} isOwner />
      <AchievementBadges badges={achievements} />
      <LatestEvent entry={latestEvent} canEdit viewerId={user.id} />
      <SummaryRows counts={summaryCounts} passportHref={`/@${profile.username}/passport`} />
      {/* Share — lands on the fan passport, a more fun destination than the
          plain profile, with the same share card. */}
      <div className="px-4 mt-4">
        <ShareButton
          url={`https://boxdseats.com/@${profile.username}/passport`}
          title={`${profile.display_name || profile.username}'s Fan Passport on BoxdSeats`}
          text={shareText}
        />
      </div>
    </div>
    </PullToRefresh>
  );
}
