"use client";

import { useState, useMemo } from "react";
import SportIcon from "@/components/SportIcon";

type Venue = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  sport: string | null;
};

type StepVenuesProps = {
  allVenues: Venue[];
  markedVenueIds: string[];
  onToggleVenue: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const SPORT_FILTERS: { key: string; label: string }[] = [
  { key: "baseball", label: "Baseball" },
  { key: "basketball", label: "Basketball" },
  { key: "football", label: "Football" },
  { key: "hockey", label: "Hockey" },
  { key: "soccer", label: "Soccer" },
  { key: "golf", label: "Golf" },
  { key: "tennis", label: "Tennis" },
  { key: "motorsports", label: "Motorsports" },
];

// "Site"/Unknown placeholders (mostly tennis/golf event sites) sort last so
// real stadiums lead the list.
const isPlaceholder = (v: Venue) =>
  / Site$/.test(v.name) || v.city === "Unknown" || !v.city;

export default function StepVenues({
  allVenues,
  markedVenueIds,
  onToggleVenue,
  onBack,
  onNext,
}: StepVenuesProps) {
  const [search, setSearch] = useState("");
  const [sport, setSport] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allVenues
      .filter((v) => {
        if (sport && v.sport !== sport) return false;
        if (!q) return true;
        return (
          v.name.toLowerCase().includes(q) ||
          v.city.toLowerCase().includes(q) ||
          (v.state && v.state.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const am = markedVenueIds.includes(a.id) ? 0 : 1;
        const bm = markedVenueIds.includes(b.id) ? 0 : 1;
        if (am !== bm) return am - bm;
        const ap = isPlaceholder(a) ? 1 : 0;
        const bp = isPlaceholder(b) ? 1 : 0;
        if (ap !== bp) return ap - bp;
        return a.name.localeCompare(b.name);
      });
  }, [allVenues, search, sport, markedVenueIds]);

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Mark Your Venues
      </h2>
      <p className="text-sm text-text-secondary mb-3">
        Tap every venue you{"'"}ve been to. This seeds your venue map instantly.
      </p>

      {/* Sport drill-down */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-1 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => setSport(null)}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs transition-colors"
          style={{
            background: sport === null ? "rgba(212,135,44,0.15)" : "var(--color-bg-input)",
            border: `1px solid ${sport === null ? "var(--color-accent)" : "var(--color-border)"}`,
            color: sport === null ? "var(--color-accent)" : "var(--color-text-secondary)",
            fontWeight: sport === null ? 600 : 400,
          }}
        >
          All
        </button>
        {SPORT_FILTERS.map((s) => {
          const active = sport === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setSport(active ? null : s.key)}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs transition-colors"
              style={{
                background: active ? "rgba(212,135,44,0.15)" : "var(--color-bg-input)",
                border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
                color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontWeight: active ? 600 : 400,
              }}
            >
              <SportIcon sport={s.key} size={13} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* Running count */}
      {markedVenueIds.length > 0 && (
        <div
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl mb-4"
          style={{ background: "rgba(212,135,44,0.08)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="text-sm text-accent font-semibold">
            {markedVenueIds.length} venue{markedVenueIds.length !== 1 ? "s" : ""} marked
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venues..."
          className="w-full py-2.5 pl-9 pr-3.5 rounded-xl bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Venue list */}
      <div className="max-h-[340px] overflow-y-auto rounded-xl">
        {filtered.map((venue) => {
          const checked = markedVenueIds.includes(venue.id);

          return (
            <button
              key={venue.id}
              onClick={() => onToggleVenue(venue.id)}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border mb-2 text-left transition-colors"
              style={{
                background: checked ? "rgba(212,135,44,0.06)" : "var(--color-bg-card)",
                borderColor: checked ? "rgba(212,135,44,0.25)" : "var(--color-border)",
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                style={{
                  background: `rgba(212,135,44,0.12)`,
                }}
              >
                <SportIcon sport={venue.sport} size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-text-primary font-medium truncate">
                  {venue.name}
                </div>
                <div className="text-[11px] text-text-muted truncate">
                  {venue.city}{venue.state ? `, ${venue.state}` : ""}
                </div>
              </div>
              <div
                className="w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                style={{
                  borderColor: checked ? "var(--color-accent)" : "var(--color-border)",
                  background: checked ? "var(--color-accent)" : "transparent",
                }}
              >
                {checked && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">No venues match your search</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-4">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-[2] py-3.5 rounded-xl font-display text-base tracking-widest text-white transition-opacity"
          style={{
            background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
          }}
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
