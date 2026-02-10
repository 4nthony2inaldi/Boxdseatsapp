import { createClient } from "@/lib/supabase/server";
import {
  fetchEventDetail,
  fetchUserEventLog,
  fetchEventAttendees,
  fetchEventComments,
} from "@/lib/queries/event";
import Link from "next/link";
import StarRating from "@/components/profile/StarRating";
import OutcomeBadge from "@/components/profile/OutcomeBadge";
import SectionLabel from "@/components/profile/SectionLabel";
import CommentsSection from "@/components/event/CommentsSection";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view event details.</p>
      </div>
    );
  }

  const event = await fetchEventDetail(supabase, id);
  if (!event) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Event not found.</p>
      </div>
    );
  }

  const [userLog, attendees] = await Promise.all([
    fetchUserEventLog(supabase, user.id, id),
    fetchEventAttendees(supabase, id, user.id),
  ]);

  // Fetch comments for the user's log if they have one
  const comments = userLog
    ? await fetchEventComments(supabase, userLog.id)
    : [];

  const formattedDate = new Date(event.event_date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" }
  );

  const isMatch = event.event_template === "match";
  const displayTitle = isMatch
    ? null // scoreboard handles it
    : event.tournament_name || "Event";

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      {/* League-colored gradient header */}
      <div className="relative -mx-4 mb-5">
        <div
          className="h-28"
          style={{
            background: `linear-gradient(to bottom, ${event.league_color}33, transparent)`,
          }}
        />
        <div className="px-4 -mt-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{event.league_icon}</span>
            <span
              className="font-display text-xs tracking-[1.5px] uppercase"
              style={{ color: event.league_color }}
            >
              {event.league_name}
            </span>
            {event.round_or_stage && (
              <>
                <span className="text-text-muted">·</span>
                <span className="text-xs text-text-muted">{event.round_or_stage}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Scoreboard / Event title */}
      {isMatch ? (
        <div className="bg-bg-card rounded-xl border border-border p-5 mb-5">
          <div className="flex items-center justify-center gap-6">
            {/* Away team */}
            <div className="text-center flex-1">
              <div className="font-display text-xl text-text-primary tracking-wider">
                {event.away_team_abbr || event.away_team_short || "AWAY"}
              </div>
              <div className="font-display text-4xl text-text-primary mt-1">
                {event.away_score ?? "—"}
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
                {event.home_score ?? "—"}
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9BA1B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="text-text-secondary">{formattedDate}</span>
        <span className="text-text-muted">·</span>
        <Link
          href={`/venue/${event.venue_id}`}
          className="text-accent hover:opacity-80 transition-opacity"
        >
          {event.venue_name}
        </Link>
      </div>

      {/* User's Log Entry */}
      {userLog && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <SectionLabel>Your Log</SectionLabel>
            <Link
              href={`/log?edit=${userLog.id}`}
              className="text-xs text-accent hover:opacity-80 transition-opacity font-display tracking-wider uppercase"
            >
              Edit
            </Link>
          </div>
          <div className="bg-bg-card rounded-xl border border-border p-4">
            {/* Outcome + Rating */}
            <div className="flex items-center justify-between mb-3">
              <OutcomeBadge outcome={userLog.outcome} />
              {userLog.rating && <StarRating rating={userLog.rating} size={16} />}
            </div>

            {/* Seat */}
            {userLog.seat_location && userLog.privacy === "show_all" && (
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A5F72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 16v-4a8 8 0 0 1 16 0v4" />
                  <path d="M4 16h16" />
                  <path d="M6 20v-4" />
                  <path d="M18 20v-4" />
                </svg>
                <span className="text-xs text-text-muted">{userLog.seat_location}</span>
              </div>
            )}

            {/* Notes */}
            {userLog.notes && userLog.privacy === "show_all" && (
              <div className="text-[13px] text-text-secondary leading-relaxed mb-3 italic">
                &ldquo;{userLog.notes}&rdquo;
              </div>
            )}

            {/* Companions */}
            {userLog.companions.length > 0 && userLog.privacy === "show_all" && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5A5F72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {userLog.companions.map((c, i) => (
                  <span key={i} className="text-xs text-text-muted">
                    {c.display_name}
                    {i < userLog.companions.length - 1 ? "," : ""}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BoxdSeats Attendees */}
      {attendees.length > 0 && (
        <div className="mb-6">
          <SectionLabel>BoxdSeats Attendees ({attendees.length})</SectionLabel>
          <div className="space-y-2">
            {attendees.map((attendee) => (
              <div
                key={attendee.id}
                className="bg-bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden">
                  {attendee.avatar_url ? (
                    <img
                      src={attendee.avatar_url}
                      alt={attendee.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent text-sm font-display">
                      {(attendee.display_name || attendee.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium truncate">
                    {attendee.display_name || attendee.username}
                  </div>
                  <div className="text-[11px] text-text-muted">@{attendee.username}</div>
                </div>

                {/* Rating + Outcome */}
                <div className="flex items-center gap-2">
                  {attendee.rating && <StarRating rating={attendee.rating} size={10} />}
                  <OutcomeBadge outcome={attendee.outcome} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      {userLog && (
        <div className="mb-6">
          <SectionLabel>Comments</SectionLabel>
          <CommentsSection
            eventLogId={userLog.id}
            userId={user.id}
            initialComments={comments}
          />
        </div>
      )}
    </div>
  );
}
