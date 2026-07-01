import Link from "next/link";
import SportIcon from "@/components/SportIcon";
import type { EarnedBadge } from "@/lib/queries/achievements";

/**
 * The profile's achievement badges: two horizontally-scrollable rows (event-
 * based, stat-based). Each tile is a fixed size (so a two-line label never
 * makes it taller than its neighbours) with the icon on a light disc and the
 * label below. Earned tiles are full-color, accent-tinted, and tappable with an
 * "xN" count when earned more than once; locked tiles are greyscaled, dimmed,
 * and inert. The icon carries the context, so labels stay short (both hat
 * tricks read "Hat Trick").
 */

/** Non-sport badge glyphs — currentColor so they take the tile's accent/muted
 *  color, unlike the ball SVGs (which are full-color). Keeps the few badges
 *  that aren't a sport (countries, all-star) from falling back to a generic
 *  mark. Road Game reuses the motorsports (car) sport icon via SportIcon. */
function BadgeIcon({ icon }: { icon?: string }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (icon === "globe") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <ellipse cx="12" cy="12" rx="4" ry="9" />
      </svg>
    );
  }
  if (icon === "star") {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden>
        <path d="M12 3l2.35 4.76 5.25.76-3.8 3.7.9 5.24L12 15.9l-4.7 2.47.9-5.24-3.8-3.7 5.25-.76z" />
      </svg>
    );
  }
  return <SportIcon sport={icon} size={18} />;
}

function BadgeTile({ badge, hrefBase }: { badge: EarnedBadge; hrefBase: string }) {
  const earned = badge.count > 0;
  const inner = (
    <div className="relative">
      <div
        className={`w-[68px] h-16 rounded-2xl flex flex-col items-center justify-center gap-1 px-1.5 ${
          earned
            ? "bg-accent/15 text-accent border border-accent/40"
            : "bg-bg-elevated text-text-muted border border-border"
        }`}
      >
        {/* Light disc so every icon (even the dark hockey puck) reads on the
            dark tile; greyscaled when locked. */}
        <span
          className={`w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 ${
            earned ? "" : "grayscale"
          }`}
        >
          <BadgeIcon icon={badge.icon} />
        </span>
        {/* Fixed two-line box so every tile is the same height whether the label
            is one line or two. */}
        <span className="h-[21px] flex items-center justify-center">
          <span className="font-medium text-[9px] leading-[1.15] text-center line-clamp-2">{badge.short}</span>
        </span>
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
