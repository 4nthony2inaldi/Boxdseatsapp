"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import SportIcon from "@/components/SportIcon";
import { toastError } from "@/components/Toaster";
import { formatDate, plural } from "@/lib/formatters";
import type { RootlessGame } from "@/lib/queries/rooting";

type Props = {
  games: RootlessGame[];
  favoriteTeamIds: string[];
};

/** "Won 4-1" / "Lost 1-4" / "Tied 2-2" from the chosen side. */
function resultText(g: RootlessGame, rooting: string | null): { label: string; tone: "win" | "loss" | "muted" } {
  if (!rooting) return { label: "", tone: "muted" };
  const mine = rooting === g.home.id ? g.home.score : g.away.score;
  const opp = rooting === g.home.id ? g.away.score : g.home.score;
  if (mine > opp) return { label: `Won ${mine}–${opp}`, tone: "win" };
  if (mine < opp) return { label: `Lost ${mine}–${opp}`, tone: "loss" };
  return { label: `Tied ${mine}–${opp}`, tone: "muted" };
}

export default function RootingBackfillView({ games, favoriteTeamIds }: Props) {
  const router = useRouter();
  const favSet = useMemo(() => new Set(favoriteTeamIds), [favoriteTeamIds]);
  const [rooting, setRooting] = useState<Record<string, string | null>>(
    () => Object.fromEntries(games.map((g) => [g.logId, null]))
  );
  const [rootedTeams, setRootedTeams] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  const setOne = (logId: string, teamId: string | null) =>
    setRooting((prev) => ({ ...prev, [logId]: teamId }));

  // Distinct teams across these games, with how many games each appears in —
  // fuel for the one-tap bulk chips.
  const teamTally = useMemo(() => {
    const m = new Map<string, { name: string; count: number; fav: boolean }>();
    for (const g of games) {
      for (const t of [g.home, g.away]) {
        const cur = m.get(t.id);
        if (cur) cur.count++;
        else m.set(t.id, { name: t.name, count: 1, fav: favSet.has(t.id) });
      }
    }
    return [...m.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => Number(b.fav) - Number(a.fav) || b.count - a.count);
  }, [games, favSet]);

  // How many games a favorite team plays in but that have no side yet.
  const favGameCount = useMemo(
    () => games.filter((g) => rooting[g.logId] == null && (favSet.has(g.home.id) || favSet.has(g.away.id))).length,
    [games, rooting, favSet]
  );

  const decidedCount = Object.values(rooting).filter(Boolean).length;

  // Set rooting across every game a team plays in (without overriding a game you
  // already set yourself), and clear it back to neutral when untapped.
  function toggleTeam(teamId: string) {
    setRootedTeams((prev) => {
      const next = new Set(prev);
      const turningOn = !next.has(teamId);
      if (turningOn) next.add(teamId);
      else next.delete(teamId);
      setRooting((prevR) => {
        const updated = { ...prevR };
        for (const g of games) {
          const involves = g.home.id === teamId || g.away.id === teamId;
          if (!involves) continue;
          if (turningOn && updated[g.logId] == null) updated[g.logId] = teamId;
          else if (!turningOn && updated[g.logId] === teamId) updated[g.logId] = null;
        }
        return updated;
      });
      return next;
    });
  }

  function applyFavorites() {
    setRooting((prev) => {
      const updated = { ...prev };
      for (const g of games) {
        if (updated[g.logId] != null) continue;
        if (favSet.has(g.home.id)) updated[g.logId] = g.home.id;
        else if (favSet.has(g.away.id)) updated[g.logId] = g.away.id;
      }
      return updated;
    });
  }

  async function commit() {
    const picks = games
      .filter((g) => rooting[g.logId])
      .map((g) => ({ logId: g.logId, rootingTeamId: rooting[g.logId] as string }));
    if (!picks.length) return;
    setSaving(true);
    try {
      const res = await fetch("/api/rooting-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setDone(result.updated ?? picks.length);
    } catch {
      toastError("Couldn't save those picks — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done !== null) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-text-primary tracking-wide mb-2">
          Set a side on {plural(done, "game", "games")}
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          Your fan record just filled in. Wins and losses now count for those games.
        </p>
        <button
          onClick={() => { router.push("/profile"); router.refresh(); }}
          className="rounded-xl px-6 py-3 text-sm font-display tracking-wider uppercase text-bg"
          style={{ background: "var(--color-accent)" }}
        >
          See your record
        </button>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-xl text-text-primary tracking-wide mb-2">No games to set</h1>
        <p className="text-text-secondary text-sm mb-6">
          Every game you logged already has a side, or has no result to score.
        </p>
        <button
          onClick={() => router.push("/timeline")}
          className="text-sm text-text-muted hover:text-text-secondary transition-colors"
        >
          Back to timeline
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-36">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-[26px] text-text-primary tracking-wide leading-tight">
          Who did you root for?
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {plural(games.length, "game", "games")} logged without a side. Pick your team to fill in your win/loss record. Leave any you watched neutral.
        </p>
      </div>

      {/* One-tap: apply the user's favorite teams across their games. */}
      {favGameCount > 0 && (
        <div className="px-4 mb-3">
          <button
            onClick={applyFavorites}
            className="w-full flex items-center justify-between gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-left active:opacity-80 transition-opacity"
          >
            <span className="text-sm text-accent font-medium">
              Root for your favorite teams in {plural(favGameCount, "game", "games")}
            </span>
            <span className="text-accent text-sm font-semibold whitespace-nowrap">Apply</span>
          </button>
        </div>
      )}

      {/* Bulk by team */}
      {teamTally.length > 0 && (
        <div className="px-4 mb-3">
          <div className="text-xs text-text-muted mb-2">Tap a team you root for to set it across their games.</div>
          <div className="flex flex-wrap gap-2">
            {teamTally.map((t) => {
              const on = rootedTeams.has(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTeam(t.id)}
                  aria-pressed={on}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                    on ? "bg-accent/15 border-accent text-accent" : "bg-bg-input border-border text-text-secondary"
                  }`}
                >
                  {t.name} <span className="opacity-60">{t.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-game */}
      <div className="px-4 space-y-2">
        {games.map((g) => {
          const r = rooting[g.logId];
          const res = resultText(g, r);
          return (
            <div key={g.logId} className="rounded-xl border border-border bg-bg-card overflow-hidden">
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-9 h-9 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">
                  <SportIcon sport={g.sport} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium truncate">
                    {g.away.name} @ {g.home.name}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {formatDate(g.date)}{g.venueName ? ` · ${g.venueName}` : ""}
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3 -mt-1">
                {r ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-secondary">Rooting {r === g.home.id ? g.home.name : g.away.name}</span>
                    {res.label && (
                      <span className={res.tone === "win" ? "text-win font-medium" : res.tone === "loss" ? "text-loss font-medium" : "text-text-muted"}>
                        {"·"} {res.label}
                      </span>
                    )}
                    <button onClick={() => setOne(g.logId, null)} className="ml-auto text-text-muted hover:text-text-secondary">
                      clear
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button onClick={() => setOne(g.logId, g.away.id)} className="px-2.5 py-1 rounded-full text-xs bg-bg-input border border-border text-text-secondary hover:border-accent">
                      {g.away.name}
                    </button>
                    <button onClick={() => setOne(g.logId, g.home.id)} className="px-2.5 py-1 rounded-full text-xs bg-bg-input border border-border text-text-secondary hover:border-accent">
                      {g.home.name}
                    </button>
                    <span className="text-xs text-text-muted">{"·"} or leave neutral</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Commit bar */}
      <div
        className="fixed bottom-0 inset-x-0 border-t border-border bg-bg/95 backdrop-blur px-4 pt-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <div className="max-w-lg mx-auto space-y-2">
          <Button onClick={commit} disabled={saving || decidedCount === 0} size="lg" fullWidth>
            {saving ? "Saving…" : `Set a side on ${plural(decidedCount, "game", "games")}`}
          </Button>
          <button
            onClick={() => router.push("/timeline")}
            disabled={saving}
            className="w-full py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Leave the rest neutral
          </button>
        </div>
      </div>
    </div>
  );
}
