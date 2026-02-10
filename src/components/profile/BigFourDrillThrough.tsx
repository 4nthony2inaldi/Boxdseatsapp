"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeagueFavorite } from "@/lib/queries/bigfour";
import {
  searchTeams,
  searchVenuesForOnboarding,
  searchAthletes,
  searchEvents,
} from "@/lib/queries/onboarding";
import { upsertLeagueFavorite, setFeaturedFavorite } from "@/lib/queries/bigfour";
import SportIcon from "@/components/SportIcon";
import { LEAGUES_LIST } from "@/lib/sportIcons";

const ALL_LEAGUES = LEAGUES_LIST;

type Props = {
  userId: string;
  category: "team" | "venue" | "athlete" | "event";
  initialFavorites: LeagueFavorite[];
  featuredPickId: string | null;
};

type SearchResult = { id: string; label: string; subtitle?: string };

export default function BigFourDrillThrough({
  userId,
  category,
  initialFavorites,
  featuredPickId,
}: Props) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [featuredId, setFeaturedId] = useState(featuredPickId);
  const [editingLeagueSlug, setEditingLeagueSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const supabase = createClient();

  async function handleSearch(q: string) {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      let results: SearchResult[] = [];
      if (category === "team") {
        const teams = await searchTeams(supabase, q);
        results = teams.map((t) => ({
          id: t.id,
          label: t.name,
          subtitle: t.league_name || undefined,
        }));
      } else if (category === "venue") {
        const venues = await searchVenuesForOnboarding(supabase, q);
        results = venues.map((v) => ({
          id: v.id,
          label: v.name,
          subtitle: `${v.city}${v.state ? `, ${v.state}` : ""}`,
        }));
      } else if (category === "athlete") {
        const athletes = await searchAthletes(supabase, q);
        results = athletes.map((a) => ({
          id: a.id,
          label: a.name,
          subtitle: a.sport || undefined,
        }));
      } else if (category === "event") {
        const events = await searchEvents(supabase, q);
        results = events.map((e) => ({
          id: e.id,
          label: e.label,
          subtitle: e.venue_name || undefined,
        }));
      }
      setSearchResults(results);
      setSearching(false);
    }, 300);
  }

  async function handleSelect(leagueSlug: string, pickId: string, pickName: string) {
    // Find the league ID
    const { data: league } = await supabase
      .from("leagues")
      .select("id")
      .eq("slug", leagueSlug)
      .single();

    if (!league) return;

    setSaving(true);
    const result = await upsertLeagueFavorite(
      supabase,
      userId,
      category,
      league.id,
      pickId
    );

    if ("success" in result) {
      // Update local state
      setFavorites((prev) => {
        const filtered = prev.filter((f) => f.league_slug !== leagueSlug);
        return [
          ...filtered,
          {
            id: `temp-${Date.now()}`,
            league_id: league.id,
            league_name: ALL_LEAGUES.find((l) => l.slug === leagueSlug)?.name || "",
            league_slug: leagueSlug,
            league_icon: ALL_LEAGUES.find((l) => l.slug === leagueSlug)?.icon || "",
            pick_name: pickName,
            pick_id: pickId,
          },
        ];
      });
    }

    setSaving(false);
    setEditingLeagueSlug(null);
    setSearchQuery("");
    setSearchResults([]);
  }

  async function handleSetFeatured(pickId: string) {
    setSaving(true);
    const result = await setFeaturedFavorite(supabase, userId, category, pickId);
    if ("success" in result) {
      setFeaturedId(pickId);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-2">
      {ALL_LEAGUES.map((league) => {
        const fav = favorites.find((f) => f.league_slug === league.slug);
        const isEditing = editingLeagueSlug === league.slug;

        return (
          <div key={league.slug} className="bg-bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <SportIcon league={league.slug} size={24} />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-text-primary font-medium">
                  {league.name}
                </div>
                {fav ? (
                  <div className="text-xs text-accent truncate">{fav.pick_name}</div>
                ) : (
                  <div className="text-xs text-text-muted">No pick yet</div>
                )}
              </div>
              {fav && (
                <button
                  onClick={() => handleSetFeatured(fav.pick_id)}
                  disabled={saving}
                  title={featuredId === fav.pick_id ? "Featured favorite" : "Set as featured"}
                  className="p-1 transition-colors disabled:opacity-50"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={featuredId === fav.pick_id ? "#D4872C" : "transparent"}
                    stroke={featuredId === fav.pick_id ? "#D4872C" : "#5A5F72"}
                    strokeWidth="1.5"
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => {
                  if (isEditing) {
                    setEditingLeagueSlug(null);
                    setSearchQuery("");
                    setSearchResults([]);
                  } else {
                    setEditingLeagueSlug(league.slug);
                  }
                }}
                className="text-xs text-text-muted hover:text-accent transition-colors px-2 py-1"
              >
                {isEditing ? "Cancel" : fav ? "Edit" : "Add"}
              </button>
            </div>

            {isEditing && (
              <div className="px-4 pb-3 border-t border-border pt-3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={`Search ${category}s...`}
                    autoFocus
                    className="w-full py-2.5 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
                  />
                  {searching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-3.5 h-3.5 border-2 border-text-muted border-t-accent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                {searchResults.length > 0 && (
                  <div className="mt-1.5 rounded-lg bg-bg-elevated border border-border max-h-40 overflow-y-auto">
                    {searchResults.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleSelect(league.slug, r.id, r.label)}
                        disabled={saving}
                        className="w-full text-left px-3 py-2 hover:bg-bg-input transition-colors border-b border-border last:border-b-0 disabled:opacity-50"
                      >
                        <div className="text-sm text-text-primary truncate">{r.label}</div>
                        {r.subtitle && (
                          <div className="text-xs text-text-muted truncate">{r.subtitle}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
