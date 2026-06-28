import { createClient } from "@/lib/supabase/server";
import {
  fetchProfile,
  fetchProfileStats,
  fetchBigFour,
  fetchActivityChart,
  fetchPinnedLists,
  fetchTimeline,
  fetchProfileSummaryCounts,
  fetchVisitedCityCount,
} from "@/lib/queries/profile";
import { fetchUserBadges, fetchTrackedIncomplete } from "@/lib/queries/badges";
import ProfileHeader from "@/components/profile/ProfileHeader";
import StatsRow from "@/components/profile/StatsRow";
import BigFourSection from "@/components/profile/BigFourSection";
import ActivityChart from "@/components/profile/ActivityChart";
import PinnedLists from "@/components/profile/PinnedLists";
import BadgeSection from "@/components/profile/BadgeSection";
import LatestEvent from "@/components/profile/LatestEvent";
import SummaryRows from "@/components/profile/SummaryRows";
import ShareButton from "@/components/sharing/ShareButton";
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

  const [stats, bigFour, activityData, pinnedLists, timelinePage, summaryCounts, badges, trackedIncomplete, cityCount] =
    await Promise.all([
      fetchProfileStats(supabase, user.id),
      fetchBigFour(supabase, profile),
      fetchActivityChart(supabase, user.id),
      fetchPinnedLists(supabase, user.id, [
        profile.pinned_list_1_id,
        profile.pinned_list_2_id,
      ]),
      fetchTimeline(supabase, user.id, undefined, 1),
      fetchProfileSummaryCounts(supabase, user.id),
      fetchUserBadges(supabase, user.id),
      fetchTrackedIncomplete(supabase, user.id),
      fetchVisitedCityCount(supabase, user.id),
    ]);

  // Mirror the fan passport's share line: "X games at X venues in X cities".
  const shareText = `Check out my BoxdSeats profile: ${fanStatsLine(stats.totalEvents, stats.totalVenues, cityCount)}`;

  // Latest event is the first (most recent) entry
  const latestEvent = timelinePage.entries.length > 0 ? timelinePage.entries[0] : null;

  return (
    <div className="max-w-lg mx-auto pb-5">
      <ProfileHeader profile={profile} stats={stats} />
      <StatsRow stats={stats} eventsHref="/timeline" venuesHref="/venues" />
      <BigFourSection items={bigFour} isOwner />
      <ActivityChart months={activityData.months} total={activityData.total} timelineHref="/timeline" />
      <PinnedLists lists={pinnedLists} isOwner />
      <BadgeSection badges={badges} tracked={trackedIncomplete} userId={user.id} showTracked={pinnedLists.length === 0} isOwner />
      <LatestEvent entry={latestEvent} canEdit viewerId={user.id} />
      <SummaryRows counts={summaryCounts} passportHref={`/@${profile.username}/passport`} />
      {/* Share Profile */}
      <div className="px-4 mt-4">
        <ShareButton
          url={`https://boxdseats.com/@${profile.username}`}
          title={`${profile.display_name || profile.username} on BoxdSeats`}
          text={shareText}
        />
      </div>
    </div>
  );
}
