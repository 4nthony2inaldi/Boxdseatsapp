import { createClient } from "@/lib/supabase/server";
import {
  fetchProfile,
  fetchProfileStats,
  fetchBigFour,
  fetchActivityChart,
  fetchPinnedLists,
  fetchTimeline,
} from "@/lib/queries/profile";
import ProfileHeader from "@/components/profile/ProfileHeader";
import StatsRow from "@/components/profile/StatsRow";
import BigFourSection from "@/components/profile/BigFourSection";
import ActivityChart from "@/components/profile/ActivityChart";
import PinnedLists from "@/components/profile/PinnedLists";
import Timeline from "@/components/profile/Timeline";

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

  const [stats, bigFour, activityData, pinnedLists, timelineEntries] =
    await Promise.all([
      fetchProfileStats(supabase, user.id),
      fetchBigFour(supabase, profile),
      fetchActivityChart(supabase, user.id),
      fetchPinnedLists(supabase, user.id, [
        profile.pinned_list_1_id,
        profile.pinned_list_2_id,
      ]),
      fetchTimeline(supabase, user.id),
    ]);

  return (
    <div className="max-w-lg mx-auto pb-5">
      <ProfileHeader profile={profile} stats={stats} />
      <StatsRow stats={stats} />
      <BigFourSection items={bigFour} />
      <ActivityChart months={activityData.months} total={activityData.total} />
      <PinnedLists lists={pinnedLists} />
      <Timeline initialEntries={timelineEntries} userId={user.id} />
    </div>
  );
}
