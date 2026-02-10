"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchEventDatesForVenue } from "@/lib/queries/log";

type StepDateProps = {
  venueId: string;
  venueName: string;
  onSelect: (date: string) => void;
  onBack: () => void;
};

export default function StepDate({
  venueId,
  venueName,
  onSelect,
  onBack,
}: StepDateProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [eventDates, setEventDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load all event dates for this venue on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const dates = await fetchEventDatesForVenue(supabase, venueId);
      setEventDates(dates);
      setLoading(false);

      // Auto-navigate to the most recent month with an event
      if (dates.size > 0) {
        const sorted = Array.from(dates).sort().reverse();
        const mostRecent = sorted[0];
        const [y, m] = mostRecent.split("-").map(Number);
        // Only auto-navigate if the most recent event isn't in the current month
        if (y !== today.getFullYear() || m - 1 !== today.getMonth()) {
          setViewYear(y);
          setViewMonth(m - 1);
        }
      }
    }
    load();
  }, [venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  // Check if a day is in the future
  const isFuture = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    return d > today;
  };

  const formatDate = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${viewYear}-${m}-${d}`;
  };

  // Count events in the currently viewed month
  const eventsThisMonth = Array.from(eventDates).filter((d) => {
    const [y, m] = d.split("-").map(Number);
    return y === viewYear && m === viewMonth + 1;
  }).length;

  const handleDayClick = (day: number) => {
    if (isFuture(day)) return;
    const dateStr = formatDate(day);
    const hasEvent = eventDates.has(dateStr);

    if (hasEvent) {
      // Direct advance for dates with events
      onSelect(dateStr);
    } else {
      // For other dates, select and show continue button (for manual entry)
      setSelectedDate(dateStr);
    }
  };

  const handleContinue = () => {
    if (selectedDate) {
      onSelect(selectedDate);
    }
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    // Don't go past current month
    if (
      nextYear > today.getFullYear() ||
      (nextYear === today.getFullYear() && nextMonth > today.getMonth())
    ) {
      return;
    }
    setViewMonth(nextMonth);
    setViewYear(nextYear);
  };

  const canGoNext =
    viewYear < today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth < today.getMonth());

  // Today shortcut
  const handleToday = () => {
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelect(dateStr);
  };

  return (
    <div>
      <div className="text-[13px] text-text-secondary mb-5">{venueName}</div>

      {/* Today shortcut */}
      <button
        onClick={handleToday}
        className="w-full mb-4 p-3 rounded-[10px] bg-accent/10 border border-accent/30 text-accent text-sm font-medium cursor-pointer hover:bg-accent/15 transition-colors"
      >
        Today &mdash;{" "}
        {today.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </button>

      {/* Loading */}
      {loading && (
        <div className="text-center text-text-muted text-sm py-8">
          Loading event dates...
        </div>
      )}

      {/* Calendar */}
      {!loading && (
        <div className="bg-bg-card rounded-[14px] border border-border p-4 mb-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className="text-text-secondary hover:text-text-primary p-1 cursor-pointer"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="text-center">
              <span className="font-display text-base text-text-primary tracking-[1px]">
                {monthName}
              </span>
              {eventsThisMonth > 0 && (
                <div className="text-[10px] text-accent mt-0.5">
                  {eventsThisMonth} event{eventsThisMonth !== 1 ? "s" : ""}
                </div>
              )}
            </div>
            <button
              onClick={goToNextMonth}
              className={`p-1 cursor-pointer ${canGoNext ? "text-text-secondary hover:text-text-primary" : "text-text-muted/30 cursor-default"}`}
              disabled={!canGoNext}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {dayLabels.map((d, i) => (
              <div
                key={i}
                className="font-display text-[10px] text-text-muted tracking-[1px] p-1.5"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty cells for offset */}
            {Array.from({ length: firstDayOfWeek }, (_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = formatDate(day);
              const isSelected = selectedDate === dateStr;
              const future = isFuture(day);
              const hasEvent = eventDates.has(dateStr);
              const isToday =
                day === today.getDate() &&
                viewMonth === today.getMonth() &&
                viewYear === today.getFullYear();

              return (
                <button
                  key={day}
                  onClick={() => handleDayClick(day)}
                  disabled={future}
                  className={`p-2 rounded-lg text-[13px] relative transition-colors ${
                    isSelected
                      ? "bg-accent text-white font-semibold"
                      : hasEvent
                        ? "text-text-primary font-semibold cursor-pointer hover:bg-accent/15"
                        : future
                          ? "text-text-muted/20 cursor-default"
                          : "text-text-muted/40 cursor-pointer hover:bg-bg-input"
                  } ${isToday && !isSelected ? "ring-1 ring-accent/40" : ""}`}
                >
                  {day}
                  {hasEvent && !isSelected && (
                    <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-accent" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div className="flex items-center justify-center gap-4 mb-4 text-[10px] text-text-muted">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Has events</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted/30" />
            <span>No events (manual entry)</span>
          </div>
        </div>
      )}

      {/* Continue button for non-event dates */}
      {selectedDate && !eventDates.has(selectedDate) && (
        <div className="mb-3">
          <div className="text-[11px] text-text-muted text-center mb-2">
            No events found on this date — you can still log a manual entry.
          </div>
          <button
            onClick={handleContinue}
            className="w-full py-3.5 rounded-xl text-white font-display text-lg tracking-[2px] cursor-pointer border-none"
            style={{
              background: "linear-gradient(135deg, #D4872C, #7B5B3A)",
              boxShadow: "0 4px 20px rgba(212, 135, 44, 0.25)",
            }}
          >
            CONTINUE ANYWAY
          </button>
        </div>
      )}

      {/* Back */}
      <button
        onClick={onBack}
        className="block mx-auto mt-3 text-[13px] text-text-secondary bg-transparent border-none cursor-pointer hover:text-text-primary"
      >
        ← Back to venue
      </button>
    </div>
  );
}
