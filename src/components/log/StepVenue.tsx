"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchUserVenues,
  searchVenues,
  type VenueResult,
} from "@/lib/queries/log";

type StepVenueProps = {
  userId: string;
  onSelect: (venue: VenueResult) => void;
};

export default function StepVenue({ userId, onSelect }: StepVenueProps) {
  const [search, setSearch] = useState("");
  const [userVenues, setUserVenues] = useState<VenueResult[]>([]);
  const [searchResults, setSearchResults] = useState<VenueResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load user's recent/most-visited venues on mount
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const venues = await fetchUserVenues(supabase, userId);
      setUserVenues(venues);
      setLoading(false);
    }
    load();
  }, [userId]);

  // Debounced search
  const handleSearch = useCallback(
    (query: string) => {
      setSearch(query);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!query.trim()) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        const supabase = createClient();
        const results = await searchVenues(supabase, query, userId);
        setSearchResults(results);
        setSearching(false);
      }, 300);
    },
    [userId]
  );

  const isSearching = search.trim().length > 0;

  // Filter user venues when searching (client-side filter for recent list)
  const filteredUserVenues = isSearching
    ? userVenues.filter((v) =>
        v.name.toLowerCase().includes(search.toLowerCase())
      )
    : userVenues;

  const displayVenues = isSearching ? searchResults : filteredUserVenues;

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-4">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5A5F72"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute left-3 top-1/2 -translate-y-1/2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search venues..."
          autoFocus
          className="w-full pl-9 pr-3 py-3 rounded-[10px] bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Section label */}
      {!isSearching && (
        <div className="font-display text-[11px] text-text-muted tracking-[2px] uppercase mb-2.5">
          {userVenues.length > 0 ? "Your Venues" : "All Venues"}
        </div>
      )}

      {isSearching && (
        <div className="font-display text-[11px] text-text-muted tracking-[2px] uppercase mb-2.5">
          Search Results
        </div>
      )}

      {/* Loading */}
      {(loading || searching) && (
        <div className="text-center text-text-muted text-sm py-8">
          Loading...
        </div>
      )}

      {/* Venue list */}
      {!loading && !searching && displayVenues.length === 0 && isSearching && (
        <div className="text-center text-text-muted text-sm py-8">
          No venues found for &ldquo;{search}&rdquo;
        </div>
      )}

      {!loading &&
        !searching &&
        displayVenues.map((venue) => (
          <button
            key={venue.id}
            onClick={() => onSelect(venue)}
            className="w-full flex items-center gap-3 p-3 bg-bg-card rounded-[10px] border border-border mb-2 cursor-pointer text-left hover:border-accent/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-[10px] bg-accent/10 flex items-center justify-center text-lg shrink-0">
              {venue.sport_icon || "🏟️"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary font-medium truncate">
                {venue.name}
              </div>
              <div className="text-[11px] text-text-muted">
                {venue.city}
                {venue.state ? `, ${venue.state}` : ""}
              </div>
            </div>
            {venue.visit_count > 0 && (
              <div className="text-[11px] text-text-muted shrink-0">
                {venue.visit_count}×
              </div>
            )}
          </button>
        ))}
    </div>
  );
}
