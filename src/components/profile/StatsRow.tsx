import type { ProfileStats } from "@/lib/queries/profile";
import StatBox from "./StatBox";

type StatsRowProps = {
  stats: ProfileStats;
  eventsHref?: string;
  venuesHref?: string;
  followersHref?: string;
  followingHref?: string;
};

export default function StatsRow({
  stats,
  eventsHref,
  venuesHref,
  followersHref = "/profile/followers",
  followingHref = "/profile/following",
}: StatsRowProps) {
  return (
    <div className="grid grid-cols-4 gap-2 px-4 mb-5">
      <StatBox value={stats.totalEvents} label="Events" href={eventsHref} />
      <StatBox value={stats.totalVenues} label="Venues" href={venuesHref} />
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
