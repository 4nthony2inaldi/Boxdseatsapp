"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import MiniLabel from "@/components/MiniLabel";
import { createClient } from "@/lib/supabase/client";
import type { LeagueFavorite } from "@/lib/queries/bigfour";
import { searchVenuesForOnboarding } from "@/lib/queries/onboarding";
import {
  addFlatVenueFavorite,
  reorderLeagueFavorites,
  deleteLeagueFavorite,
  fetchLeagueFavorites,
} from "@/lib/queries/bigfour";
import { toastError } from "@/components/Toaster";
import SportIcon from "@/components/SportIcon";

type Props = {
  userId: string;
  initialFavorites: LeagueFavorite[];
  onChange?: (summary: { count: number; topName: string | null }) => void;
};

type Result = { id: string; name: string; city: string; state: string | null; sport: string | null };

export default function VenueFavoritesPicker({ userId, initialFavorites, onChange }: Props) {
  const [favorites, setFavorites] = useState(
    [...initialFavorites].sort((a, b) => a.rank - b.rank)
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const favoritesRef = useRef(favorites);
  const dragIndexRef = useRef(dragIndex);
  favoritesRef.current = favorites;
  dragIndexRef.current = dragIndex;
  const supabase = createClient();
  const router = useRouter();

  const pickedIds = new Set(favorites.map((f) => f.pick_id));

  useEffect(() => {
    onChange?.({ count: favorites.length, topName: favorites[0]?.pick_name ?? null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  // Run an open name/city search when the query changes. Venue sport tags are
  // unreliable (e.g. Gillette is tagged soccer), so there's no sport filter —
  // searching across all venues avoids hiding a venue under the wrong sport.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const found = await searchVenuesForOnboarding(supabase, query, {});
      setResults(found);
      setSearching(false);
    }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ── Drag-to-reorder (pointer based) ──
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
        if (y < r.top + r.height / 2) { target = i; break; }
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
      const result = await reorderLeagueFavorites(supabase, userId, "venue", order);
      if ("error" in result) toastError(result.error);
      // Bust the client Router Cache so the profile (reached via back-nav)
      // reflects the new order immediately.
      else router.refresh();
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragIndex]);

  async function refresh() {
    const next = await fetchLeagueFavorites(supabase, userId, "venue");
    setFavorites([...next].sort((a, b) => a.rank - b.rank));
    // Invalidate the cached profile page so the change shows on back-nav.
    router.refresh();
  }

  async function add(venueId: string) {
    setSaving(true);
    const result = await addFlatVenueFavorite(supabase, userId, venueId);
    if ("error" in result) toastError(result.error);
    else { await refresh(); setQuery(""); setResults([]); }
    setSaving(false);
  }

  async function remove(favoriteId: string) {
    setSaving(true);
    const result = await deleteLeagueFavorite(supabase, favoriteId, userId);
    if ("error" in result) toastError(result.error);
    else await refresh();
    setSaving(false);
  }

  const visibleResults = results.filter((r) => !pickedIds.has(r.id));

  return (
    <div className="space-y-4">
      {/* Add venues — kept at the top so it never gets buried as the list of
          added venues grows below it; encourages adding more. */}
      <div>
        <MiniLabel className="mb-2">{favorites.length > 0 ? "Add another" : "Add venues"}</MiniLabel>

        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by stadium name or city…"
            className="w-full py-2.5 px-3 rounded-lg bg-bg-input border border-border text-text-primary text-sm outline-none focus:border-accent transition-colors"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-text-muted border-t-accent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {!query.trim() && favorites.length === 0 && (
          <p className="mt-2 text-xs text-text-muted">
            Search by stadium name or city. Some venues may be listed under a current or former name — try both if you don&apos;t see it.
          </p>
        )}

        {visibleResults.length > 0 && (
          <div className="mt-1.5 rounded-lg bg-bg-elevated border border-border max-h-72 overflow-y-auto">
            {visibleResults.map((r) => (
              <button
                key={r.id}
                onClick={() => add(r.id)}
                disabled={saving}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-bg-input transition-colors border-b border-border last:border-b-0 disabled:opacity-50"
              >
                <SportIcon sport={r.sport} size={18} />
                <div className="min-w-0">
                  <div className="text-sm text-text-primary truncate">{r.name}</div>
                  <div className="text-xs text-text-muted truncate">
                    {r.city}{r.state ? `, ${r.state}` : ""}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Your ranked venues — populate below the search as you add them */}
      {favorites.length > 0 && (
        <div className="space-y-2">
          {favorites.map((fav, i) => {
            const dragging = dragIndex === i;
            return (
              <div
                key={fav.id}
                ref={(el) => { rowRefs.current[i] = el; }}
                className={`bg-bg-card rounded-xl border overflow-hidden ${dragging ? "border-accent shadow-lg shadow-black/30 opacity-90" : "border-border"}`}
              >
                <div className="flex items-center gap-2.5 px-3 py-3">
                  <button
                    aria-label="Drag to reorder"
                    onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId); setDragIndex(i); }}
                    className="touch-none cursor-grab active:cursor-grabbing text-text-muted hover:text-text-secondary p-1 -ml-1"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                    </svg>
                  </button>
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${i === 0 ? "bg-accent text-bg" : "bg-bg-elevated text-text-secondary"}`}>
                    {i + 1}
                  </div>
                  <SportIcon sport={fav.sport} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate">{fav.pick_name}</div>
                    <div className="text-xs text-text-muted truncate">
                      {fav.league_name}
                      {i === 0 && <span className="text-accent"> · Featured</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(fav.id)}
                    disabled={saving}
                    aria-label="Remove venue"
                    className="text-text-muted hover:text-loss transition-colors p-1 disabled:opacity-50"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
