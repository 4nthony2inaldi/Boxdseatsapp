import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  fetchProfileStats,
  fetchBigFour,
  fetchActivityChart,
  fetchPinnedLists,
  fetchTimeline,
} from "@/lib/queries/profile";
import {
  fetchUserProfileByUsername,
  fetchFollowRelationship,
  checkBlocked,
} from "@/lib/queries/social";
import ProfileHeader from "@/components/profile/ProfileHeader";
import StatsRow from "@/components/profile/StatsRow";
import BigFourSection from "@/components/profile/BigFourSection";
import ActivityChart from "@/components/profile/ActivityChart";
import PinnedLists from "@/components/profile/PinnedLists";
import Timeline from "@/components/profile/Timeline";
import FollowButton from "@/components/social/FollowButton";
import UserProfileActions from "@/components/social/UserProfileActions";

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
        <p className="text-text-muted">Please log in to view profiles.</p>
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

  // Check if blocked
  const isBlocked = await checkBlocked(supabase, user.id, profile.id);
  if (isBlocked) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">This profile is not available.</p>
      </div>
    );
  }

  const [followRel, stats] = await Promise.all([
    fetchFollowRelationship(supabase, user.id, profile.id),
    fetchProfileStats(supabase, profile.id),
  ]);

  // Private profile gating: if private and not following, gate content
  const isGated = profile.is_private && !followRel.isFollowing;

  // Stats row links point to this user's followers/following pages
  const statsWithLinks = {
    ...stats,
  };

  if (isGated) {
    return (
      <div className="max-w-lg mx-auto pb-5">
        <ProfileHeader profile={profile} stats={stats} />
        <div className="px-4 mb-3 flex items-center gap-2">
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
        </div>
        <StatsRow
          stats={statsWithLinks}
          followersHref={`/user/${username}/followers`}
          followingHref={`/user/${username}/following`}
        />
        <div className="px-4 py-12 text-center">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5A5F72"
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

  // Full profile — fetch remaining data
  const [bigFour, activityData, pinnedLists, timelineEntries] =
    await Promise.all([
      fetchBigFour(supabase, profile),
      fetchActivityChart(supabase, profile.id),
      fetchPinnedLists(supabase, profile.id, [
        profile.pinned_list_1_id,
        profile.pinned_list_2_id,
      ]),
      fetchTimeline(supabase, profile.id),
    ]);

  return (
    <div className="max-w-lg mx-auto pb-5">
      <ProfileHeader profile={profile} stats={stats} />
      <div className="px-4 mb-3 flex items-center gap-2">
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
      </div>
      <StatsRow
        stats={statsWithLinks}
        followersHref={`/user/${username}/followers`}
        followingHref={`/user/${username}/following`}
      />
      <BigFourSection items={bigFour} />
      <ActivityChart months={activityData.months} total={activityData.total} />
      <PinnedLists lists={pinnedLists} />
      <Timeline initialEntries={timelineEntries} userId={profile.id} />
    </div>
  );
}
