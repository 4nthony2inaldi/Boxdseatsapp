"use client";

import { useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  searchTeams,
  searchVenuesForOnboarding,
  searchAthletes,
  searchEvents,
  updateBigFourAndSport,
} from "@/lib/queries/onboarding";

type StepBigFourProps = {
  userId: string;
  favSport: string | null;
  favTeamId: string | null;
  favVenueId: string | null;
  favAthleteId: string | null;
  favEventId: string | null;
  onFavSportChange: (v: string | null) => void;
  onFavTeamChange: (v: string | null) => void;
  onFavVenueChange: (v: string | null) => void;
  onFavAthleteChange: (v: string | null) => void;
  onFavEventChange: (v: string | null) => void;
  onBack: () => void;
  onNext: () => void;
};

const SPORTS = [
  { key: "basketball", icon: "🏀", label: "Basketball" },
  { key: "football", icon: "🏈", label: "Football" },
  { key: "baseball", icon: "⚾", label: "Baseball" },
  { key: "hockey", icon: "🏒", label: "Hockey" },
  { key: "soccer", icon: "⚽", label: "Soccer" },
  { key: "golf", icon: "⛳", label: "Golf" },
];

type SearchResult = { id: string; label: string; subtitle?: string };

function SearchPicker({
  label,
  placeholder,
  selectedLabel,
  onSearch,
  onSelect,
  onClear,
}: {
  label: string;
  placeholder: string;
  selectedLabel: string | null;
  onSearch: (q: string) => Promise<SearchResult[]>;
  onSelect: (id: string, label: string) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        setShowResults(false);
        return;
      }
      setSearching(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        const res = await onSearch(q);
        setResults(res);
        setSearching(false);
        setShowResults(true);
      }, 300);
    },
    [onSearch]
  );

  if (selectedLabel) {
    return (
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          {label}
        </label>
        <div className="flex items-center gap-2 py-3 px-3.5 rounded-xl bg-bg-input border border-accent/30">
          <span className="flex-1 text-text-primary text-sm truncate">
            {selectedLabel}
          </span>
          <button
            onClick={onClear}
            className="text-text-muted hover:text-text-secondary p-0.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
        {label} <span className="text-text-muted font-body text-[10px] normal-case tracking-normal">(optional)</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.trim() && setShowResults(true)}
          placeholder={placeholder}
          className="w-full py-3 px-3.5 rounded-xl bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-text-muted border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>
      {showResults && results.length > 0 && (
        <div className="mt-1 rounded-xl bg-bg-elevated border border-border max-h-48 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                onSelect(r.id, r.label);
                setQuery("");
                setResults([]);
                setShowResults(false);
              }}
              className="w-full text-left px-3.5 py-2.5 hover:bg-bg-input transition-colors border-b border-border last:border-b-0"
            >
              <div className="text-sm text-text-primary truncate">{r.label}</div>
              {r.subtitle && (
                <div className="text-xs text-text-muted truncate">{r.subtitle}</div>
              )}
            </button>
          ))}
        </div>
      )}
      {showResults && query.trim() && !searching && results.length === 0 && (
        <div className="mt-1 px-3.5 py-3 rounded-xl bg-bg-elevated border border-border">
          <p className="text-xs text-text-muted text-center">No results found</p>
        </div>
      )}
    </div>
  );
}

export default function StepBigFour({
  userId,
  favSport,
  favTeamId,
  favVenueId,
  favAthleteId,
  favEventId,
  onFavSportChange,
  onFavTeamChange,
  onFavVenueChange,
  onFavAthleteChange,
  onFavEventChange,
  onBack,
  onNext,
}: StepBigFourProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Record<string, string>>({});
  const supabase = createClient();

  async function handleNext() {
    setSaving(true);
    setError(null);

    const result = await updateBigFourAndSport(supabase, userId, {
      fav_sport: favSport,
      fav_team_id: favTeamId,
      fav_venue_id: favVenueId,
      fav_athlete_id: favAthleteId,
      fav_event_id: favEventId,
    });

    if ("error" in result) {
      setError(result.error);
      setSaving(false);
      return;
    }

    setSaving(false);
    onNext();
  }

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Your Favorites
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Pick your all-time favorites. These live at the top of your profile. You can skip any.
      </p>

      {/* Sport Badge */}
      <div className="mb-6">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Favorite Sport <span className="text-text-muted font-body text-[10px] normal-case tracking-normal">(avatar badge)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {SPORTS.map((s) => {
            const selected = favSport === s.key;
            return (
              <button
                key={s.key}
                onClick={() => onFavSportChange(selected ? null : s.key)}
                className="px-3.5 py-2 rounded-full text-xs transition-colors"
                style={{
                  background: selected ? "rgba(212,135,44,0.15)" : "var(--color-bg-input)",
                  border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
                  color: selected ? "var(--color-accent)" : "var(--color-text-secondary)",
                  fontWeight: selected ? 600 : 400,
                }}
              >
                {s.icon} {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Team search */}
      <SearchPicker
        label="Favorite Team"
        placeholder="Search teams..."
        selectedLabel={selectedLabels.team || null}
        onSearch={async (q) => {
          const results = await searchTeams(supabase, q);
          return results.map((t) => ({
            id: t.id,
            label: t.name,
            subtitle: t.league_name || undefined,
          }));
        }}
        onSelect={(id, label) => {
          onFavTeamChange(id);
          setSelectedLabels((p) => ({ ...p, team: label }));
        }}
        onClear={() => {
          onFavTeamChange(null);
          setSelectedLabels((p) => { const n = { ...p }; delete n.team; return n; });
        }}
      />

      {/* Venue search */}
      <SearchPicker
        label="Favorite Venue"
        placeholder="Search venues..."
        selectedLabel={selectedLabels.venue || null}
        onSearch={async (q) => {
          const results = await searchVenuesForOnboarding(supabase, q);
          return results.map((v) => ({
            id: v.id,
            label: v.name,
            subtitle: `${v.city}${v.state ? `, ${v.state}` : ""}`,
          }));
        }}
        onSelect={(id, label) => {
          onFavVenueChange(id);
          setSelectedLabels((p) => ({ ...p, venue: label }));
        }}
        onClear={() => {
          onFavVenueChange(null);
          setSelectedLabels((p) => { const n = { ...p }; delete n.venue; return n; });
        }}
      />

      {/* Athlete search */}
      <SearchPicker
        label="Favorite Athlete"
        placeholder="Search athletes..."
        selectedLabel={selectedLabels.athlete || null}
        onSearch={async (q) => {
          const results = await searchAthletes(supabase, q);
          return results.map((a) => ({
            id: a.id,
            label: a.name,
            subtitle: a.sport || undefined,
          }));
        }}
        onSelect={(id, label) => {
          onFavAthleteChange(id);
          setSelectedLabels((p) => ({ ...p, athlete: label }));
        }}
        onClear={() => {
          onFavAthleteChange(null);
          setSelectedLabels((p) => { const n = { ...p }; delete n.athlete; return n; });
        }}
      />

      {/* Event search */}
      <SearchPicker
        label="Favorite Event"
        placeholder="Search events..."
        selectedLabel={selectedLabels.event || null}
        onSearch={async (q) => {
          const results = await searchEvents(supabase, q);
          return results.map((e) => ({
            id: e.id,
            label: e.label,
            subtitle: e.venue_name ? `${e.venue_name} · ${e.event_date}` : e.event_date,
          }));
        }}
        onSelect={(id, label) => {
          onFavEventChange(id);
          setSelectedLabels((p) => ({ ...p, event: label }));
        }}
        onClear={() => {
          onFavEventChange(null);
          setSelectedLabels((p) => { const n = { ...p }; delete n.event; return n; });
        }}
      />

      {error && <p className="text-loss text-sm mb-4">{error}</p>}

      <div className="flex gap-3 mt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="flex-[2] py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-50 transition-opacity"
          style={{
            background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
          }}
        >
          {saving ? "SAVING..." : "NEXT"}
        </button>
      </div>
    </div>
  );
}
