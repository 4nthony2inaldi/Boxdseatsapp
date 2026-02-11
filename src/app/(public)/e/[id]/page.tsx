import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { fetchEventDetail } from "@/lib/queries/event";
import { fetchPublicEventLog } from "@/lib/queries/sharing";
import SportIcon from "@/components/SportIcon";
import StarRating from "@/components/profile/StarRating";
import OutcomeBadge from "@/components/profile/OutcomeBadge";
import ShareButton from "@/components/sharing/ShareButton";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const logEntry = await fetchPublicEventLog(supabase, id);

  if (!logEntry) {
    return { title: "Event Not Found" };
  }

  const displayTitle = logEntry.matchup || logEntry.manual_title || "Event";
  const venue = logEntry.venue_name || "";
  const date = new Date(logEntry.event_date + "T00:00:00").toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" }
  );

  const authorName = logEntry.author_display_name || logEntry.author_username;
  const description = `${authorName} attended ${displayTitle} at ${venue} on ${date}`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://boxdseats.com";
  const ogImageUrl = `${siteUrl}/e/${id}/og`;

  return {
    title: `${displayTitle} — ${authorName}`,
    description,
    openGraph: {
      type: "article",
      title: `${displayTitle} | BoxdSeats`,
      description,
      url: `${siteUrl}/e/${id}`,
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: displayTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayTitle} | BoxdSeats`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function PublicEventLogPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const siteUrlPage = process.env.NEXT_PUBLIC_SITE_URL || "https://boxdseats.com";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const logEntry = await fetchPublicEventLog(supabase, id);

  if (!logEntry) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="font-display text-2xl text-text-primary mb-2">
            Event Not Found
          </h1>
          <p className="text-text-muted text-sm mb-6">
            This event log doesn&apos;t exist, is private, or has been removed.
          </p>
          <Link
            href="/login"
            className="inline-block bg-accent text-bg font-display text-sm tracking-wider uppercase px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Join BoxdSeats
          </Link>
        </div>
      </div>
    );
  }

  // Fetch full event details if there's an event_id
  const event = logEntry.event_id
    ? await fetchEventDetail(supabase, logEntry.event_id)
    : null;

  const displayTitle =
    logEntry.matchup || logEntry.manual_title || event?.tournament_name || "Event";

  const formattedDate = new Date(
    logEntry.event_date + "T00:00:00"
  ).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isMatch = event?.event_template === "match";

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto pb-8">
        {/* League-colored gradient header */}
        {event && (
          <div className="relative mb-5">
            <div
              className="h-28"
              style={{
                background: `linear-gradient(to bottom, ${event.league_color}33, transparent)`,
              }}
            />
            <div className="px-4 -mt-10">
              <div className="flex items-center gap-2 mb-2">
                <SportIcon src={event.league_icon} size={22} />
                <span
                  className="font-display text-xs tracking-[1.5px] uppercase"
                  style={{ color: event.league_color }}
                >
                  {event.league_name}
                </span>
                {event.round_or_stage && (
                  <>
                    <span className="text-text-muted">&middot;</span>
                    <span className="text-xs text-text-muted">
                      {event.round_or_stage}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {!event && (
          <div className="h-16 bg-gradient-to-b from-accent/20 to-transparent" />
        )}

        {/* Scoreboard / Event title */}
        <div className="px-4">
          {isMatch && event ? (
            <div className="bg-bg-card rounded-xl border border-border p-5 mb-5">
              <div className="flex items-center justify-center gap-6">
                {/* Away team */}
                <div className="text-center flex-1">
                  <div className="font-display text-xl text-text-primary tracking-wider">
                    {event.away_team_abbr || event.away_team_short || "AWAY"}
                  </div>
                  <div className="font-display text-4xl text-text-primary mt-1">
                    {event.away_score ?? "\u2014"}
                  </div>
                </div>
                {/* VS divider */}
                <div className="font-display text-text-muted text-sm tracking-wider">
                  VS
                </div>
                {/* Home team */}
                <div className="text-center flex-1">
                  <div className="font-display text-xl text-text-primary tracking-wider">
                    {event.home_team_abbr || event.home_team_short || "HOME"}
                  </div>
                  <div className="font-display text-4xl text-text-primary mt-1">
                    {event.home_score ?? "\u2014"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-5">
              <h1 className="font-display text-2xl text-text-primary tracking-wide">
                {displayTitle}
              </h1>
            </div>
          )}

          {/* Date + Venue */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9BA1B5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span className="text-text-secondary">{formattedDate}</span>
            {logEntry.venue_name && (
              <>
                <span className="text-text-muted">&middot;</span>
                <span className="text-accent">{logEntry.venue_name}</span>
              </>
            )}
          </div>

          {/* Author info */}
          <Link
            href={`/@${logEntry.author_username}`}
            className="flex items-center gap-3 mb-5 bg-bg-card rounded-xl border border-border px-4 py-3 hover:bg-bg-elevated/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden">
              {logEntry.author_avatar_url ? (
                <img
                  src={logEntry.author_avatar_url}
                  alt={logEntry.author_username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent text-sm font-display">
                  {(
                    logEntry.author_display_name ||
                    logEntry.author_username ||
                    "?"
                  )
                    .charAt(0)
                    .toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary font-medium truncate">
                {logEntry.author_display_name || logEntry.author_username}
              </div>
              <div className="text-[11px] text-text-muted">
                @{logEntry.author_username}
              </div>
            </div>
          </Link>

          {/* Log entry details */}
          <div className="bg-bg-card rounded-xl border border-border p-4 mb-5">
            {/* Outcome + Rating */}
            <div className="flex items-center justify-between mb-3">
              <OutcomeBadge outcome={logEntry.outcome} />
              {logEntry.rating && (
                <StarRating rating={logEntry.rating} size={16} />
              )}
            </div>

            {/* Seat */}
            {logEntry.seat_location && logEntry.privacy === "show_all" && (
              <div className="flex items-center gap-1.5 mb-2">
                <svg
                  width="13"
                  height="13"
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
                <span className="text-xs text-text-muted">
                  {logEntry.seat_location}
                </span>
              </div>
            )}

            {/* Notes */}
            {logEntry.notes && logEntry.privacy === "show_all" && (
              <div className="text-[13px] text-text-secondary leading-relaxed italic">
                &ldquo;{logEntry.notes}&rdquo;
              </div>
            )}
          </div>

          {/* Share button */}
          <ShareButton
            url={`${siteUrlPage}/e/${id}`}
            title={`${displayTitle} — BoxdSeats`}
            text={`${logEntry.author_display_name || logEntry.author_username} attended ${displayTitle}`}
          />

          {/* CTA for logged-out visitors */}
          {!user && (
            <div className="mt-6">
              <div className="bg-bg-card rounded-xl border border-border p-5 text-center">
                <p className="font-display text-lg text-text-primary tracking-wide mb-1">
                  Join BoxdSeats
                </p>
                <p className="text-xs text-text-muted mb-4">
                  Track your live event experiences and build your sports
                  identity.
                </p>
                <Link
                  href="/signup"
                  className="inline-block bg-accent text-bg font-display text-sm tracking-wider uppercase px-8 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
                >
                  Sign Up Free
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
