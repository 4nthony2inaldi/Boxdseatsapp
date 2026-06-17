import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import {
  fetchTeamDetail,
  fetchTeamVenues,
  fetchTeamRecentEvents,
  fetchTeamUserStats,
} from "@/lib/queries/team";
import Image from "next/image";
import SportIcon from "@/components/SportIcon";
import SectionLabel from "@/components/profile/SectionLabel";
import { formatDate } from "@/lib/formatters";

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const team = await fetchTeamDetail(supabase, id);
  if (!team) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <div className="px-4 pt-3 -mb-1 relative z-10"><BackButton fallback="/explore" /></div>
        <p className="text-text-muted">Team not found.</p>
      </div>
    );
  }

  const [venues, recentEvents, userStats] = await Promise.all([
    fetchTeamVenues(supabase, id),
    fetchTeamRecentEvents(supabase, id, user.id),
    fetchTeamUserStats(supabase, id, user.id),
  ]);

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mt-5 mb-5">
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center shrink-0 p-2">
          {team.logo_url ? (
            <Image
              src={team.logo_url}
              alt={team.name}
              width={48}
              height={48}
              className="w-full h-full object-contain"
            />
          ) : (
            <SportIcon league={team.league_slug} size={36} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl text-text-primary tracking-wide leading-tight">
            {team.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="font-display text-[11px] text-accent tracking-[1.5px] uppercase">
              {team.league_name}
            </span>
            <span className="text-text-muted text-xs">·</span>
            <span className="text-xs text-text-secondary">{team.city}</span>
            {!team.is_active && (
              <>
                <span className="text-text-muted text-xs">·</span>
                <span className="text-xs text-text-muted">Inactive</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Your history with this team */}
      <div className="bg-bg-card rounded-xl border border-border p-4 mb-6">
        <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-3">
          Your History
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="font-display text-2xl text-text-primary">
              {userStats.gamesAttended}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Games Seen
            </div>
          </div>
          <div>
            <div className="font-display text-2xl text-win">
              {userStats.wins}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">Team Wins</div>
          </div>
          <div>
            <div className="font-display text-2xl text-loss">
              {userStats.losses}
            </div>
            <div className="text-[11px] text-text-muted mt-0.5">
              Team Losses
            </div>
          </div>
        </div>
      </div>

      {/* Home venues */}
      {venues.length > 0 && (
        <div className="mb-6">
          <SectionLabel>
            {venues.length === 1 ? "Home Venue" : "Home Venues"}
          </SectionLabel>
          <div className="space-y-2">
            {venues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venue/${venue.id}`}
                className="flex items-center gap-3 bg-bg-card rounded-xl border border-border px-4 py-3 hover:border-accent transition-colors"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-accent)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm text-text-primary font-medium truncate">
                      {venue.name}
                    </span>
                    {!venue.is_primary && venue.is_spring_home && (
                      <span className="shrink-0 text-[10px] font-display tracking-wider uppercase text-accent border border-accent/30 bg-accent/10 rounded-full px-2 py-0.5">
                        {team.sport === "baseball" ? "Spring Training" : "Preseason Home"}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted">
                    {venue.city}
                    {venue.state ? `, ${venue.state}` : ""}
                  </div>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-text-muted)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent games */}
      <div className="mb-6">
        <SectionLabel>Recent Games</SectionLabel>
        {recentEvents.length === 0 ? (
          <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
            <p className="text-text-muted text-sm">
              No games found for this team yet.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentEvents.map((event) => (
              <Link
                key={event.id}
                href={`/event/${event.id}`}
                className="flex items-center gap-3 bg-bg-card rounded-xl border border-border px-4 py-3 hover:border-accent transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium truncate">
                    {event.away_team_short || "TBD"}
                    {event.away_score !== null && (
                      <span className="text-text-secondary">
                        {" "}
                        {event.away_score}
                      </span>
                    )}{" "}
                    <span className="text-text-muted">@</span>{" "}
                    {event.home_team_short || "TBD"}
                    {event.home_score !== null && (
                      <span className="text-text-secondary">
                        {" "}
                        {event.home_score}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-text-muted mt-0.5 truncate">
                    {formatDate(event.event_date)}
                    {event.venue_name ? ` · ${event.venue_name}` : ""}
                    {event.is_postseason ? " · Postseason" : ""}
                  </div>
                </div>
                {event.attended && (
                  <span className="shrink-0 text-[10px] font-display tracking-wider uppercase text-win border border-win/30 bg-win/10 rounded-full px-2 py-0.5">
                    Attended
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
