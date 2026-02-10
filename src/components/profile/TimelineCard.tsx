import type { TimelineEntry } from "@/lib/queries/profile";
import { LEAGUES } from "@/lib/constants";
import StarRating from "./StarRating";
import OutcomeBadge from "./OutcomeBadge";

type TimelineCardProps = {
  entry: TimelineEntry;
};

export default function TimelineCard({ entry }: TimelineCardProps) {
  const leagueKey = entry.league_slug as keyof typeof LEAGUES | null;
  const leagueData = leagueKey ? LEAGUES[leagueKey] : null;
  const leagueIcon = leagueData?.icon || "🏟️";
  const leagueColor = leagueData?.color || "#D4872C";

  const formattedDate = new Date(entry.event_date + "T00:00:00").toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );

  return (
    <div className="bg-bg-card rounded-[14px] border border-border overflow-hidden mb-3">
      <div className="px-4 py-3.5">
        {/* Header row: league + outcome + stars */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-base">{leagueIcon}</span>
            <span
              className="font-display text-xs tracking-[1.5px] uppercase opacity-90"
              style={{ color: leagueColor }}
            >
              {entry.league_slug || ""}
            </span>
            <OutcomeBadge outcome={entry.outcome} />
          </div>
          {entry.rating && <StarRating rating={entry.rating} />}
        </div>

        {/* Matchup line */}
        {entry.matchup && (
          <div className="font-display text-xl text-text-primary tracking-wide leading-tight mb-1 cursor-pointer hover:opacity-80">
            {entry.matchup}
          </div>
        )}

        {/* Venue + Date */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#5A5F72"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-xs text-text-secondary cursor-pointer hover:opacity-80">
            {entry.venue_name}
          </span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">{formattedDate}</span>
        </div>

        {/* Notes */}
        {entry.notes && entry.privacy === "show_all" && (
          <div className="text-[13px] text-text-secondary leading-relaxed mb-3 italic">
            &ldquo;{entry.notes}&rdquo;
          </div>
        )}
        {entry.privacy === "hide_personal" && (
          <div className="flex items-center gap-1.5 mb-3">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F72"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="text-[11px] text-text-muted">
              Personal details hidden
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-5 border-t border-border pt-2.5">
          <div className="flex items-center gap-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="transparent"
              stroke="#5A5F72"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className="text-xs text-text-muted">
              {entry.like_count}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F72"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span className="text-xs text-text-muted">
              {entry.comment_count}
            </span>
          </div>
          <div className="ml-auto">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F72"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
