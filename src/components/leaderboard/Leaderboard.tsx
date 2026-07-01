"use client";

/* eslint-disable @next/next/no-img-element -- small avatars with initial fallback */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import SportIcon from "@/components/SportIcon";
import {
  fetchLeaderboard,
  type LeaderboardResult,
  type LeaderboardRow,
  type LeaderboardScope,
  type LeaderboardWindow,
} from "@/lib/queries/leaderboard";

/**
 * Leaderboards: rank fans by games logged, sliced by scope (global / my city /
 * following), time window (all-time / last 12 months), and sport. The board
 * always pins the viewer's own row so there's a reachable target. Team/venue
 * filters are supported by the RPC and land as a follow-up (pickers).
 */

const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: "global", label: "Global" },
  { key: "city", label: "My City" },
  { key: "following", label: "Following" },
];

const SPORTS: { key: string | null; label: string }[] = [
  { key: null, label: "All" },
  { key: "baseball", label: "Baseball" },
  { key: "basketball", label: "Basketball" },
  { key: "football", label: "Football" },
  { key: "hockey", label: "Hockey" },
  { key: "soccer", label: "Soccer" },
];

function since12mo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 12);
  return d.toISOString().slice(0, 10);
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-bg-input p-1">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
            value === o.key ? "bg-accent text-bg" : "text-text-muted active:opacity-70"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const supabase = useMemo(() => createClient(), []);
  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [win, setWin] = useState<LeaderboardWindow>("all");
  const [sport, setSport] = useState<string | null>(null);
  const [data, setData] = useState<LeaderboardResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show the spinner while a filter change refetches
    setLoading(true);
    fetchLeaderboard(supabase, {
      scope,
      sport,
      since: win === "12m" ? since12mo() : null,
    })
      .then((r) => {
        if (active) setData(r);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, scope, win, sport]);

  const rows = data?.rows ?? [];
  const me = data?.me ?? null;
  const meInList = me != null && rows.some((r) => r.rank === me.rank && r.games === me.games);

  return (
    <div className="px-4 pb-24">
      <div className="flex flex-col gap-2.5">
        <Segmented options={SCOPES} value={scope} onChange={setScope} />
        <Segmented
          options={[
            { key: "all" as LeaderboardWindow, label: "All-time" },
            { key: "12m" as LeaderboardWindow, label: "Last 12 months" },
          ]}
          value={win}
          onChange={setWin}
        />
        {/* Sport filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {SPORTS.map((s) => {
            const on = s.key === sport;
            return (
              <button
                key={s.label}
                onClick={() => setSport(s.key)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  on ? "border-accent/50 bg-accent/15 text-accent" : "border-border text-text-muted"
                }`}
              >
                {s.key && <SportIcon sport={s.key} size={14} />}
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="py-16 text-center text-sm text-text-muted">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-text-muted">
            {scope === "city"
              ? "No ranked fans in your city yet — set your home city in Settings, or be the first."
              : scope === "following"
                ? "No one you follow has logged a matching game yet."
                : "No games match this filter yet."}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {rows.map((r) => (
              <Row key={r.user_id} r={r} highlight={me != null && r.rank === me.rank && r.games === me.games} />
            ))}
          </div>
        )}
      </div>

      {/* Pinned "you" — always visible when the caller has a rank and isn't
          already shown in the list above. */}
      {me != null && !meInList && (
        <div className="fixed inset-x-0 bottom-16 z-30 pointer-events-none">
          <div className="max-w-lg mx-auto px-4">
            <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-accent/40 bg-bg-card/95 backdrop-blur-sm px-4 py-2.5 shadow-lg">
              <span className="font-display text-sm text-accent w-10 shrink-0">#{me.rank}</span>
              <span className="text-sm text-text-primary font-medium flex-1">You</span>
              <span className="text-sm text-text-secondary">{me.games.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ r, highlight }: { r: LeaderboardRow; highlight: boolean }) {
  const name = r.display_name || `@${r.username}`;
  return (
    <Link
      href={`/user/${r.username}`}
      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 active:opacity-80 transition-opacity ${
        highlight ? "border-accent/50 bg-accent/10" : "border-border bg-bg-card"
      }`}
    >
      <span className="font-display text-sm w-8 shrink-0 text-text-secondary tabular-nums">{r.rank}</span>
      <div className="w-8 h-8 rounded-full overflow-hidden bg-bg-elevated flex items-center justify-center shrink-0">
        {r.avatar_url ? (
          <img src={r.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="font-display text-xs text-text-secondary">{name.charAt(name.startsWith("@") ? 1 : 0).toUpperCase()}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm text-text-primary font-medium truncate">{name}</div>
        <div className="text-[11px] text-text-muted truncate">@{r.username}</div>
      </div>
      <span className="font-display text-sm text-text-primary tabular-nums">{r.games.toLocaleString()}</span>
    </Link>
  );
}
