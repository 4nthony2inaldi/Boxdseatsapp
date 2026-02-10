"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  findEventsAtVenueOnDate,
  type EventMatch,
} from "@/lib/queries/log";
import { LEAGUES } from "@/lib/constants";

type StepEventProps = {
  venueId: string;
  venueName: string;
  date: string; // YYYY-MM-DD
  onSelect: (event: EventMatch | null, manualTitle?: string) => void;
  onBack: () => void;
};

export default function StepEvent({
  venueId,
  venueName,
  date,
  onSelect,
  onBack,
}: StepEventProps) {
  const [events, setEvents] = useState<EventMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const results = await findEventsAtVenueOnDate(supabase, venueId, date);
      setEvents(results);
      setLoading(false);
    }
    load();
  }, [venueId, date]);

  const handleManualSubmit = () => {
    if (manualTitle.trim()) {
      onSelect(null, manualTitle.trim());
    }
  };

  return (
    <div>
      <div className="text-[13px] text-text-secondary mb-5">
        {venueName} &middot; {formattedDate}
      </div>

      {loading && (
        <div className="text-center text-text-muted text-sm py-8">
          Searching for events...
        </div>
      )}

      {/* Event list */}
      {!loading &&
        events.map((event) => {
          const leagueKey = event.league_slug?.toUpperCase() as
            | keyof typeof LEAGUES
            | undefined;
          const leagueData = leagueKey ? LEAGUES[leagueKey] : null;
          const displayTitle =
            event.home_team_short && event.away_team_short
              ? `${event.away_team_short} @ ${event.home_team_short}`
              : event.tournament_name || "Event";

          const scoreDisplay =
            event.home_score !== null && event.away_score !== null
              ? `${event.home_score} - ${event.away_score}`
              : null;

          return (
            <button
              key={event.id}
              onClick={() => onSelect(event)}
              className="w-full bg-bg-card rounded-[14px] border border-border p-4 cursor-pointer text-left mb-3 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">
                  {leagueData?.icon || event.sport_icon}
                </span>
                <span
                  className="font-display text-[11px] tracking-[1.5px] uppercase"
                  style={{ color: leagueData?.color || "#D4872C" }}
                >
                  {event.league_name}
                </span>
              </div>
              <div className="font-display text-xl text-text-primary tracking-wide mb-1">
                {displayTitle}
              </div>
              <div className="text-xs text-text-secondary">
                {scoreDisplay && (
                  <span className="mr-2 text-text-primary font-medium">
                    {scoreDisplay}
                  </span>
                )}
                {event.round_or_stage || ""}
              </div>
            </button>
          );
        })}

      {/* No events found */}
      {!loading && events.length === 0 && !showManual && (
        <div className="text-center py-6">
          <div className="text-text-muted text-sm mb-4">
            No events found at this venue on this date.
          </div>
          <button
            onClick={() => setShowManual(true)}
            className="text-accent text-sm cursor-pointer bg-transparent border-none hover:underline"
          >
            Enter event manually
          </button>
        </div>
      )}

      {/* Manual entry option when events exist */}
      {!loading && events.length > 0 && !showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="w-full p-3 mt-1 bg-transparent border border-dashed border-border rounded-[10px] text-text-muted text-[13px] cursor-pointer hover:border-accent/30 transition-colors"
        >
          Don&apos;t see your event? Enter manually →
        </button>
      )}

      {/* Manual entry form */}
      {showManual && (
        <div className="bg-bg-card rounded-[14px] border border-border p-4 mt-3">
          <div className="font-display text-sm text-text-primary tracking-[1px] uppercase mb-3">
            Manual Entry
          </div>
          <input
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            placeholder="e.g. Yankees vs Red Sox"
            className="w-full px-3.5 py-3 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors mb-3"
          />
          <button
            onClick={handleManualSubmit}
            disabled={!manualTitle.trim()}
            className={`w-full py-3 rounded-xl font-display text-base tracking-[2px] border-none cursor-pointer ${
              manualTitle.trim()
                ? "text-white"
                : "text-text-muted bg-bg-input cursor-default"
            }`}
            style={
              manualTitle.trim()
                ? {
                    background: "linear-gradient(135deg, #D4872C, #7B5B3A)",
                  }
                : undefined
            }
          >
            CONTINUE
          </button>
          <button
            onClick={() => setShowManual(false)}
            className="block mx-auto mt-2 text-[12px] text-text-muted bg-transparent border-none cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Back */}
      <button
        onClick={onBack}
        className="block mx-auto mt-3 text-[13px] text-text-secondary bg-transparent border-none cursor-pointer hover:text-text-primary"
      >
        ← Back to date
      </button>
    </div>
  );
}
