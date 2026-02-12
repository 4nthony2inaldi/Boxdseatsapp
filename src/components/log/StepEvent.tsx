"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  findEventsAtVenueOnDate,
  fetchTournamentDays,
  type EventMatch,
  type ManualTeamScore,
} from "@/lib/queries/log";
import { LEAGUES } from "@/lib/constants";
import SportIcon from "@/components/SportIcon";

export type ManualEntryData = {
  title: string;
  league_id: string | null;
  sport: string | null;
  teams: ManualTeamScore | null;
};

type StepEventProps = {
  venueId: string;
  venueName: string;
  date: string; // YYYY-MM-DD
  onSelect: (event: EventMatch | null, manualTitle?: string, manualData?: ManualEntryData) => void;
  onSelectMultiDay: (events: EventMatch[]) => void;
  onBack: () => void;
};

export default function StepEvent({
  venueId,
  venueName,
  date,
  onSelect,
  onSelectMultiDay,
  onBack,
}: StepEventProps) {
  const [events, setEvents] = useState<EventMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [manualTitle, setManualTitle] = useState("");

  // Multi-day state
  const [multiDayEvent, setMultiDayEvent] = useState<EventMatch | null>(null);
  const [tournamentDays, setTournamentDays] = useState<EventMatch[]>([]);
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
  const [loadingDays, setLoadingDays] = useState(false);

  // Manual entry form state
  const [manualLeague, setManualLeague] = useState<string | null>(null);
  const [manualHomeTeam, setManualHomeTeam] = useState("");
  const [manualAwayTeam, setManualAwayTeam] = useState("");
  const [manualHomeScore, setManualHomeScore] = useState("");
  const [manualAwayScore, setManualAwayScore] = useState("");

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

  // Handle clicking a tournament/multi-day event
  const handleTournamentClick = async (event: EventMatch) => {
    if (!event.tournament_id) {
      // Not a multi-day event, select directly
      onSelect(event);
      return;
    }

    // Load all days for this tournament
    setMultiDayEvent(event);
    setLoadingDays(true);
    const supabase = createClient();
    const days = await fetchTournamentDays(supabase, event.tournament_id);
    setTournamentDays(days);
    // Pre-select the day that was on the selected date
    const matchingDay = days.find((d) => d.id === event.id);
    if (matchingDay) {
      setSelectedDays(new Set([matchingDay.id]));
    }
    setLoadingDays(false);
  };

  const toggleDay = (dayId: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) {
        next.delete(dayId);
      } else {
        next.add(dayId);
      }
      return next;
    });
  };

  const handleMultiDayConfirm = () => {
    const selected = tournamentDays.filter((d) => selectedDays.has(d.id));
    if (selected.length === 1) {
      // Single day selected — use normal flow
      onSelect(selected[0]);
    } else if (selected.length > 1) {
      onSelectMultiDay(selected);
    }
  };

  const handleManualSubmit = () => {
    if (!manualTitle.trim()) return;

    const leagueEntry = manualLeague
      ? Object.entries(LEAGUES).find(([key]) => key === manualLeague)
      : null;

    const teams: ManualTeamScore | null =
      manualHomeTeam.trim() && manualAwayTeam.trim()
        ? {
            home_team: manualHomeTeam.trim(),
            away_team: manualAwayTeam.trim(),
            home_score: manualHomeScore ? parseInt(manualHomeScore, 10) : null,
            away_score: manualAwayScore ? parseInt(manualAwayScore, 10) : null,
          }
        : null;

    const manualData: ManualEntryData = {
      title: manualTitle.trim(),
      league_id: null, // Will be resolved in LogFlow
      sport: leagueEntry ? leagueEntry[1].sport : null,
      teams,
    };

    onSelect(null, manualTitle.trim(), manualData);
  };

  // Multi-day day picker view
  if (multiDayEvent) {
    const tournamentName = multiDayEvent.tournament_name || "Tournament";
    return (
      <div>
        <div className="text-[13px] text-text-secondary mb-5">
          {venueName} &middot; {tournamentName}
        </div>

        <div className="font-display text-base text-text-primary tracking-wide mb-4">
          Which day(s) did you attend?
        </div>

        {loadingDays && (
          <div className="text-center text-text-muted text-sm py-8">
            Loading tournament days...
          </div>
        )}

        {!loadingDays && tournamentDays.map((day) => {
          const isSelected = selectedDays.has(day.id);
          const dayDate = new Date(day.event_date + "T00:00:00").toLocaleDateString(
            "en-US",
            { weekday: "short", month: "short", day: "numeric" }
          );
          const dayLabel = day.day_number
            ? `Day ${day.day_number}`
            : day.round_or_stage || dayDate;

          return (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id)}
              className={`w-full rounded-[14px] border p-4 cursor-pointer text-left mb-2 transition-colors flex items-center gap-3 ${
                isSelected
                  ? "bg-accent/10 border-accent"
                  : "bg-bg-card border-border hover:border-accent/50"
              }`}
            >
              {/* Checkbox */}
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? "bg-accent border-accent"
                    : "border-text-muted bg-transparent"
                }`}
              >
                {isSelected && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <div className="font-display text-base text-text-primary tracking-wide">
                  {dayLabel}
                </div>
                <div className="text-xs text-text-secondary mt-0.5">
                  {dayDate}
                  {day.round_or_stage && day.day_number ? ` · ${day.round_or_stage}` : ""}
                </div>
              </div>
            </button>
          );
        })}

        {/* Confirm multi-day selection */}
        {!loadingDays && (
          <button
            onClick={handleMultiDayConfirm}
            disabled={selectedDays.size === 0}
            className={`w-full py-3 rounded-xl font-display text-base tracking-[2px] border-none cursor-pointer mt-3 ${
              selectedDays.size > 0
                ? "text-white"
                : "text-text-muted bg-bg-input cursor-default"
            }`}
            style={
              selectedDays.size > 0
                ? { background: "linear-gradient(135deg, #D4872C, #7B5B3A)" }
                : undefined
            }
          >
            {selectedDays.size > 1
              ? `LOG ${selectedDays.size} DAYS`
              : "CONTINUE"}
          </button>
        )}

        {/* Back to event list */}
        <button
          onClick={() => {
            setMultiDayEvent(null);
            setTournamentDays([]);
            setSelectedDays(new Set());
          }}
          className="block mx-auto mt-3 text-[13px] text-text-secondary bg-transparent border-none cursor-pointer hover:text-text-primary"
        >
          ← Back to events
        </button>
      </div>
    );
  }

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

          const isMultiDay = !!event.tournament_id;

          return (
            <button
              key={event.id}
              onClick={() =>
                isMultiDay
                  ? handleTournamentClick(event)
                  : onSelect(event)
              }
              className="w-full bg-bg-card rounded-[14px] border border-border p-4 cursor-pointer text-left mb-3 hover:border-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <SportIcon src={leagueData?.icon || event.sport_icon} sport={event.sport} size={22} />
                <span
                  className="font-display text-[11px] tracking-[1.5px] uppercase"
                  style={{ color: leagueData?.color || "#D4872C" }}
                >
                  {event.league_name}
                </span>
                {isMultiDay && (
                  <span className="text-[10px] text-text-muted bg-bg-input px-1.5 py-0.5 rounded-full">
                    Multi-day
                  </span>
                )}
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
                {isMultiDay && event.day_number && (
                  <span className="ml-2 text-text-muted">
                    Day {event.day_number}
                  </span>
                )}
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

      {/* "Can't find your event?" when events exist */}
      {!loading && events.length > 0 && !showManual && (
        <button
          onClick={() => setShowManual(true)}
          className="w-full p-3 mt-1 bg-transparent border border-dashed border-border rounded-[10px] text-text-muted text-[13px] cursor-pointer hover:border-accent/30 transition-colors"
        >
          Can&apos;t find your event? Enter manually →
        </button>
      )}

      {/* Manual entry form */}
      {showManual && (
        <div className="bg-bg-card rounded-[14px] border border-border p-4 mt-3">
          <div className="font-display text-sm text-text-primary tracking-[1px] uppercase mb-4">
            Manual Entry
          </div>

          {/* Event name */}
          <div className="mb-3">
            <label className="font-display text-[10px] text-text-muted tracking-[1.2px] uppercase block mb-1.5">
              Event Name *
            </label>
            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="e.g. Yankees vs Red Sox, 2025 US Open"
              className="w-full px-3.5 py-3 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
            />
          </div>

          {/* League/Sport selector */}
          <div className="mb-3">
            <label className="font-display text-[10px] text-text-muted tracking-[1.2px] uppercase block mb-1.5">
              League (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(LEAGUES).map(([key, league]) => {
                const isSelected = manualLeague === key;
                return (
                  <button
                    key={key}
                    onClick={() => setManualLeague(isSelected ? null : key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] cursor-pointer border transition-colors ${
                      isSelected
                        ? "bg-accent/10 border-accent text-accent"
                        : "bg-bg-input border-border text-text-secondary hover:border-accent/30"
                    }`}
                  >
                    <SportIcon src={league.icon} sport={league.sport} size={14} />
                    {key}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Teams + Score (optional) */}
          <div className="mb-3">
            <label className="font-display text-[10px] text-text-muted tracking-[1.2px] uppercase block mb-1.5">
              Teams & Score (optional)
            </label>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <input
                value={manualAwayTeam}
                onChange={(e) => setManualAwayTeam(e.target.value)}
                placeholder="Away team"
                className="w-full px-3 py-2.5 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
              />
              <span className="text-text-muted text-xs font-display">@</span>
              <input
                value={manualHomeTeam}
                onChange={(e) => setManualHomeTeam(e.target.value)}
                placeholder="Home team"
                className="w-full px-3 py-2.5 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
              />
            </div>
            {(manualHomeTeam.trim() || manualAwayTeam.trim()) && (
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mt-2">
                <input
                  value={manualAwayScore}
                  onChange={(e) => setManualAwayScore(e.target.value.replace(/\D/g, ""))}
                  placeholder="Score"
                  inputMode="numeric"
                  className="w-full px-3 py-2 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors text-center"
                />
                <span className="text-text-muted text-xs">–</span>
                <input
                  value={manualHomeScore}
                  onChange={(e) => setManualHomeScore(e.target.value.replace(/\D/g, ""))}
                  placeholder="Score"
                  inputMode="numeric"
                  className="w-full px-3 py-2 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors text-center"
                />
              </div>
            )}
          </div>

          {/* Continue */}
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
            onClick={() => {
              setShowManual(false);
              setManualTitle("");
              setManualLeague(null);
              setManualHomeTeam("");
              setManualAwayTeam("");
              setManualHomeScore("");
              setManualAwayScore("");
            }}
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
