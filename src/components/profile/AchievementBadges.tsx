import Link from "next/link";
import type { EarnedBadge } from "@/lib/queries/achievements";

/**
 * Mock UI for the profile's achievement badges: two horizontally-scrollable
 * rows (event-based, stat-based). The label sits inside the tile (small font);
 * earned badges are tappable and carry an "xN" count when earned more than
 * once; locked badges are greyed and inert. Tile art is a placeholder — the
 * real per-badge design comes later; this wires up data, layout, and the
 * click-through to the games list.
 */

function BadgeTile({ badge }: { badge: EarnedBadge }) {
  const earned = badge.count > 0;
  const inner = (
    <div className="relative">
      <div
        className={`w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-center px-1.5 font-medium text-[10px] leading-[1.15] ${
          earned
            ? "bg-accent/15 text-accent border border-accent/40"
            : "bg-bg-elevated text-text-muted border border-border"
        }`}
      >
        {badge.short}
      </div>
      {earned && badge.count > 1 && (
        <span
          className="absolute -bottom-1 -right-1 rounded-full bg-accent text-bg text-[10px] font-display leading-none px-1.5 py-0.5"
          aria-label={`${badge.count} times`}
        >
          {badge.count}×
        </span>
      )}
    </div>
  );

  const className = "shrink-0";
  if (!earned) {
    return (
      <div className={`${className} opacity-50`} aria-disabled>
        {inner}
      </div>
    );
  }
  return (
    <Link href={`/profile/badges/${badge.key}`} className={`${className} block active:opacity-80 transition-opacity`}>
      {inner}
    </Link>
  );
}

function Row({ title, badges }: { title: string; badges: EarnedBadge[] }) {
  if (badges.length === 0) return null;
  // Earned first (most-earned first), then locked, so the collection reads well.
  const sorted = [...badges].sort((a, b) => b.count - a.count);
  return (
    <div className="mb-5">
      <div className="px-4 mb-2.5">
        <span className="font-display text-[13px] text-text-muted tracking-[2px] uppercase">{title}</span>
      </div>
      <div className="pl-4 pr-4 flex gap-3 overflow-x-auto pb-1 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
        {sorted.map((b) => (
          <BadgeTile key={b.key} badge={b} />
        ))}
      </div>
    </div>
  );
}

export default function AchievementBadges({ badges }: { badges: EarnedBadge[] }) {
  const event = badges.filter((b) => b.group === "event");
  const stat = badges.filter((b) => b.group === "stat");
  return (
    <div className="mb-2">
      <Row title="Game Badges" badges={event} />
      <Row title="Stat Badges" badges={stat} />
    </div>
  );
}
