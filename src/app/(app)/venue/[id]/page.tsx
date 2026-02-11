import { createClient } from "@/lib/supabase/server";
import {
  fetchVenueDetail,
  fetchVenueHistory,
  fetchVenueTeams,
  fetchVenueCommunityStats,
  fetchVenueTimeline,
  fetchVenueVisitStatus,
} from "@/lib/queries/venue";
import { fetchVenueCoverPhoto } from "@/lib/queries/coverPhotos";
import Link from "next/link";
import SectionLabel from "@/components/profile/SectionLabel";
import StatBox from "@/components/profile/StatBox";
import VenueTimelineList from "@/components/venue/VenueTimelineList";
import VenueStatusToggle from "@/components/venue/VenueStatusToggle";
import SportIcon from "@/components/SportIcon";

export default async function VenueDetailPage({
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
        <p className="text-text-muted">Please log in to view venue details.</p>
      </div>
    );
  }

  const venue = await fetchVenueDetail(supabase, id);
  if (!venue) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Venue not found.</p>
      </div>
    );
  }

  const [history, teams, community, timeline, visitStatus, venueCover] = await Promise.all([
    fetchVenueHistory(supabase, user.id, id),
    fetchVenueTeams(supabase, id),
    fetchVenueCommunityStats(supabase, user.id, id),
    fetchVenueTimeline(supabase, user.id, id),
    fetchVenueVisitStatus(supabase, user.id, id),
    fetchVenueCoverPhoto(supabase, id),
  ]);

  const hasEventLogs = history.totalVisits > 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="px-4 pb-8 max-w-lg mx-auto">
      {/* Back button */}
      <button
        onClick={undefined}
        className="hidden"
      />

      {/* Hero header */}
      <div className="relative -mx-4 -mt-0 mb-5">
        {venueCover ? (
          <div className="relative">
            <img
              src={venueCover.photo_url}
              alt={`${venue.name} cover photo`}
              className="w-full h-44 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg via-transparent to-transparent" />
            <div className="absolute bottom-2 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5">
              <span className="text-[10px] text-white/80">
                📸 @{venueCover.username}
              </span>
            </div>
          </div>
        ) : (
          <div className="h-36 bg-gradient-to-b from-accent/20 via-accent/5 to-bg" />
        )}
        <div className="px-4 -mt-8">
          <h1 className="font-display text-3xl text-text-primary tracking-wide leading-tight">
            {venue.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9BA1B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="text-sm text-text-secondary">
              {venue.city}{venue.state ? `, ${venue.state}` : ""}
            </span>
            {venue.capacity && (
              <>
                <span className="text-text-muted">·</span>
                <span className="text-sm text-text-muted">
                  {venue.capacity.toLocaleString()} capacity
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Venue Status Toggle */}
      <div className="mb-5">
        <VenueStatusToggle
          venueId={id}
          userId={user.id}
          initialStatus={visitStatus}
          hasEventLogs={hasEventLogs}
        />
      </div>

      {/* Your History */}
      <div className="mb-6">
        <SectionLabel>Your History</SectionLabel>
        <div className="bg-bg-card rounded-xl border border-border p-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox value={history.totalVisits} label="Visits" />
            <div className="text-center">
              <div className="font-display text-lg text-text-primary tracking-wide">
                {formatDate(history.firstVisit)}
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">
                First Visit
              </div>
            </div>
            <div className="text-center">
              <div className="font-display text-lg text-text-primary tracking-wide">
                {formatDate(history.lastVisit)}
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">
                Last Visit
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Home Teams */}
      {teams.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Home Teams</SectionLabel>
          <div className="space-y-2">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3"
              >
                <SportIcon src={team.league_icon} size={24} />
                <div className="flex-1 min-w-0">
                  <div className="font-display text-sm text-text-primary tracking-wider truncate">
                    {team.name}
                  </div>
                  <div className="text-[11px] text-text-muted">{team.league_name}</div>
                </div>
                <span className="font-display text-[10px] text-text-muted tracking-[1.5px]">
                  {team.abbreviation}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Community Stats */}
      <div className="mb-6">
        <SectionLabel>Community</SectionLabel>
        <div className="bg-bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="font-display text-2xl text-text-primary tracking-wide">
                {community.totalCheckIns}
              </div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider">
                Check-ins
              </div>
            </div>
            {community.friendsWhoVisited.length > 0 && (
              <div className="flex-1">
                <div className="text-[10px] text-text-secondary uppercase tracking-wider mb-2">
                  Friends who visited
                </div>
                <div className="flex -space-x-2">
                  {community.friendsWhoVisited.slice(0, 5).map((friend) => (
                    <div
                      key={friend.id}
                      className="w-7 h-7 rounded-full border-2 border-bg-card overflow-hidden"
                      title={friend.display_name || friend.username}
                    >
                      {friend.avatar_url ? (
                        <img
                          src={friend.avatar_url}
                          alt={friend.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-display">
                          {(friend.display_name || friend.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                  ))}
                  {community.friendsWhoVisited.length > 5 && (
                    <div className="w-7 h-7 rounded-full border-2 border-bg-card bg-bg-elevated flex items-center justify-center text-[9px] text-text-muted font-display">
                      +{community.friendsWhoVisited.length - 5}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Your Events Here */}
      {timeline.length > 0 && (
        <div className="mb-6">
          <SectionLabel>Your Events Here</SectionLabel>
          <VenueTimelineList entries={timeline} />
        </div>
      )}

      {/* Log Event Here CTA */}
      <Link
        href={`/log?venueId=${venue.id}&venueName=${encodeURIComponent(venue.name)}&venueCity=${encodeURIComponent(venue.city)}&venueState=${encodeURIComponent(venue.state || "")}`}
        className="block w-full"
      >
        <div className="bg-gradient-to-r from-accent to-accent-hover rounded-xl py-3.5 text-center font-display text-lg tracking-[2px] text-white uppercase shadow-lg shadow-accent/20 hover:opacity-90 transition-opacity">
          Log Event Here
        </div>
      </Link>
    </div>
  );
}
