"use client";

import { useState, useEffect } from "react";
import type { TimelineEntry } from "@/lib/queries/profile";
import { LEAGUES } from "@/lib/constants";
import SectionLabel from "./SectionLabel";
import TimelineCard from "../TimelineCard";
import { createClient } from "@/lib/supabase/client";

type TimelineProps = {
  initialEntries: TimelineEntry[];
  userId: string;
};

const leagueOptions = ["All", ...Object.keys(LEAGUES)];

export default function Timeline({ initialEntries, userId }: TimelineProps) {
  const [filter, setFilter] = useState("All");
  const [entries, setEntries] = useState(initialEntries);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (filter === "All") {
      setEntries(initialEntries);
      return;
    }

    async function fetchFiltered() {
      setLoading(true);
      const supabase = createClient();

      // Look up league id by slug
      const { data: league } = await supabase
        .from("leagues")
        .select("id")
        .eq("slug", filter.toLowerCase())
        .single();

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
          event_id,
          venue_id,
          venues(name),
          leagues(slug, name),
          events(
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
        .limit(50);

      if (data) {
        const mapped: TimelineEntry[] = data.map((log) => {
          const venue = log.venues as unknown as { name: string } | null;
          const leagueData = log.leagues as unknown as {
            slug: string;
            name: string;
          } | null;
          const event = log.events as unknown as {
            home_score: number | null;
            away_score: number | null;
            home_team: {
              short_name: string;
              abbreviation: string;
            } | null;
            away_team: {
              short_name: string;
              abbreviation: string;
            } | null;
            tournament_name: string | null;
          } | null;

          let matchup: string | null = null;
          if (event?.home_team && event?.away_team) {
            const hs = event.home_score ?? "";
            const as_ = event.away_score ?? "";
            matchup = `${event.home_team.short_name} ${hs} — ${event.away_team.short_name} ${as_}`;
          } else if (event?.tournament_name) {
            matchup = event.tournament_name;
          }

          return {
            id: log.id,
            event_date: log.event_date,
            rating: log.rating,
            notes: log.notes,
            outcome: log.outcome,
            privacy: log.privacy,
            like_count: log.like_count,
            comment_count: log.comment_count,
            seat_location: log.seat_location,
            league_slug: leagueData?.slug?.toUpperCase() || null,
            league_name: leagueData?.name || null,
            venue_name: venue?.name || null,
            venue_id: log.venue_id,
            event_id: log.event_id,
            matchup,
            home_team_short: event?.home_team?.short_name || null,
            away_team_short: event?.away_team?.short_name || null,
            home_score: event?.home_score ?? null,
            away_score: event?.away_score ?? null,
            sport: log.sport,
          };
        });
        setEntries(mapped);
      } else {
        setEntries([]);
      }
      setLoading(false);
    }

    fetchFiltered();
  }, [filter, userId, initialEntries]);

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
                  onClick={() => {
                    setFilter(option);
                    setIsOpen(false);
                  }}
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

      {loading && (
        <div className="text-center text-text-muted text-sm py-8">
          Loading...
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center text-text-muted text-sm py-8">
          No events logged yet.
        </div>
      )}

      {!loading &&
        entries.map((entry) => (
          <TimelineCard key={entry.id} entry={entry} />
        ))}
    </div>
  );
}
