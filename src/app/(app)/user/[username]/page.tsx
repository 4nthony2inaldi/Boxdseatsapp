import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  fetchProfileStats,
  fetchBigFour,
  fetchActivityChart,
  fetchPinnedLists,
  resolvePinnedListIds,
  fetchTimeline,
  fetchProfileSummaryCounts,
} from "@/lib/queries/profile";
import { fetchUserAchievements } from "@/lib/queries/achievements";
import {
  fetchUserProfileByUsername,
  fetchFollowRelationship,
  checkBlocked,
} from "@/lib/queries/social";
import ProfileHeader from "@/components/profile/ProfileHeader";
import HeadshotBackfill from "@/components/profile/HeadshotBackfill";
import ScrollToTop from "@/components/ScrollToTop";
import StatsRow from "@/components/profile/StatsRow";
import BigFourSection from "@/components/profile/BigFourSection";
import ActivityChart from "@/components/profile/ActivityChart";
import PinnedLists from "@/components/profile/PinnedLists";
import AchievementBadges from "@/components/profile/AchievementBadges";
import ProfileStickyBar from "@/components/profile/ProfileStickyBar";
import LatestEvent from "@/components/profile/LatestEvent";
import SummaryRows from "@/components/profile/SummaryRows";
import FollowButton from "@/components/social/FollowButton";
import UserProfileActions from "@/components/social/UserProfileActions";
import ShareButton from "@/components/sharing/ShareButton";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted mb-4">Please log in to view profiles.</p>
        <Link
          href="/login"
          className="inline-block bg-accent text-bg font-display text-sm tracking-wider uppercase px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          Log in
        </Link>
      </div>
    );
  }

  const profile = await fetchUserProfileByUsername(supabase, username);

  if (!profile) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">User not found.</p>
      </div>
    );
  }

  // If viewing own profile, redirect to /profile
  if (profile.id === user.id) {
    redirect("/profile");
  }

  // These don't depend on each other — fetch in parallel rather than blocking
  // the profile load on the block check first.
  const [isBlocked, followRel, stats] = await Promise.all([
    checkBlocked(supabase, user.id, profile.id),
    fetchFollowRelationship(supabase, user.id, profile.id),
    fetchProfileStats(supabase, profile.id),
  ]);

  if (isBlocked) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">This profile is not available.</p>
      </div>
    );
  }

  // Private profile gating: if private and not following, gate content
  const isGated = profile.is_private && !followRel.isFollowing;

  if (isGated) {
    return (
      <div className="max-w-lg mx-auto pb-5">
        <ScrollToTop />
        <ProfileHeader
          profile={profile}
          stats={stats}
          actions={
            <>
              <FollowButton
                targetUserId={profile.id}
                currentUserId={user.id}
                initialIsFollowing={followRel.isFollowing}
                initialIsPending={followRel.isPending}
              />
              <UserProfileActions
                targetUserId={profile.id}
                currentUserId={user.id}
                targetUsername={profile.username}
              />
            </>
          }
        />
        <StatsRow
          stats={stats}
          followersHref={`/user/${username}/followers`}
          followingHref={`/user/${username}/following`}
        />
        <div className="px-4 py-12 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-text-faint)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <p className="text-text-muted text-sm font-medium mb-1">
            This account is private
          </p>
          <p className="text-text-muted text-xs">
            Follow this user to see their events and activity.
          </p>
        </div>
      </div>
    );
  }

  // Pinned lists: their manual pins win; otherwise their two most-completed.
  const pinIds = await resolvePinnedListIds(supabase, profile);

  // Full profile — fetch remaining data
  const [bigFour, activityData, pinnedLists, timelinePage, summaryCounts, achievements] =
    await Promise.all([
      fetchBigFour(supabase, profile),
      fetchActivityChart(supabase, profile.id),
      fetchPinnedLists(supabase, profile.id, pinIds),
      fetchTimeline(supabase, profile.id, undefined, 1, 0, undefined, user.id),
      fetchProfileSummaryCounts(supabase, profile.id),
      fetchUserAchievements(supabase, profile.id),
    ]);

  const latestEvent = timelinePage.entries.length > 0 ? timelinePage.entries[0] : null;

  return (
    <div className="max-w-lg mx-auto pb-5">
      <ScrollToTop />
      <HeadshotBackfill userId={profile.id} />
      <ProfileHeader
        profile={profile}
        stats={stats}
        actions={
          <>
            <FollowButton
              targetUserId={profile.id}
              currentUserId={user.id}
              initialIsFollowing={followRel.isFollowing}
              initialIsPending={followRel.isPending}
            />
            <UserProfileActions
              targetUserId={profile.id}
              currentUserId={user.id}
              targetUsername={profile.username}
              compareHref={`/user/${username}/compare`}
            />
          </>
        }
      />
      <StatsRow
        stats={stats}
        eventsHref={`/user/${username}/timeline`}
        venuesHref={`/user/${username}/venues`}
        followersHref={`/user/${username}/followers`}
        followingHref={`/user/${username}/following`}
      />
      <ProfileStickyBar
        avatarUrl={profile.avatar_url}
        initial={(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
        stats={stats}
      />
      <BigFourSection items={bigFour} hrefBase={`/user/${username}/favorites`} />
      <ActivityChart months={activityData.months} total={activityData.total} timelineHref={`/user/${username}/timeline`} />
      <PinnedLists lists={pinnedLists} compareUserId={profile.id} />
      <AchievementBadges badges={achievements} hrefBase={`/user/${username}/badge`} />
      <LatestEvent entry={latestEvent} timelineHref={`/user/${username}/timeline`} viewerId={user.id} />
      <SummaryRows
        counts={summaryCounts}
        basePath={`/user/${username}`}
        passportHref={`/@${username}/passport`}
      />
      {/* Share — lands on the fan passport (same card, more fun destination). */}
      <div className="px-4 mt-4">
        <ShareButton
          url={`https://boxdseats.com/@${username}/passport`}
          title={`${profile.display_name || profile.username}'s Fan Passport on BoxdSeats`}
          text={`Check out ${profile.display_name || profile.username}'s fan passport on BoxdSeats`}
        />
      </div>
    </div>
  );
}
