"use client";

import { useState, useEffect } from "react";
import Button from "@/components/Button";
import { createClient } from "@/lib/supabase/client";
import { fetchEventDatesForVenue, fetchVenueOpenedYear } from "@/lib/queries/log";
import { toastError } from "@/components/Toaster";

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
  // The venue's opening year, if known — lets the calendar reach back to a
  // stadium's inception for historical manual logs (older than the 2002 floor).
  const [openedYear, setOpenedYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Quick time-travel picker: closed | choosing year | choosing month of year
  const [jumpYear, setJumpYear] = useState<number | null>(null);
  const [jumpOpen, setJumpOpen] = useState(false);
  // True when the calendar auto-navigated to the venue's last event month
  const [autoJumped, setAutoJumped] = useState(false);

  // Load all event dates for this venue on mount
  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [dates, opened] = await Promise.all([
          fetchEventDatesForVenue(supabase, venueId),
          fetchVenueOpenedYear(supabase, venueId),
        ]);
        setEventDates(dates);
        setOpenedYear(opened);

        // Auto-navigate to the most recent month with an event
        if (dates.size > 0) {
          const sorted = Array.from(dates).sort().reverse();
          const mostRecent = sorted[0];
          const [y, m] = mostRecent.split("-").map(Number);
          // Only auto-navigate if the most recent event isn't in the current month
          if (y !== today.getFullYear() || m - 1 !== today.getMonth()) {
            setViewYear(y);
            setViewMonth(m - 1);
            setAutoJumped(true);
          }
        }
      } catch {
        toastError("Couldn't load event dates. Check your connection.");
      } finally {
        setLoading(false);
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

  // Event counts per year and per month (for the quick-jump picker)
  const yearCounts = new Map<number, number>();
  const monthCounts = new Map<string, number>();
  for (const d of eventDates) {
    const [y, m] = d.split("-").map(Number);
    yearCounts.set(y, (yearCounts.get(y) || 0) + 1);
    monthCounts.set(`${y}-${m}`, (monthCounts.get(`${y}-${m}`) || 0) + 1);
  }
  // Calendar floor: the venue's opening year when known (so old stadiums reach
  // back to their inception for historical logs), else the 2002 data floor.
  // Never above the current year, and never later than an actual event on file.
  const floorYear = Math.min(openedYear ?? 2002, today.getFullYear());
  const earliestYear = Math.min(
    floorYear,
    ...(yearCounts.size > 0 ? [Math.min(...yearCounts.keys())] : [])
  );
  const jumpYears: number[] = [];
  for (let y = today.getFullYear(); y >= earliestYear; y--) jumpYears.push(y);

  const handleJumpToMonth = (year: number, monthIdx: number) => {
    setAutoJumped(false);
    setViewYear(year);
    setViewMonth(monthIdx);
    setJumpOpen(false);
    setJumpYear(null);
  };

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

  // Can't page earlier than the calendar floor (venue inception or 2002).
  const canGoPrev = viewYear > earliestYear || viewMonth > 0;

  const goToPrevMonth = () => {
    if (!canGoPrev) return;
    setAutoJumped(false);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    setAutoJumped(false);
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

  return (
    <div>
      <div className="text-[13px] text-text-secondary mb-5">{venueName}</div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-text-muted text-sm py-8">
          Loading event dates...
        </div>
      )}

      {/* Calendar */}
      {!loading && (
        <div className="bg-bg-card rounded-xl border border-border p-4 mb-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPrevMonth}
              className={`p-1 cursor-pointer ${canGoPrev ? "text-text-secondary hover:text-text-primary" : "text-text-muted/30 cursor-default"}`}
              disabled={!canGoPrev}
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
            <button
              onClick={() => {
                setJumpOpen(!jumpOpen);
                setJumpYear(null);
              }}
              className="text-center cursor-pointer bg-transparent border-none"
              aria-label="Jump to a different month or year"
            >
              <span className="font-display text-base text-text-primary tracking-[1px] inline-flex items-center gap-1.5">
                {monthName}
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--color-text-muted)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: jumpOpen ? "rotate(180deg)" : undefined,
                    transition: "transform 0.15s",
                  }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
              {eventsThisMonth > 0 && (
                <div className="text-[10px] text-accent mt-0.5">
                  {eventsThisMonth} event{eventsThisMonth !== 1 ? "s" : ""}
                </div>
              )}
            </button>
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

          {autoJumped && !jumpOpen && (
            <p className="text-[11px] text-text-muted text-center -mt-2 mb-3">
              Jumped to this venue&apos;s most recent event month
            </p>
          )}

          {/* Quick jump: year grid, then months of the chosen year (replaces
              the day grid, like a standard calendar's month/year picker) */}
          {jumpOpen && (
            <div className="pt-1 pb-2">
              {jumpYear === null ? (
                <>
                  <div className="font-display text-[10px] text-text-muted tracking-[1.5px] uppercase mb-2 text-center">
                    Jump to year
                  </div>
                  <div className="grid grid-cols-5 gap-1.5 max-h-44 overflow-y-auto">
                    {jumpYears.map((y) => {
                      const n = yearCounts.get(y) || 0;
                      return (
                        <button
                          key={y}
                          onClick={() => setJumpYear(y)}
                          className={`py-2 rounded-lg text-[12px] cursor-pointer transition-colors ${
                            y === viewYear
                              ? "bg-accent text-bg font-semibold"
                              : n > 0
                                ? "bg-bg-input text-text-primary hover:bg-accent/15"
                                : "bg-transparent text-text-muted/50 hover:bg-bg-input"
                          }`}
                        >
                          {y}
                          {n > 0 && y !== viewYear && (
                            <div className="w-1 h-1 rounded-full bg-accent mx-auto mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setJumpYear(null)}
                    className="font-display text-[10px] text-text-secondary tracking-[1.5px] uppercase mb-2 block mx-auto cursor-pointer bg-transparent border-none hover:text-text-primary"
                  >
                    ← {jumpYear}
                  </button>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: 12 }, (_, m) => {
                      const isFutureMonth =
                        jumpYear > today.getFullYear() ||
                        (jumpYear === today.getFullYear() && m > today.getMonth());
                      const n = monthCounts.get(`${jumpYear}-${m + 1}`) || 0;
                      const label = new Date(jumpYear, m, 1).toLocaleString("en-US", {
                        month: "short",
                      });
                      return (
                        <button
                          key={m}
                          onClick={() => handleJumpToMonth(jumpYear, m)}
                          disabled={isFutureMonth}
                          className={`py-2 rounded-lg text-[12px] transition-colors ${
                            isFutureMonth
                              ? "text-text-muted/25 cursor-default"
                              : n > 0
                                ? "bg-bg-input text-text-primary cursor-pointer hover:bg-accent/15"
                                : "bg-transparent text-text-muted/50 cursor-pointer hover:bg-bg-input"
                          }`}
                        >
                          {label}
                          {n > 0 && !isFutureMonth && (
                            <div className="w-1 h-1 rounded-full bg-accent mx-auto mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {!jumpOpen && (
            <>
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
                      ? "bg-accent text-bg font-semibold"
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
            </>
          )}
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
          <Button onClick={handleContinue} size="xl" fullWidth glow>
            CONTINUE ANYWAY
          </Button>
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
