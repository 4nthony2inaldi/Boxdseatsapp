"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { searchAll, type SearchResults } from "@/lib/queries/social";
import SportIcon from "@/components/SportIcon";
import SectionLabel from "@/components/profile/SectionLabel";
import { toastError } from "@/components/Toaster";

export default function ExploreSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = (value: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLoading(true);
    setSearchFailed(false);
    timerRef.current = setTimeout(async () => {
      try {
        const supabase = createClient();
        const data = await searchAll(supabase, value);
        setResults(data);
      } catch {
        setResults(null);
        setSearchFailed(true);
        toastError("Search failed. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleChange = (value: string) => {
    setQuery(value);

    if (timerRef.current) clearTimeout(timerRef.current);

    if (!value.trim()) {
      setResults(null);
      setSearchFailed(false);
      setLoading(false);
      return;
    }

    runSearch(value);
  };

  const hasResults =
    results &&
    (results.users.length > 0 ||
      results.venues.length > 0 ||
      results.teams.length > 0 ||
      results.lists.length > 0);

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
          stroke="var(--color-text-faint)"
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
          placeholder="Search users, venues, teams, lists..."
          aria-label="Search"
          className="w-full bg-bg-input rounded-xl border border-border pl-9 pr-4 py-3.5 text-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults(null);
              setSearchFailed(false);
            }}
            aria-label="Clear search"
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

      {!loading && searchFailed && query.trim() && (
        <div className="text-center text-sm py-8">
          <p className="text-text-muted mb-3">
            Something went wrong searching for &ldquo;{query}&rdquo;.
          </p>
          <button
            onClick={() => runSearch(query)}
            className="bg-bg-elevated border border-border rounded-lg px-4 py-2 text-text-secondary hover:text-accent hover:border-accent/30 transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !searchFailed && noResults && (
        <div className="text-center text-text-muted text-sm py-8">
          No results found for &ldquo;{query}&rdquo;
        </div>
      )}

      {!loading && !query && (
        <div className="text-center text-text-muted text-sm py-12">
          Search for users, venues, teams, or lists to explore.
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
                        <Image
                          src={u.avatar_url}
                          alt={u.display_name || u.username}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white text-xs font-display"
                          style={{
                            background:
                              "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
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
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {v.photo_url ? (
                        <Image
                          src={v.photo_url}
                          alt={v.name}
                          width={36}
                          height={36}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--color-accent)"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      )}
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
                  <Link
                    key={t.id}
                    href={`/team/${t.id}`}
                    className="flex items-center gap-3 py-2.5 px-2 hover:bg-bg-card/50 rounded-lg transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0 p-1">
                      {t.logo_url ? (
                        <Image
                          src={t.logo_url}
                          alt={t.name}
                          width={28}
                          height={28}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <SportIcon src={t.league_icon} size={22} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary font-medium truncate">
                        {t.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {t.league_name || ""}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Lists */}
          {results.lists.length > 0 && (
            <div>
              <SectionLabel>Lists</SectionLabel>
              <div className="space-y-1">
                {results.lists.map((l) => (
                  <Link
                    key={l.id}
                    href={`/lists/${l.id}`}
                    className="flex items-center gap-3 py-2.5 px-2 hover:bg-bg-card/50 rounded-lg transition-colors"
                  >
                    <div className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center shrink-0">
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="8" y1="6" x2="21" y2="6" />
                        <line x1="8" y1="12" x2="21" y2="12" />
                        <line x1="8" y1="18" x2="21" y2="18" />
                        <line x1="3" y1="6" x2="3.01" y2="6" />
                        <line x1="3" y1="12" x2="3.01" y2="12" />
                        <line x1="3" y1="18" x2="3.01" y2="18" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary font-medium truncate">
                        {l.name}
                      </div>
                      <div className="text-xs text-text-muted">
                        {l.item_count} {l.item_count === 1 ? "item" : "items"}
                        {l.source === "user" &&
                          (l.creator_display_name || l.creator_username) &&
                          ` · by ${l.creator_display_name || l.creator_username}`}
                        {l.source === "system" && " · Challenge"}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
