"use client";

import Link from "next/link";
import { LEAGUES } from "@/lib/constants";
import StarRating from "./profile/StarRating";
import OutcomeBadge from "./profile/OutcomeBadge";

export type TimelineAuthor = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type TimelineCardEntry = {
  id: string;
  event_date: string;
  rating: number | null;
  notes: string | null;
  outcome: string | null;
  privacy: string;
  like_count: number;
  comment_count: number;
  seat_location: string | null;
  league_slug: string | null;
  league_name: string | null;
  venue_name: string | null;
  venue_id: string | null;
  event_id: string | null;
  matchup: string | null;
  home_team_short: string | null;
  away_team_short: string | null;
  home_score: number | null;
  away_score: number | null;
  sport: string | null;
  // Manual entry fields
  manual_title?: string | null;
  is_manual?: boolean;
};

type TimelineCardProps = {
  entry: TimelineCardEntry;
  showAuthor?: boolean;
  author?: TimelineAuthor | null;
  liked?: boolean;
  onLike?: (entryId: string) => void;
  onComment?: (entryId: string) => void;
  onShare?: (entryId: string) => void;
};

export default function TimelineCard({
  entry,
  showAuthor = false,
  author,
  liked = false,
  onLike,
  onComment,
  onShare,
}: TimelineCardProps) {
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

  const displayTitle = entry.matchup || entry.manual_title || null;

  return (
    <div className="bg-bg-card rounded-[14px] border border-border overflow-hidden mb-3">
      <div className="px-4 py-3.5">
        {/* Author row (feed mode only) */}
        {showAuthor && author && (
          <Link
            href={`/user/${author.username}`}
            className="flex items-center gap-2.5 mb-3 pb-3 border-b border-border"
          >
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden">
              {author.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt={author.display_name || author.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent text-sm font-display">
                  {(
                    author.display_name ||
                    author.username ||
                    "?"
                  )[0].toUpperCase()}
                </div>
              )}
            </div>
            {/* Name + username + timestamp */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary font-medium truncate">
                {author.display_name || author.username}
              </div>
              <div className="text-[11px] text-text-muted">
                @{author.username}
              </div>
            </div>
            <span className="text-[11px] text-text-muted shrink-0">
              {formattedDate}
            </span>
          </Link>
        )}

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
        {displayTitle && (
          entry.event_id ? (
            <Link href={`/event/${entry.event_id}`} className="block">
              <div className="font-display text-xl text-text-primary tracking-wide leading-tight mb-1 cursor-pointer hover:opacity-80">
                {displayTitle}
              </div>
            </Link>
          ) : (
            <div className="font-display text-xl text-text-primary tracking-wide leading-tight mb-1">
              {displayTitle}
            </div>
          )
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
          {entry.venue_id ? (
            <Link href={`/venue/${entry.venue_id}`} className="text-xs text-text-secondary hover:text-accent transition-colors" onClick={(e) => e.stopPropagation()}>
              {entry.venue_name}
            </Link>
          ) : (
            <span className="text-xs text-text-secondary">
              {entry.venue_name}
            </span>
          )}
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">{formattedDate}</span>
        </div>

        {/* Seat location */}
        {entry.seat_location && entry.privacy === "show_all" && (
          <div className="flex items-center gap-1.5 mb-2">
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
              <path d="M4 16v-4a8 8 0 0 1 16 0v4" />
              <path d="M4 16h16" />
              <path d="M6 20v-4" />
              <path d="M18 20v-4" />
            </svg>
            <span className="text-[11px] text-text-muted">
              {entry.seat_location}
            </span>
          </div>
        )}

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
          <button
            onClick={() => onLike?.(entry.id)}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={liked ? "#F87171" : "transparent"}
              stroke={liked ? "#F87171" : "#5A5F72"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            <span className={`text-xs ${liked ? "text-red-400" : "text-text-muted"}`}>{entry.like_count}</span>
          </button>
          <button
            onClick={() => onComment?.(entry.id)}
            className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0"
          >
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
          </button>
          <button
            onClick={() => onShare?.(entry.id)}
            className="ml-auto bg-transparent border-none cursor-pointer p-0"
          >
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
          </button>
        </div>
      </div>
    </div>
  );
}
