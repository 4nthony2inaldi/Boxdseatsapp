"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchAll, type SearchResults } from "@/lib/queries/social";
import SectionLabel from "@/components/profile/SectionLabel";

export default function ExploreSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    setQuery(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const supabase = createClient();
      const data = await searchAll(supabase, value);
      setResults(data);
      setLoading(false);
    }, 300);
  };

  const hasResults =
    results &&
    (results.users.length > 0 ||
      results.venues.length > 0 ||
      results.teams.length > 0);

  const noResults = results && !hasResults;

  return (
    <div className="px-4">
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
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search users, venues, teams..."
          className="w-full bg-bg-input rounded-xl border border-border pl-9 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary bg-transparent border-none cursor-pointer p-0"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {loading && (
        <div className="text-center text-text-muted text-sm py-8">
          Searching...
        </div>
      )}

      {!loading && noResults && (
        <div className="text-center text-text-muted text-sm py-8">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}

      {!loading && !query && (
        <div className="text-center text-text-muted text-sm py-12">
          Search for users, venues, or teams to explore.
        </div>
      )}

      {!loading && hasResults && (
        <div className="space-y-6">
          {/* Users */}
          {results.users.length > 0 && (
            <div>
              <SectionLabel>Users</SectionLabel>
              <div className="space-y-1">
                {results.users.map((u) => (
                  <Link
                    key={u.id}
                    href={`/user/${u.username}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-bg-card/50 rounded-lg px-2 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden">
                      {u.avatar_url ? (
                        <img
                          src={u.avatar_url}
                          alt={u.display_name || u.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white text-xs font-display"
                          style={{
                            background:
                              "linear-gradient(135deg, #D4872C 0%, #7B5B3A 100%)",
                          }}
                        >
                          {(u.display_name || u.username || "?")[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary font-medium truncate">
                        {u.display_name || u.username}
                      </div>
                      <div className="text-xs text-text-muted">
                        @{u.username}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Venues */}
          {results.venues.length > 0 && (
            <div>
              <SectionLabel>Venues</SectionLabel>
              <div className="space-y-1">
                {results.venues.map((v) => (
                  <Link
                    key={v.id}
                    href={`/venue/${v.id}`}
                    className="flex items-center gap-3 py-2.5 hover:bg-bg-card/50 rounded-lg px-2 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#D4872C"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary font-medium truncate">
                        {v.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {v.city}
                        {v.state ? `, ${v.state}` : ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Teams */}
          {results.teams.length > 0 && (
            <div>
              <SectionLabel>Teams</SectionLabel>
              <div className="space-y-1">
                {results.teams.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 py-2.5 px-2"
                  >
                    <div className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                      <span className="text-base">
                        {t.league_icon || "🏟️"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary font-medium truncate">
                        {t.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {t.league_name || ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
