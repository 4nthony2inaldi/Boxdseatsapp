"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { TimelineEntry } from "@/lib/queries/profile";
import { LEAGUES } from "@/lib/constants";
import SectionLabel from "./SectionLabel";
import TimelineCard from "../TimelineCard";
import { SkeletonTimelineCard } from "../Skeleton";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { createClient } from "@/lib/supabase/client";
import { toggleLike } from "@/lib/queries/social";
import { StadiumIcon } from "@/components/icons";

const PAGE_SIZE = 20;

type TimelineProps = {
  initialEntries: TimelineEntry[];
  initialHasMore: boolean;
  userId: string;
  /** The signed-in viewer (may differ from userId on other profiles). */
  viewerId?: string;
  /** True on the user's own timeline — shows edit affordances. */
  canEdit?: boolean;
};

const leagueOptions = ["All", ...Object.keys(LEAGUES)];

export default function Timeline({ initialEntries, initialHasMore, userId, viewerId, canEdit = false }: TimelineProps) {
  const [filter, setFilter] = useState("All");
  const [entries, setEntries] = useState(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Incremented on each filter change so stale fetches can be ignored.
  const filterRequestRef = useRef(0);

  // Viewer's liked entries; checkedIds tracks which entries we've looked up.
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const checkedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!viewerId) return;
    const unchecked = entries
      .map((e) => e.id)
      .filter((id) => !checkedIdsRef.current.has(id));
    if (unchecked.length === 0) return;
    for (const id of unchecked) checkedIdsRef.current.add(id);

    const supabase = createClient();
    supabase
      .from("likes")
      .select("event_log_id")
      .eq("user_id", viewerId)
      .in("event_log_id", unchecked)
      .then(({ data }) => {
        if (!data || data.length === 0) return;
        setLikedIds((prev) => {
          const next = new Set(prev);
          for (const row of data) next.add(row.event_log_id as string);
          return next;
        });
      });
  }, [entries, viewerId]);

  const handleLike = async (entryId: string) => {
    if (!viewerId) return;
    const currentlyLiked = likedIds.has(entryId);

    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (currentlyLiked) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, like_count: e.like_count + (currentlyLiked ? -1 : 1) }
          : e
      )
    );

    const supabase = createClient();
    const result = await toggleLike(supabase, viewerId, entryId, currentlyLiked);
    if ("error" in result) {
      // Revert
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (currentlyLiked) next.add(entryId);
        else next.delete(entryId);
        return next;
      });
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? { ...e, like_count: e.like_count + (currentlyLiked ? 1 : -1) }
            : e
        )
      );
    }
  };

  async function handleFilterChange(option: string) {
    setFilter(option);
    setIsOpen(false);
    const requestId = ++filterRequestRef.current;

    if (option === "All") {
      setEntries(initialEntries);
      setHasMore(initialHasMore);
      setLoading(false);
      return;
    }

    setLoading(true);
    setEntries([]);
    setHasMore(false);
    const supabase = createClient();

    const slug = LEAGUES[option as keyof typeof LEAGUES]?.slug || option.toLowerCase();
    const { data: league } = await supabase
      .from("leagues")
      .select("id")
      .eq("slug", slug)
      .single();

    if (requestId !== filterRequestRef.current) return;

    if (!league) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("event_logs")
      .select(
        `
        id, event_date, rating, notes, outcome, privacy, like_count, comment_count, seat_location, sport,
        photo_url, photo_is_verified,
        is_manual, manual_title, manual_description,
        event_id,
        venue_id,
        venues(name),
        leagues(slug, name),
        events!event_logs_event_id_fkey(
          home_score, away_score,
          home_team:teams!events_home_team_id_fkey(short_name, abbreviation),
          away_team:teams!events_away_team_id_fkey(short_name, abbreviation),
          tournament_name
        )
      `
      )
      .eq("user_id", userId)
      .eq("league_id", league.id)
      .order("event_date", { ascending: false })
      .range(0, PAGE_SIZE);

    if (requestId !== filterRequestRef.current) return;

    if (data) {
      const moreAvailable = data.length > PAGE_SIZE;
      const pageData = moreAvailable ? data.slice(0, PAGE_SIZE) : data;
      setEntries(pageData.map(mapLogToEntry));
      setHasMore(moreAvailable);
    } else {
      setEntries([]);
      setHasMore(false);
    }
    setLoading(false);
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);

    const supabase = createClient();
    const offset = entries.length;

    let leagueId: string | null = null;
    if (filter !== "All") {
      const slug = LEAGUES[filter as keyof typeof LEAGUES]?.slug || filter.toLowerCase();
      const { data: league } = await supabase
        .from("leagues")
        .select("id")
        .eq("slug", slug)
        .single();
      leagueId = league?.id ?? null;
    }

    let query = supabase
      .from("event_logs")
      .select(
        `
        id, event_date, rating, notes, outcome, privacy, like_count, comment_count, seat_location, sport,
        photo_url, photo_is_verified,
        is_manual, manual_title, manual_description,
        event_id,
        venue_id,
        venues(name),
        leagues(slug, name),
        events!event_logs_event_id_fkey(
          home_score, away_score,
          home_team:teams!events_home_team_id_fkey(short_name, abbreviation),
          away_team:teams!events_away_team_id_fkey(short_name, abbreviation),
          tournament_name
        )
      `
      )
      .eq("user_id", userId)
      .order("event_date", { ascending: false })
      .range(offset, offset + PAGE_SIZE);

    if (leagueId) {
      query = query.eq("league_id", leagueId);
    }

    const { data } = await query;

    if (data) {
      const moreAvailable = data.length > PAGE_SIZE;
      const pageData = moreAvailable ? data.slice(0, PAGE_SIZE) : data;
      setEntries((prev) => [...prev, ...pageData.map(mapLogToEntry)]);
      setHasMore(moreAvailable);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  }, [entries.length, hasMore, loadingMore, filter, userId]);

  const sentinelRef = useInfiniteScroll(loadMore, {
    enabled: hasMore && !loadingMore && !loading,
  });

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-3">
        <SectionLabel>Timeline</SectionLabel>
        {/* Filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1 bg-bg-input border border-border rounded-lg px-2.5 py-1 cursor-pointer"
          >
            <span className="text-[11px] text-text-secondary">{filter}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#9BA1B5"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {isOpen && (
            <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border rounded-lg py-1 z-20 min-w-[100px] shadow-lg">
              {leagueOptions.map((option) => (
                <button
                  key={option}
                  onClick={() => handleFilterChange(option)}
                  className={`block w-full text-left px-3 py-1.5 text-[11px] hover:bg-bg-input transition-colors ${
                    filter === option
                      ? "text-accent"
                      : "text-text-secondary"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading skeleton for filter changes */}
      {loading && (
        <div>
          {[1, 2, 3].map((i) => (
            <SkeletonTimelineCard key={i} />
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
          <div className="mb-3 flex justify-center text-text-muted">
            <StadiumIcon size={40} />
          </div>
          <div className="font-display text-lg text-text-primary tracking-wide mb-2">
            Log Your First Event
          </div>
          <p className="text-text-muted text-sm mb-4">
            Start building your sports timeline by logging a game you attended.
          </p>
          <a
            href="/log"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
            }}
          >
            Log an Event
          </a>
        </div>
      )}

      {!loading && entries.length > 0 && (() => {
        const groups: { label: string; entries: typeof entries }[] = [];
        let currentLabel = "";

        for (const entry of entries) {
          const d = new Date(entry.event_date + "T00:00:00");
          const label = d.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          });
          if (label !== currentLabel) {
            currentLabel = label;
            groups.push({ label, entries: [] });
          }
          groups[groups.length - 1].entries.push(entry);
        }

        return groups.map((group) => (
          <div key={group.label}>
            <div className="flex items-center gap-3 mt-4 mb-3 first:mt-0">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-display tracking-[1.5px] uppercase text-text-muted shrink-0">
                {group.label}
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
            {group.entries.map((entry) => (
              <TimelineCard
                key={entry.id}
                entry={entry}
                editHref={canEdit ? `/log?edit=${entry.id}` : null}
                liked={likedIds.has(entry.id)}
                onLike={viewerId ? handleLike : undefined}
              />
            ))}
          </div>
        ));
      })()}

      {/* Loading more skeleton */}
      {loadingMore && (
        <div>
          {[1, 2].map((i) => (
            <SkeletonTimelineCard key={`loading-${i}`} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />
    </div>
  );
}

// Helper to map a raw Supabase row to TimelineEntry
function mapLogToEntry(log: Record<string, unknown>): TimelineEntry {
  const venue = log.venues as { name: string } | null;
  const leagueData = log.leagues as { slug: string; name: string } | null;
  const event = log.events as {
    home_score: number | null;
    away_score: number | null;
    home_team: { short_name: string; abbreviation: string } | null;
    away_team: { short_name: string; abbreviation: string } | null;
    tournament_name: string | null;
  } | null;

  let matchup: string | null = null;
  let homeTeamShort: string | null = event?.home_team?.short_name || null;
  let awayTeamShort: string | null = event?.away_team?.short_name || null;
  let homeScore: number | null = event?.home_score ?? null;
  let awayScore: number | null = event?.away_score ?? null;

  if (event?.home_team && event?.away_team) {
    const hs = event.home_score ?? "";
    const as_ = event.away_score ?? "";
    matchup = `${event.home_team.short_name} ${hs} — ${event.away_team.short_name} ${as_}`;
  } else if (event?.tournament_name) {
    matchup = event.tournament_name;
  }

  if (log.is_manual && log.manual_description) {
    try {
      const manualTeams = JSON.parse(log.manual_description as string);
      if (manualTeams.home_team && manualTeams.away_team) {
        homeTeamShort = manualTeams.home_team;
        awayTeamShort = manualTeams.away_team;
        homeScore = manualTeams.home_score ?? null;
        awayScore = manualTeams.away_score ?? null;
        const hs = manualTeams.home_score ?? "";
        const as_ = manualTeams.away_score ?? "";
        matchup = `${manualTeams.home_team} ${hs} — ${manualTeams.away_team} ${as_}`;
      }
    } catch {
      // not JSON, ignore
    }
  }

  return {
    id: log.id as string,
    event_date: log.event_date as string,
    rating: log.rating as number | null,
    notes: log.notes as string | null,
    outcome: log.outcome as string | null,
    privacy: log.privacy as string,
    like_count: log.like_count as number,
    comment_count: log.comment_count as number,
    seat_location: log.seat_location as string | null,
    league_slug: leagueData?.slug?.toUpperCase() || null,
    league_name: leagueData?.name || null,
    venue_name: venue?.name || null,
    venue_id: log.venue_id as string | null,
    event_id: log.event_id as string | null,
    matchup,
    home_team_short: homeTeamShort,
    away_team_short: awayTeamShort,
    home_score: homeScore,
    away_score: awayScore,
    sport: log.sport as string | null,
    photo_url: (log.photo_url as string) || null,
    photo_is_verified: (log.photo_is_verified as boolean) || false,
    is_manual: (log.is_manual as boolean) || false,
    manual_title: (log.manual_title as string) || null,
    manual_description: (log.manual_description as string) || null,
  };
}
