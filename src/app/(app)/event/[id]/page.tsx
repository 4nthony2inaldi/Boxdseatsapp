import { createClient } from "@/lib/supabase/server";
import {
  fetchEventDetail,
  fetchUserEventLog,
  fetchEventAttendees,
  fetchEventComments,
  fetchEventDiscussion,
  fetchEventGallery,
  fetchTournamentAttendance,
} from "@/lib/queries/event";
import { fetchCoverPhotoCredit, ensureVotingWindow } from "@/lib/queries/coverPhotos";
import Link from "next/link";
import Image from "next/image";
import StarRating from "@/components/profile/StarRating";
import OutcomeBadge from "@/components/profile/OutcomeBadge";
import SectionLabel from "@/components/profile/SectionLabel";
import CommentsSection from "@/components/event/CommentsSection";
import SportIcon from "@/components/SportIcon";
import ShareButton from "@/components/sharing/ShareButton";
import VerifiedBadge from "@/components/VerifiedBadge";
import { CameraIcon } from "@/components/icons";
import BackButton from "@/components/BackButton";
import { ButtonLink } from "@/components/Button";
import EventGallery from "@/components/event/EventGallery";
import { formatDate } from "@/lib/formatters";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ log?: string }>;
}) {
  const { id } = await params;
  const { log: focusLogId } = await searchParams;
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

  // Ensure voting window is set for this event
  await ensureVotingWindow(supabase, id, event.event_date);

  const [userLog, attendees, gallery, coverCredit, tournamentDays] = await Promise.all([
    fetchUserEventLog(supabase, user.id, id),
    fetchEventAttendees(supabase, id, user.id),
    fetchEventGallery(supabase, id, user.id),
    event.cover_photo_event_log_id
      ? fetchCoverPhotoCredit(supabase, event.cover_photo_event_log_id)
      : Promise.resolve(null),
    event.tournament_id
      ? fetchTournamentAttendance(supabase, event.tournament_id, user.id)
      : Promise.resolve([]),
  ]);

  // Event-level discussion room (shared per-game thread, open to anyone).
  const discussion = await fetchEventDiscussion(supabase, id);

  // Fetch comments for the user's log if they have one
  const comments = userLog
    ? await fetchEventComments(supabase, userLog.id)
    : [];

  // Deep link from a feed card's comment icon: show that log's thread
  let focusLog: { id: string; user_id: string; username: string; display_name: string | null } | null = null;
  let focusComments: Awaited<ReturnType<typeof fetchEventComments>> = [];
  if (focusLogId && focusLogId !== userLog?.id) {
    const { data: fl } = await supabase
      .from("event_logs")
      .select("id, user_id, profiles!event_logs_user_id_fkey(username, display_name)")
      .eq("id", focusLogId)
      .eq("event_id", id)
      .neq("privacy", "hide_all") // never surface someone else's private log via a deep link
      .maybeSingle();
    if (fl) {
      const prof = fl.profiles as unknown as { username: string; display_name: string | null } | null;
      focusLog = { id: fl.id, user_id: fl.user_id, username: prof?.username || "", display_name: prof?.display_name ?? null };
      focusComments = await fetchEventComments(supabase, fl.id);
    }
  }

  const formattedDate = formatDate(event.event_date, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const isMatch = event.event_template === "match";
  const displayTitle = isMatch
    ? null // scoreboard handles it
    : event.tournament_name || "Event";

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      {/* Hero: cover photo (or league-colored gradient) flush at the top, with
          the back button overlaid on it — matches the venue page. */}
      <div className="relative -mx-4 mb-5">
        <div className="absolute top-3 left-3 z-10">
          <BackButton fallback="/" />
        </div>
        {coverCredit ? (
          <div className="relative">
            <Image
              src={coverCredit.photo_url}
              alt="Event cover photo"
              width={600}
              height={176}
              sizes="(max-width: 512px) 100vw, 512px"
              quality={75}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
            <div className="absolute bottom-2 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
              <CameraIcon size={11} className="text-white/80" />
              <span className="text-[10px] text-white/80">
                @{coverCredit.username}
              </span>
            </div>
          </div>
        ) : event.venue_photo_url ? (
          <div className="relative">
            <Image
              src={event.venue_photo_url}
              alt={event.venue_name || "Venue"}
              width={600}
              height={176}
              sizes="(max-width: 512px) 100vw, 512px"
              quality={75}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
            <div className="absolute bottom-2 left-4 right-4">
              <span className="text-sm font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                {event.venue_name}
              </span>
            </div>
          </div>
        ) : (
          <div
            className="h-28"
            style={{
              background: `linear-gradient(to bottom, ${event.league_color}33, transparent)`,
            }}
          />
        )}
        <div className={`px-4 ${coverCredit || event.venue_photo_url ? "-mt-8" : "-mt-10"}`}>
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
            <div className="text-center flex-1 min-w-0">
              {event.away_team_city && (
                <div className="text-[11px] text-text-muted truncate">
                  {event.away_team_city}
                </div>
              )}
              <div className="font-display text-xl text-text-primary tracking-wider">
                {event.away_team_short || event.away_team_abbr || "AWAY"}
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
            <div className="text-center flex-1 min-w-0">
              {event.home_team_city && (
                <div className="text-[11px] text-text-muted truncate">
                  {event.home_team_city}
                </div>
              )}
              <div className="font-display text-xl text-text-primary tracking-wider">
                {event.home_team_short || event.home_team_abbr || "HOME"}
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
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {/* Log affordance — the page every "Were you there?" lands on */}
      <div className="mb-6">
        {userLog ? (
          <Link
            href={`/log?edit=${userLog.id}`}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-win/40 bg-win/10 text-win text-sm font-medium active:opacity-80 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            You were there — view your log
          </Link>
        ) : (
          <ButtonLink href={`/log?eventId=${event.id}`} size="lg" fullWidth>
            I WAS THERE — LOG IT
          </ButtonLink>
        )}
      </div>

      {/* Tournament Days Attendance */}
      {tournamentDays.length > 1 && (
        <div className="mb-6">
          <SectionLabel>
            {event.tournament_name || "Tournament"} Attendance
          </SectionLabel>
          {(() => {
            const attended = tournamentDays.filter((d) => d.user_attended).length;
            return (
              <div className="bg-bg-card rounded-xl border border-border p-4">
                <div className="text-sm text-text-secondary mb-3">
                  Attended{" "}
                  <span className="text-accent font-medium">{attended}</span>{" "}
                  of {tournamentDays.length} days
                </div>
                <div className="space-y-1.5">
                  {tournamentDays.map((day) => {
                    const dayDate = formatDate(day.event_date, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const dayLabel = day.day_number
                      ? `Day ${day.day_number}`
                      : day.round_or_stage || dayDate;
                    const isCurrent = day.event_id === event.id;

                    return (
                      <div
                        key={day.event_id}
                        className={`flex items-center gap-2.5 py-1.5 px-2 rounded-lg ${
                          isCurrent ? "bg-accent/5" : ""
                        }`}
                      >
                        {/* Attendance indicator */}
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                            day.user_attended
                              ? "bg-win"
                              : "bg-bg-input border border-border"
                          }`}
                        >
                          {day.user_attended && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="white"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>

                        {/* Day info */}
                        {isCurrent ? (
                          <span className="text-xs text-accent font-medium flex-1">
                            {dayLabel}{" "}
                            <span className="text-text-muted font-normal">
                              · {dayDate}
                            </span>
                          </span>
                        ) : (
                          <Link
                            href={`/event/${day.event_id}`}
                            className="text-xs text-text-secondary hover:text-accent transition-colors flex-1"
                          >
                            {dayLabel}{" "}
                            <span className="text-text-muted">· {dayDate}</span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

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
            {/* Photo */}
            {userLog.photo_url && (
              <div className="relative rounded-lg overflow-hidden mb-3 -mx-1">
                <Image
                  src={userLog.photo_url}
                  alt="Event photo"
                  width={600}
                  height={200}
                  sizes="(max-width: 512px) 100vw, 512px"
                  quality={75}
                  className="w-full aspect-video object-cover"
                />
                {userLog.photo_is_verified && (
                  <div className="absolute top-2 left-2">
                    <VerifiedBadge size="md" />
                  </div>
                )}
              </div>
            )}

            {/* Outcome + Rating */}
            <div className="flex items-center justify-between mb-3">
              <OutcomeBadge outcome={userLog.outcome} />
              {userLog.rating && <StarRating rating={userLog.rating} size={16} />}
            </div>

            {/* Seat */}
            {userLog.seat_location && userLog.privacy === "show_all" && (
              <div className="flex items-center gap-1.5 mb-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {userLog.companions.map((c, i) =>
                  c.username ? (
                    <Link
                      key={i}
                      href={`/user/${c.username}`}
                      className="inline-flex items-center gap-1 text-xs text-accent hover:opacity-80 transition-opacity"
                    >
                      {c.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatar_url} alt={c.display_name || `@${c.username}`} className="w-4 h-4 rounded-full object-cover" />
                      ) : null}
                      @{c.username}
                      {i < userLog.companions.length - 1 ? "," : ""}
                    </Link>
                  ) : (
                    <span key={i} className="text-xs text-text-muted">
                      {c.display_name}
                      {i < userLog.companions.length - 1 ? "," : ""}
                    </span>
                  )
                )}
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
              <Link
                key={attendee.id}
                href={`/user/${attendee.username}`}
                className="bg-bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3 hover:bg-bg-elevated/50 transition-colors"
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden">
                  {attendee.avatar_url ? (
                    <Image
                      src={attendee.avatar_url}
                      alt={attendee.username}
                      width={32}
                      height={32}
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
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Photo Gallery */}
      {gallery.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Photos ({gallery.length})</SectionLabel>
          <EventGallery photos={gallery} currentUserId={user.id} />
        </div>
      )}

      {/* Share */}
      {userLog && (
        <div className="mb-6">
          <ShareButton
            url={`https://boxdseats.com/e/${userLog.id}`}
            title={`${isMatch ? `${event.away_team_abbr || event.away_team_short} vs ${event.home_team_abbr || event.home_team_short}` : event.tournament_name || "Event"} — BoxdSeats`}
            text={`Check out this event on BoxdSeats`}
          />
        </div>
      )}

      {/* Deep-linked friend's comment thread */}
      {focusLog && (
        <div className="mb-6" id="comments">
          <SectionLabel>
            Comments on {focusLog.display_name || `@${focusLog.username}`}&apos;s log
          </SectionLabel>
          <CommentsSection
            eventLogId={focusLog.id}
            userId={user.id}
            logOwnerId={focusLog.user_id}
            initialComments={focusComments}
          />
        </div>
      )}

      {/* Event-level discussion: the shared room for everyone at/watching the game */}
      <div className="mb-6" id="discussion">
        <SectionLabel>Discussion</SectionLabel>
        <CommentsSection
          eventId={id}
          userId={user.id}
          initialComments={discussion}
        />
      </div>

      {/* The viewer's own check-in thread (distinct from the game discussion) */}
      {userLog && (
        <div className="mb-6">
          <SectionLabel>Comments on your log</SectionLabel>
          <CommentsSection
            eventLogId={userLog.id}
            userId={user.id}
            logOwnerId={userLog.user_id}
            initialComments={comments}
          />
        </div>
      )}
    </div>
  );
}
