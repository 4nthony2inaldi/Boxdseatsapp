import type { ProfileStats } from "@/lib/queries/profile";
import StatBox from "./StatBox";

type StatsRowProps = {
  stats: ProfileStats;
  followersHref?: string;
  followingHref?: string;
};

export default function StatsRow({
  stats,
  followersHref = "/profile/followers",
  followingHref = "/profile/following",
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-2 px-4 mb-5">
      <StatBox value={stats.totalEvents} label="Events" />
      <StatBox value={stats.totalVenues} label="Venues" />
      <StatBox
        value={stats.followers}
        label="Followers"
        href={followersHref}
      />
      <StatBox
        value={stats.following}
        label="Following"
        href={followingHref}
      />
    </div>
  );
}
