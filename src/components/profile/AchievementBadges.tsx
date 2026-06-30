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

// Split a label into two balanced lines so every tile reads as two lines (a
// one-line label looks inconsistent next to the multi-word ones). Multi-word
// labels split on the most-balanced space; a single hyphenated token splits at
// the hyphen; otherwise split near the middle.
function twoLines(label: string): [string, string] {
  const words = label.split(" ");
  if (words.length >= 2) {
    let best = 1;
    let bestDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = i;
      }
    }
    return [words.slice(0, best).join(" "), words.slice(best).join(" ")];
  }
  const h = label.indexOf("-");
  if (h > 0 && h < label.length - 1) return [label.slice(0, h + 1), label.slice(h + 1)];
  const mid = Math.ceil(label.length / 2);
  return [label.slice(0, mid), label.slice(mid)];
}

function BadgeTile({ badge, hrefBase }: { badge: EarnedBadge; hrefBase: string }) {
  const earned = badge.count > 0;
  const [line1, line2] = twoLines(badge.short);
  const inner = (
    <div className="relative">
      <div
        className={`w-[72px] h-[72px] rounded-2xl flex flex-col items-center justify-center text-center px-1.5 font-medium text-[10px] leading-[1.2] ${
          earned
            ? "bg-accent/15 text-accent border border-accent/40"
            : "bg-bg-elevated text-text-muted border border-border"
        }`}
      >
        <span>{line1}</span>
        <span>{line2}</span>
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
