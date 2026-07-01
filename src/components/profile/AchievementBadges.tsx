import Link from "next/link";
import SportIcon from "@/components/SportIcon";
import type { EarnedBadge } from "@/lib/queries/achievements";

/**
 * The profile's achievement badges: two horizontally-scrollable rows (event-
 * based, stat-based). Each compact tile shows the sport icon on a light disc
 * with the label below (one line, or two when it needs it). Earned tiles are
 * full-color, accent-tinted, and tappable with an "xN" count when earned more
 * than once; locked tiles are greyscaled, dimmed, and inert. The sport icon
 * carries the context, so labels stay short (both hat tricks read "Hat Trick").
 */

function BadgeTile({ badge, hrefBase }: { badge: EarnedBadge; hrefBase: string }) {
  const earned = badge.count > 0;
  const inner = (
    <div className="relative">
      <div
        className={`w-[68px] min-h-[54px] rounded-2xl flex flex-col items-center justify-center gap-1 text-center px-1.5 py-2 ${
          earned
            ? "bg-accent/15 text-accent border border-accent/40"
            : "bg-bg-elevated text-text-muted border border-border"
        }`}
      >
        {/* Light disc so every sport icon (even the dark hockey puck) reads on
            the dark tile; greyscaled when locked. */}
        <span
          className={`w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 ${
            earned ? "" : "grayscale"
          }`}
        >
          <SportIcon sport={badge.icon} size={18} />
        </span>
        <span className="font-medium text-[9px] leading-[1.15] line-clamp-2">{badge.short}</span>
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
    <Link href={`${hrefBase}/${badge.key}`} className={`${className} block active:opacity-80 transition-opacity`}>
      {inner}
    </Link>
  );
}

function Row({ title, badges, hrefBase }: { title: string; badges: EarnedBadge[]; hrefBase: string }) {
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
          <BadgeTile key={b.key} badge={b} hrefBase={hrefBase} />
        ))}
      </div>
    </div>
  );
}

/** hrefBase: where a badge links for its games (own profile vs a public one). */
export default function AchievementBadges({
  badges,
  hrefBase = "/profile/badges",
}: {
  badges: EarnedBadge[];
  hrefBase?: string;
}) {
  const event = badges.filter((b) => b.group === "event");
  const stat = badges.filter((b) => b.group === "stat");
  return (
    <div className="mb-2">
      <Row title="Game Badges" badges={event} hrefBase={hrefBase} />
      <Row title="Stat Badges" badges={stat} hrefBase={hrefBase} />
    </div>
  );
}
