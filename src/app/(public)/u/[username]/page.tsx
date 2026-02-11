import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  fetchProfileStats,
  fetchBigFour,
  fetchActivityChart,
  fetchPinnedLists,
  fetchTimeline,
} from "@/lib/queries/profile";
import { fetchUserBadges, fetchTrackedIncomplete } from "@/lib/queries/badges";
import { fetchUserProfileByUsername } from "@/lib/queries/social";
import ProfileHeader from "@/components/profile/ProfileHeader";
import StatsRow from "@/components/profile/StatsRow";
import BigFourSection from "@/components/profile/BigFourSection";
import ActivityChart from "@/components/profile/ActivityChart";
import PinnedLists from "@/components/profile/PinnedLists";
import BadgeSection from "@/components/profile/BadgeSection";
import Timeline from "@/components/profile/Timeline";
import ShareButton from "@/components/sharing/ShareButton";
import Link from "next/link";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();
  const profile = await fetchUserProfileByUsername(supabase, username);

  if (!profile) {
    return { title: "User Not Found" };
  }

  const stats = await fetchProfileStats(supabase, profile.id);
  const displayName = profile.display_name || profile.username;
  const description = `${displayName} has attended ${stats.totalEvents} events across ${stats.totalVenues} venues on BoxdSeats.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://boxdseats.com";
  const ogImageUrl = `${siteUrl}/u/${username}/og`;

  return {
    title: `${displayName} (@${username})`,
    description,
    openGraph: {
      type: "profile",
      title: `${displayName} (@${username}) | BoxdSeats`,
      description,
      url: `${siteUrl}/@${username}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayName}'s BoxdSeats profile`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} (@${username}) | BoxdSeats`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  // Check if the visitor is logged in (optional — for CTA personalization)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await fetchUserProfileByUsername(supabase, username);

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="font-display text-2xl text-text-primary mb-2">
            User Not Found
          </h1>
          <p className="text-text-muted text-sm mb-6">
            This profile doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/login"
            className="inline-block bg-accent text-bg font-display text-sm tracking-wider uppercase px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Join BoxdSeats
          </Link>
        </div>
      </div>
    );
  }

  // Private profiles show limited info to non-followers
  const isOwnProfile = user?.id === profile.id;
  let isFollowing = false;

  if (user && !isOwnProfile) {
    const { data: followRow } = await supabase
      .from("follows")
      .select("status")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    isFollowing = followRow?.status === "active";
  }

  const isGated = profile.is_private && !isFollowing && !isOwnProfile;

  const stats = await fetchProfileStats(supabase, profile.id);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://boxdseats.com";

  if (isGated) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="max-w-lg mx-auto pb-8">
          {/* Gradient header */}
          <div className="h-16 bg-gradient-to-b from-accent/20 to-transparent" />
          <ProfileHeader profile={profile} stats={stats} />
          <StatsRow stats={stats} followersHref="#" followingHref="#" />
          {/* Gated message */}
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
            <p className="text-text-muted text-xs mb-6">
              Follow this user to see their events and activity.
            </p>
            {!user && (
              <Link
                href="/login"
                className="inline-block bg-accent text-bg font-display text-sm tracking-wider uppercase px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Log in to follow
              </Link>
            )}
          </div>
          {/* Share button */}
          <div className="px-4 mt-2">
            <ShareButton
              url={`${siteUrl}/@${username}`}
              title={`${profile.display_name || profile.username} on BoxdSeats`}
              text={`Check out ${profile.display_name || profile.username}'s profile on BoxdSeats`}
            />
          </div>
        </div>
      </div>
    );
  }

  // Full profile — fetch remaining data
  const [bigFour, activityData, pinnedLists, timelineEntries, badges, trackedIncomplete] =
    await Promise.all([
      fetchBigFour(supabase, profile),
      fetchActivityChart(supabase, profile.id),
      fetchPinnedLists(supabase, profile.id, [
        profile.pinned_list_1_id,
        profile.pinned_list_2_id,
      ]),
      fetchTimeline(supabase, profile.id),
      fetchUserBadges(supabase, profile.id),
      fetchTrackedIncomplete(supabase, profile.id),
    ]);

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto pb-8">
        {/* Gradient header */}
        <div className="h-16 bg-gradient-to-b from-accent/20 to-transparent" />

        <ProfileHeader profile={profile} stats={stats} />

        {/* Share button row */}
        <div className="px-4 mb-3">
          <ShareButton
            url={`${siteUrl}/@${username}`}
            title={`${profile.display_name || profile.username} on BoxdSeats`}
            text={`Check out ${profile.display_name || profile.username}'s profile on BoxdSeats`}
          />
        </div>

        <StatsRow stats={stats} followersHref="#" followingHref="#" />
        <BigFourSection items={bigFour} linkable={false} />
        <ActivityChart months={activityData.months} total={activityData.total} />
        <PinnedLists lists={pinnedLists} />
        <BadgeSection badges={badges} tracked={trackedIncomplete} userId={profile.id} />
        <Timeline initialEntries={timelineEntries} userId={profile.id} />

        {/* CTA for logged-out visitors */}
        {!user && (
          <div className="px-4 mt-6">
            <div className="bg-bg-card rounded-xl border border-border p-5 text-center">
              <p className="font-display text-lg text-text-primary tracking-wide mb-1">
                Join BoxdSeats
              </p>
              <p className="text-xs text-text-muted mb-4">
                Track your live event experiences and build your sports identity.
              </p>
              <Link
                href="/signup"
                className="inline-block bg-accent text-bg font-display text-sm tracking-wider uppercase px-8 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
              >
                Sign Up Free
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
