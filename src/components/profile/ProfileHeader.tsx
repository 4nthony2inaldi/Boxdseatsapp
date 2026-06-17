import Link from "next/link";
import type { ProfileData, ProfileStats } from "@/lib/queries/profile";
import SportIcon from "@/components/SportIcon";
import AvatarButton from "./AvatarButton";

type ProfileHeaderProps = {
  profile: ProfileData;
  stats: ProfileStats;
};

export default function ProfileHeader({ profile, stats }: ProfileHeaderProps) {
  return (
    <div className="flex items-start px-4 pt-6 gap-4 mb-5">
      {/* Avatar with sport badge */}
      <div className="relative shrink-0">
        <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-border">
          {profile.avatar_url ? (
            <AvatarButton
              src={profile.avatar_url}
              alt={profile.display_name || profile.username}
              size={72}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #D4872C 0%, #7B5B3A 100%)",
              }}
            >
              <span className="font-display text-3xl text-white">
                {(
                  profile.display_name ||
                  profile.username ||
                  "?"
                )
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>
          )}
        </div>
        {/* Sport badge */}
        {profile.fav_sport && (
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-bg flex items-center justify-center border-2 border-accent/40">
            <SportIcon sport={profile.fav_sport} size={20} />
          </div>
        )}
      </div>

      {/* Name, username, record */}
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-lg font-semibold text-text-primary truncate leading-tight">
              {profile.display_name || profile.username}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              @{profile.username}
            </div>
          </div>
          <Link
            href="/timeline"
            className="flex flex-col items-end shrink-0 hover:opacity-80 transition-opacity"
            aria-label="View your timeline"
          >
            <span className="font-display text-[10px] text-text-muted tracking-[1px] uppercase leading-none mb-1">Fan Record</span>
            <div className="flex gap-1.5 items-center">
              <span className="font-display text-base text-win leading-none">{stats.wins}</span>
              <span className="text-xs text-text-muted">—</span>
              <span className="font-display text-base text-loss leading-none">{stats.losses}</span>
              <span className="text-xs text-text-muted">—</span>
              <span className="font-display text-base text-draw leading-none">{stats.draws}</span>
            </div>
          </Link>
        </div>
        {profile.bio && (
          <div className="text-xs text-text-secondary leading-relaxed mt-2">
            {profile.bio}
          </div>
        )}
      </div>
    </div>
  );
}
