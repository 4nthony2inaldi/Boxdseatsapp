"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchTeams, searchVenuesForOnboarding } from "@/lib/queries/onboarding";

/**
 * Full-screen search picker for the leaderboard's Team and Venue filters.
 * Reuses the existing team/venue search (nickname + alias aware). Returns the
 * chosen id + a short label to show on the filter chip.
 */

type Item = { id: string; label: string; sub?: string };

export default function LeaderboardFilterPicker({
  kind,
  onPick,
  onClose,
}: {
  kind: "team" | "venue";
  onPick: (item: { id: string; label: string }) => void;
  onClose: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const query = q.trim();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!query) {
        setItems([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        if (kind === "team") {
          const r = await searchTeams(supabase, query, 15);
          setItems(r.map((t) => ({ id: t.id, label: t.short_name || t.name, sub: t.league_name ?? undefined })));
        } else {
          const r = await searchVenuesForOnboarding(supabase, query, { limit: 20 });
          setItems(r.map((v) => ({ id: v.id, label: v.name, sub: [v.city, v.state].filter(Boolean).join(", ") || undefined })));
        }
      } finally {
        setLoading(false);
      }
    }, query ? 300 : 0);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, kind, supabase]);

  return (
    <div className="fixed inset-0 z-[60] bg-bg flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <div className="max-w-lg mx-auto w-full flex flex-col flex-1 min-h-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={kind === "team" ? "Search teams…" : "Search venues…"}
            className="flex-1 bg-bg-input rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted outline-none focus:ring-1 focus:ring-accent"
          />
          <button onClick={onClose} className="text-sm text-text-muted px-2 active:opacity-70">
            Cancel
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {loading ? (
            <div className="py-10 text-center text-sm text-text-muted">Searching…</div>
          ) : items.length === 0 ? (
            <div className="py-10 text-center text-sm text-text-muted">
              {q.trim() ? "No matches." : `Type to find a ${kind}.`}
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {items.map((it) => (
                <button
                  key={it.id}
                  onClick={() => onPick({ id: it.id, label: it.label })}
                  className="text-left rounded-xl border border-border bg-bg-card px-3 py-2.5 active:opacity-80 transition-opacity"
                >
                  <div className="text-sm text-text-primary font-medium">{it.label}</div>
                  {it.sub && <div className="text-[11px] text-text-muted">{it.sub}</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
