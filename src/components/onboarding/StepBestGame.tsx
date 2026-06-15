"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { searchEvents, logAndFeatureBestGame } from "@/lib/queries/onboarding";
import { toastError } from "@/components/Toaster";

type Found = { id: string; label: string; venue_name: string | null; event_date: string };

type Props = {
  userId: string;
  /** The featured best game so far (drives the Event card + the finish gate). */
  best: { filled: boolean; name: string | null };
  onBestChange: (b: { filled: boolean; name: string | null }) => void;
  finishing: boolean;
  onBack: () => void;
  onFinish: () => void;
};

export default function StepBestGame({ userId, best, onBestChange, finishing, onBack, onFinish }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Found[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rating, setRating] = useState(0);
  const [logged, setLogged] = useState<string[]>([]); // labels logged this session
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const supabase = createClient();

  function handleSearch(q: string) {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setResults(await searchEvents(supabase, q, 12));
      setSearching(false);
    }, 300);
  }

  async function pick(ev: Found, asBest: boolean) {
    setSaving(true);
    const result = await logAndFeatureBestGame(supabase, userId, ev.id, asBest ? rating || null : null);
    setSaving(false);
    if ("error" in result) { toastError(result.error); return; }
    setQuery(""); setResults([]); setRating(0);
    setLogged((prev) => [...prev, ev.label]);
    // The first pick becomes the featured "best game"; later picks just seed.
    if (asBest || !best.filled) onBestChange({ filled: true, name: ev.label });
  }

  const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        What&apos;s the best game you&apos;ve been to?
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        {best.filled
          ? "Locked in. Add any others you want on your timeline, or head to your profile."
          : "Find the one that still gives you chills — search by team, venue, or year. This becomes your headliner."}
      </p>

      {!best.filled && (
        <div className="mb-3">
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n === rating ? 0 : n)}
                className="p-1"
                aria-label={`Rate ${n}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={n <= rating ? "var(--color-accent)" : "none"} stroke={n <= rating ? "var(--color-accent)" : "var(--color-text-muted)"} strokeWidth="1.5">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </button>
            ))}
            <span className="text-xs text-text-muted ml-1">{rating ? `${rating}/5` : "Rate it (optional)"}</span>
          </div>
        </div>
      )}

      <div className="relative mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="e.g. Yankees, Citizens Bank Park, 2009…"
          className="w-full py-3 px-3.5 rounded-xl bg-bg-input border border-border text-text-primary text-[15px] outline-none focus:border-accent transition-colors"
        />
        {searching && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-text-muted border-t-accent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-xl bg-bg-elevated border border-border overflow-hidden mb-4 max-h-72 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => pick(r, !best.filled)}
              disabled={saving}
              className="w-full text-left px-3.5 py-2.5 hover:bg-bg-input transition-colors border-b border-border last:border-b-0 disabled:opacity-50"
            >
              <div className="text-sm text-text-primary">{r.label}</div>
              <div className="text-xs text-text-muted">
                {fmt(r.event_date)}{r.venue_name ? ` · ${r.venue_name}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {logged.length > 0 && (
        <div className="mb-4">
          <div className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase mb-2">Added to your timeline</div>
          <div className="space-y-1.5">
            {logged.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-win)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {l}{i === 0 ? <span className="text-accent text-xs">· headliner</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated active:opacity-70 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onFinish}
          disabled={finishing || !best.filled}
          title={best.filled ? "" : "Pick your best game to finish"}
          className="flex-[2] py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-40 active:opacity-80 transition-opacity"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          {finishing ? "BUILDING YOUR PROFILE…" : "SEE MY PROFILE"}
        </button>
      </div>
    </div>
  );
}
