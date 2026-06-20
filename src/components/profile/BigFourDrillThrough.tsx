"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LeagueFavorite } from "@/lib/queries/bigfour";
import {
  searchTeams,
  searchVenuesForOnboarding,
  searchAthletes,
} from "@/lib/queries/onboarding";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  upsertLeagueFavorite,
  reorderLeagueFavorites,
  deleteLeagueFavorite,
  fetchLeagueFavorites,
  fetchLoggedEventChoices,
} from "@/lib/queries/bigfour";
import { fetchSelectableLeagues, type SelectableLeague } from "@/lib/queries/leagues";
import { toastError } from "@/components/Toaster";
import SportIcon from "@/components/SportIcon";

// Sports with no teams — the "team" slot for these leagues holds an
// athlete (Sinner for ATP, Blaney for NASCAR, ...).
const INDIVIDUAL_SPORTS = new Set(["tennis", "golf", "motorsports"]);

type Props = {
  userId: string;
  category: "team" | "venue" | "athlete" | "event";
  initialFavorites: LeagueFavorite[];
  /** Fires whenever the pick set changes — used to drive onboarding progress. */
  onChange?: (summary: { count: number; topName: string | null }) => void;
};

type SearchResult = {
  id: string;
  label: string;
  subtitle?: string;
  // Set on ESPN-only athlete hits (not yet in our table). `id` is empty for
  // these; selecting one resolves it to a real athlete id first.
  espnId?: string;
  espnSport?: string | null;
  espnHeadshot?: string | null;
};

/**
 * Athlete search: the /api/athlete-search route adds an ESPN fallback (to find
 * players we haven't ingested). But the picker must never be fully dependent on
 * that route — if it's unavailable for any reason, fall back to a direct local
 * search (authed via the client session) so the Players section always works.
 */
async function searchAthletesWithFallback(
  supabase: SupabaseClient,
  q: string,
  sport: string | null
): Promise<SearchResult[]> {
  try {
    const res = await fetch("/api/athlete-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, sport }),
    });
    if (!res.ok) throw new Error(`athlete-search ${res.status}`);
    const { results } = (await res.json()) as {
      results: { id: string | null; espnId: string | null; name: string; sport: string | null; headshot: string | null }[];
    };
    return results.map((r) => ({
      id: r.id ?? "",
      label: r.name,
      subtitle: r.sport || undefined,
      espnId: r.espnId ?? undefined,
      espnSport: r.sport,
      espnHeadshot: r.headshot,
    }));
  } catch {
    // Route failed — local-only search still surfaces players we already have.
    const local = await searchAthletes(supabase, q, 10, sport);
    return local.map((a) => ({ id: a.id, label: a.name, subtitle: a.sport || undefined }));
  }
}

const CATEGORY_NOUN: Record<Props["category"], string> = {
  team: "team",
  venue: "venue",
  athlete: "athlete",
  event: "event",
};

export default function BigFourDrillThrough({
  userId,
  category,
  initialFavorites,
  onChange,
}: Props) {
  const [favorites, setFavorites] = useState(
    [...initialFavorites].sort((a, b) => a.rank - b.rank)
  );
  const [editingLeagueSlug, setEditingLeagueSlug] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Monotonic token so a slower, older search response can't overwrite a newer
  // one (out-of-order results) and so an in-flight search can be invalidated.
  const searchSeqRef = useRef(0);
  // Synchronous re-entry guard for select — `saving` state lags the first await.
  const savingRef = useRef(false);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const favoritesRef = useRef(favorites);
  const dragIndexRef = useRef(dragIndex);
  favoritesRef.current = favorites;
  dragIndexRef.current = dragIndex;
  const supabase = createClient();

  // Selectable leagues come from the DB so a newly added league appears here
  // automatically — no hardcoded list to maintain.
  const [allLeagues, setAllLeagues] = useState<SelectableLeague[]>([]);
  useEffect(() => {
    fetchSelectableLeagues(supabase).then(setAllLeagues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sportBySlug = useMemo(
    () => new Map(allLeagues.map((l) => [l.slug, l.sport])),
    [allLeagues]
  );
  const isIndividualLeague = (slug: string | null): boolean => {
    const sport = slug ? sportBySlug.get(slug) : null;
    return !!sport && INDIVIDUAL_SPORTS.has(sport);
  };

  const pickedSlugs = new Set(favorites.map((f) => f.league_slug));
  // Individual sports (golf/tennis/motorsports) have no teams — they're picked
  // in the Players section. Don't offer them in the Teams section (confusing).
  const unpickedLeagues = allLeagues.filter(
    (l) => !pickedSlugs.has(l.slug) && !(category === "team" && !!l.sport && INDIVIDUAL_SPORTS.has(l.sport))
  );

  // Report progress (headliner is the lowest-rank pick) for onboarding.
  useEffect(() => {
    onChange?.({ count: favorites.length, topName: favorites[0]?.pick_name ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  // ── Drag-to-reorder (pointer based, works on touch + mouse) ──
  useEffect(() => {
    if (dragIndex === null) return;

    function onMove(e: PointerEvent) {
      const from = dragIndexRef.current;
      if (from === null) return;
      const y = e.clientY;
      const list = favoritesRef.current;
      let target = from;
      for (let i = 0; i < list.length; i++) {
        const el = rowRefs.current[i];
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (y < r.top + r.height / 2) {
          target = i;
          break;
        }
        target = i;
      }
      if (target !== from) {
        setFavorites((prev) => {
          const next = [...prev];
          const [moved] = next.splice(from, 1);
          next.splice(target, 0, moved);
          return next;
        });
        setDragIndex(target);
      }
    }

    async function onUp() {
      const order = favoritesRef.current.map((f) => f.id);
      setDragIndex(null);
      const result = await reorderLeagueFavorites(supabase, userId, category, order);
      if ("error" in result) toastError(result.error);
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIndex]);

  async function handleSearch(q: string, leagueSlugOverride?: string) {
    setSearchQuery(q);
    if (!q.trim() && category !== "event") {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const seq = ++searchSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      let results: SearchResult[] = [];
      const slugForRow = leagueSlugOverride ?? editingLeagueSlug;
      if (category === "team") {
        if (isIndividualLeague(slugForRow)) {
          const sport = (slugForRow ? sportBySlug.get(slugForRow) : null) ?? null;
          results = await searchAthletesWithFallback(supabase, q, sport);
        } else {
          const teams = await searchTeams(supabase, q, 10, slugForRow);
          results = teams.map((t) => ({ id: t.id, label: t.name, subtitle: t.league_name || undefined }));
        }
      } else if (category === "venue") {
        const venues = await searchVenuesForOnboarding(supabase, q);
        results = venues.map((v) => ({
          id: v.id,
          label: v.name,
          subtitle: `${v.city}${v.state ? `, ${v.state}` : ""}`,
        }));
      } else if (category === "athlete") {
        const sport = (slugForRow ? sportBySlug.get(slugForRow) : null) ?? null;
        results = await searchAthletesWithFallback(supabase, q, sport);
      } else if (category === "event") {
        const events = await fetchLoggedEventChoices(supabase, userId, slugForRow, q);
        results = events.map((e) => ({ id: e.id, label: e.label, subtitle: e.subtitle }));
      }
      // Drop stale responses: a newer search (or a close/select) has superseded
      // this one.
      if (seq !== searchSeqRef.current) return;
      setSearchResults(results);
      setSearching(false);
    }, 300);
  }

  function openEditor(leagueSlug: string) {
    setEditingLeagueSlug(leagueSlug);
    setSearchQuery("");
    setSearchResults([]);
    if (category === "event") handleSearch("", leagueSlug);
  }

  function closeEditor() {
    // Invalidate any pending/in-flight search so it can't repopulate the list
    // after the editor has closed.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchSeqRef.current++;
    setEditingLeagueSlug(null);
    setSearchQuery("");
    setSearchResults([]);
    setSearching(false);
  }

  async function refresh() {
    const next = await fetchLeagueFavorites(supabase, userId, category);
    setFavorites([...next].sort((a, b) => a.rank - b.rank));
  }

  async function handleSelect(leagueSlug: string, pick: SearchResult) {
    // Synchronous guard: a fast double-tap fires before `saving` state lands.
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    // Stop any in-flight search from repopulating the list mid-select.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    searchSeqRef.current++;

    try {
      const { data: league } = await supabase
        .from("leagues")
        .select("id")
        .eq("slug", leagueSlug)
        .single();
      if (!league) return;

      // ESPN-only athlete: upsert it into our table first to get a real id.
      let pickId = pick.id;
      if (!pickId && pick.espnId) {
        try {
          const res = await fetch("/api/athlete-resolve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ espnId: pick.espnId, name: pick.label, sport: pick.espnSport, headshot: pick.espnHeadshot }),
          });
          const data = await res.json();
          if (!res.ok || !data.id) throw new Error();
          pickId = data.id as string;
        } catch {
          toastError("Couldn't add that player. Try again.");
          return;
        }
      }
      if (!pickId) return;

      const pickKind =
        category === "team" && isIndividualLeague(leagueSlug) ? "athlete" : category;
      const result = await upsertLeagueFavorite(
        supabase,
        userId,
        category,
        league.id,
        pickId,
        pickKind
      );
      if ("error" in result) toastError(result.error);
      else await refresh();
      closeEditor();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  async function handleRemove(favoriteId: string) {
    setSaving(true);
    const result = await deleteLeagueFavorite(supabase, favoriteId, userId);
    if ("error" in result) toastError(result.error);
    else await refresh();
    setSaving(false);
  }

  const noun = CATEGORY_NOUN[category];

  // A plain function returning JSX (not a nested component rendered as
  // <SearchBox/>) — that would get a fresh component identity each render and
  // remount the input, dropping focus on every keystroke.
  const renderSearchBox = (leagueSlug: string, leagueName: string) => {
    const individual = category === "team" && isIndividualLeague(leagueSlug);
    const placeholder =
      category === "event"
        ? "Filter your logged events..."
        : individual
          ? sportBySlug.get(leagueSlug) === "motorsports"
            ? "Search drivers..."
            : "Search players..."
          : `Search ${noun}s...`;
    return (
      <div className="px-4 pb-3 border-t border-border pt-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={placeholder}
            autoFocus
            className="w-full py-2.5 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-text-muted border-t-accent rounded-full animate-spin" />
            </div>
          )}
        </div>
        {category === "event" && !searching && searchResults.length === 0 && (
          <p className="mt-2 text-xs text-text-muted">
            {searchQuery.trim()
              ? "No logged events match."
              : `No logged ${leagueName} events yet — favorite events are picked from events you've logged.`}
          </p>
        )}
        {searchResults.length > 0 && (
          <div className="mt-1.5 rounded-lg bg-bg-elevated border border-border max-h-40 overflow-y-auto">
            {searchResults.map((r, i) => (
              <button
                key={`${r.id}|${r.espnId ?? ""}|${i}`}
                onClick={() => handleSelect(leagueSlug, r)}
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
    );
  };

  return (
    <div className="space-y-5">
      {/* Ranking */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          {favorites.map((fav, i) => {
            const isEditing = editingLeagueSlug === fav.league_slug;
            const dragging = dragIndex === i;
            return (
              <div
                key={fav.id}
                ref={(el) => { rowRefs.current[i] = el; }}
                className={`bg-bg-card rounded-xl border overflow-hidden transition-shadow ${
                  dragging ? "border-accent shadow-lg shadow-black/30 opacity-90" : "border-border"
                }`}
              >
                <div className="flex items-center gap-2.5 px-3 py-3">
                  {/* Drag handle */}
                  <button
                    aria-label="Drag to reorder"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
                      setDragIndex(i);
                    }}
                    className="touch-none cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary p-1 -ml-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                    </svg>
                  </button>
                  {/* Rank badge */}
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      i === 0 ? "bg-accent text-white" : "bg-bg-elevated text-text-secondary"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <SportIcon league={fav.league_slug} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate">
                      {fav.pick_name}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {fav.league_name}
                      {i === 0 && <span className="text-accent"> · Featured</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => (isEditing ? closeEditor() : openEditor(fav.league_slug))}
                    className="text-xs text-text-muted hover:text-accent transition-colors px-1.5 py-1"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                  <button
                    onClick={() => handleRemove(fav.id)}
                    disabled={saving}
                    aria-label="Remove pick"
                    className="text-text-muted hover:text-loss transition-colors p-1 disabled:opacity-50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
                {isEditing && renderSearchBox(fav.league_slug, fav.league_name)}
              </div>
            );
          })}
        </div>
      )}

      {/* Add by league */}
      {unpickedLeagues.length > 0 && (
        <div>
          <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-2">
            {favorites.length > 0 ? "Add another" : "Add a pick"}
          </div>
          <div className="space-y-2">
            {unpickedLeagues.map((league) => {
              const isEditing = editingLeagueSlug === league.slug;
              return (
                <div key={league.slug} className="bg-bg-card rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <SportIcon sport={league.sport} size={22} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary font-medium">{league.name}</div>
                      <div className="text-xs text-text-muted">No pick yet</div>
                    </div>
                    <button
                      onClick={() => (isEditing ? closeEditor() : openEditor(league.slug))}
                      className="text-xs text-text-muted hover:text-accent transition-colors px-2 py-1"
                    >
                      {isEditing ? "Cancel" : "Add"}
                    </button>
                  </div>
                  {isEditing && renderSearchBox(league.slug, league.name)}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
