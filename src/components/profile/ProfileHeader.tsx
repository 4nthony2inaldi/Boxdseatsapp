import type { ProfileData, ProfileStats } from "@/lib/queries/profile";
import { LEAGUES } from "@/lib/constants";

type ProfileHeaderProps = {
  profile: ProfileData;
  stats: ProfileStats;
};

const sportEmojis: Record<string, string> = {
  basketball: "🏀",
  football: "🏈",
  baseball: "⚾",
  hockey: "🏒",
  soccer: "⚽",
  golf: "⛳",
  tennis: "🎾",
  motorsports: "🏎️",
};

export default function ProfileHeader({ profile, stats }: ProfileHeaderProps) {
  const sportEmoji = profile.fav_sport
    ? sportEmojis[profile.fav_sport] || "🏟️"
    : null;

  return (
    <div className="flex items-center px-4 pt-2 gap-3.5 mb-3">
      {/* Avatar with sport badge */}
      <div className="relative shrink-0">
        <div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-border">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || profile.username}
              className="w-full h-full object-cover"
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
        {sportEmoji && (
          <div className="absolute -bottom-0.5 -right-0.5 w-[26px] h-[26px] rounded-full bg-bg flex items-center justify-center border-2 border-border">
            <span className="text-sm">{sportEmoji}</span>
          </div>
        )}
      </div>

      {/* Name, username, record */}
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-text-primary truncate">
          {profile.display_name || profile.username}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-text-muted">@{profile.username}</div>
          <div className="flex flex-col items-center">
            <span className="font-display text-[9px] text-text-muted tracking-[1px] uppercase leading-none mb-0.5">Fan Record</span>
            <div className="flex gap-1 items-center">
              <span className="text-[11px] text-win">{stats.wins}</span>
              <span className="text-[11px] text-text-muted">—</span>
              <span className="text-[11px] text-loss">{stats.losses}</span>
              <span className="text-[11px] text-text-muted">—</span>
              <span className="text-[11px] text-draw">{stats.draws}</span>
            </div>
          </div>
        </div>
        {profile.bio && (
          <div className="text-xs text-text-secondary leading-snug mt-1">
            {profile.bio}
          </div>
        )}
      </div>
    </div>
  );
}
