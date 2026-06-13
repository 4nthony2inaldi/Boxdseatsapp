import Link from "next/link";

export type ComparisonItem = {
  id: string;
  venue_id: string | null;
  display_name: string;
  city: string | null;
  state: string | null;
  viewerVisited: boolean;
  ownerVisited: boolean;
};

type Props = {
  items: ComparisonItem[];
  totalItems: number;
  /** Display name (or username) of the profile owner being compared against. */
  ownerName: string;
};

// Small check / empty indicator for a single person's visited status.
function Marker({ filled }: { filled: boolean }) {
  return (
    <div
      className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${
        filled ? "bg-win/20 text-win" : "border border-border text-transparent"
      }`}
    >
      {filled && (
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </div>
  );
}

export default function ListComparison({ items, totalItems, ownerName }: Props) {
  const youCount = items.filter((i) => i.viewerVisited).length;
  const themCount = items.filter((i) => i.ownerVisited).length;
  const bothCount = items.filter((i) => i.viewerVisited && i.ownerVisited).length;

  const pct = (n: number) =>
    totalItems > 0 ? Math.round((n / totalItems) * 100) : 0;

  return (
    <div>
      {/* Comparison summary */}
      <div className="bg-bg-card rounded-xl border border-border p-4 mb-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-text-muted mb-0.5">You</div>
            <div className="font-display text-2xl text-accent tracking-wide">
              {youCount}
              <span className="text-base text-text-secondary">/{totalItems}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-text-muted mb-0.5 truncate">{ownerName}</div>
            <div className="font-display text-2xl text-accent tracking-wide">
              {themCount}
              <span className="text-base text-text-secondary">/{totalItems}</span>
            </div>
          </div>
        </div>
        <div className="pt-3 border-t border-border text-sm text-text-secondary">
          Visited by both:{" "}
          <span className="text-text-primary font-medium">
            {bothCount} of {totalItems}
          </span>{" "}
          <span className="text-text-muted">({pct(bothCount)}%)</span>
        </div>
      </div>

      {/* Per-item comparison */}
      <div className="flex items-center justify-end gap-3 px-1 mb-2">
        <span className="text-[11px] font-display tracking-[1px] uppercase text-text-muted w-5 text-center">
          You
        </span>
        <span className="text-[11px] font-display tracking-[1px] uppercase text-text-muted w-5 text-center">
          {ownerName.slice(0, 4)}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const location = item.city
            ? item.state
              ? `${item.city}, ${item.state}`
              : item.city
            : null;
          const both = item.viewerVisited && item.ownerVisited;
          const row = (
            <div
              className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
                both
                  ? "bg-bg-card border-accent/40"
                  : "bg-bg-card/50 border-border/50"
              }`}
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm block text-text-primary">
                  {item.display_name}
                </span>
                {location && (
                  <span className="text-xs text-text-muted block mt-0.5">
                    {location}
                  </span>
                )}
              </div>
              <Marker filled={item.viewerVisited} />
              <Marker filled={item.ownerVisited} />
            </div>
          );

          return item.venue_id ? (
            <Link key={item.id} href={`/venue/${item.venue_id}`} className="block">
              {row}
            </Link>
          ) : (
            <div key={item.id}>{row}</div>
          );
        })}
      </div>
    </div>
  );
}
