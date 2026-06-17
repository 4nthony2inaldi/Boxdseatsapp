"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SportIcon from "@/components/SportIcon";
import { toastError } from "@/components/Toaster";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp, loadPhotoFile } from "@/lib/native/photoScan";
import { uploadEventPhoto, updateEventLogPhoto } from "@/lib/photos";
import type { PhotoSuggestion, SuggestionTeam } from "@/lib/queries/photoSuggestions";

type Props = {
  suggestions: PhotoSuggestion[];
  unknownTeams: SuggestionTeam[];
  /** venueId|date -> representative photo identifier, for auto-attach. */
  photoByKey?: Record<string, string>;
};

type RowState = { included: boolean; rootingTeamId: string | null };

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** "Won 4–1" / "Lost 1–4" / "Tied" / "Logged" (no score or neutral). */
function resultText(s: PhotoSuggestion, rooting: string | null): { label: string; tone: "win" | "loss" | "muted" } {
  if (!rooting || s.home.score == null || s.away.score == null) return { label: "", tone: "muted" };
  const mine = rooting === s.home.id ? s.home.score : s.away.score;
  const opp = rooting === s.home.id ? s.away.score : s.home.score;
  if (mine > opp) return { label: `Won ${mine}–${opp}`, tone: "win" };
  if (mine < opp) return { label: `Lost ${mine}–${opp}`, tone: "loss" };
  return { label: `Tied ${mine}–${opp}`, tone: "muted" };
}

export default function PhotoSuggestionsView({ suggestions, unknownTeams, photoByKey = {} }: Props) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      suggestions.map((s) => [s.eventId, { included: true, rootingTeamId: s.suggestedRootingTeamId }])
    )
  );
  const [rootedTeams, setRootedTeams] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState<{ created: number; venues: number } | null>(null);

  const teamName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of suggestions) {
      m.set(s.home.id, s.home.name);
      m.set(s.away.id, s.away.name);
    }
    return m;
  }, [suggestions]);

  const includedCount = Object.values(rows).filter((r) => r.included).length;
  const inferredCount = suggestions.filter((s) => s.suggestedRootingTeamId).length;

  const setRooting = (eventId: string, teamId: string | null) =>
    setRows((prev) => ({ ...prev, [eventId]: { ...prev[eventId], rootingTeamId: teamId } }));

  const toggleIncluded = (eventId: string) =>
    setRows((prev) => ({ ...prev, [eventId]: { ...prev[eventId], included: !prev[eventId].included } }));

  // Bulk: marking a team you root for fills it into every undecided game that
  // team played in (without overriding rows you set yourself).
  const toggleRootedTeam = (teamId: string) => {
    setRootedTeams((prev) => {
      const next = new Set(prev);
      const turningOn = !next.has(teamId);
      if (turningOn) next.add(teamId);
      else next.delete(teamId);
      setRows((prevRows) => {
        const updated = { ...prevRows };
        for (const s of suggestions) {
          const involvesTeam = s.home.id === teamId || s.away.id === teamId;
          if (!involvesTeam) continue;
          if (turningOn && updated[s.eventId].rootingTeamId == null) {
            updated[s.eventId] = { ...updated[s.eventId], rootingTeamId: teamId };
          } else if (!turningOn && updated[s.eventId].rootingTeamId === teamId) {
            updated[s.eventId] = { ...updated[s.eventId], rootingTeamId: null };
          }
        }
        return updated;
      });
      return next;
    });
  };

  // Best-effort: attach the matched photo to each new log. Native only; a
  // failure here never blocks the log itself.
  async function attachPhotos(picked: PhotoSuggestion[], logs: { eventId: string; logId: string }[]) {
    if (!isNativeApp() || logs.length === 0) return;
    const logByEvent = new Map(logs.map((l) => [l.eventId, l.logId]));
    const jobs = picked
      .map((s) => ({ s, logId: logByEvent.get(s.eventId), photoId: photoByKey[`${s.venueId}|${s.date}`] }))
      .filter((j): j is { s: PhotoSuggestion; logId: string; photoId: string } => !!j.logId && !!j.photoId);
    if (jobs.length === 0) return;
    setStatus("Adding your photos…");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    for (const { s, logId, photoId } of jobs) {
      try {
        const file = await loadPhotoFile(photoId);
        if (!file) continue;
        const up = await uploadEventPhoto(supabase, user.id, logId, file);
        if ("url" in up) {
          await updateEventLogPhoto(supabase, logId, user.id, up.url, "upload", `${s.date}T12:00:00Z`, false);
        }
      } catch {
        /* skip this one — attachment is best-effort */
      }
    }
  }

  const commit = async () => {
    setSaving(true);
    setStatus("Logging…");
    const picked = suggestions.filter((s) => rows[s.eventId].included);
    const picks = picked.map((s) => ({ eventId: s.eventId, rootingTeamId: rows[s.eventId].rootingTeamId }));
    try {
      const res = await fetch("/api/photo-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      await attachPhotos(picked, result.logs ?? []);
      setDone({ created: result.created, venues: result.venues });
    } catch {
      toastError("Couldn't save those logs — try again.");
    } finally {
      setSaving(false);
      setStatus("");
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
        </svg>
        <h1 className="font-display text-2xl text-text-primary tracking-wide mb-2">
          Logged {done.created} {done.created === 1 ? "game" : "games"}
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          Your passport just grew — {done.created} {done.created === 1 ? "game" : "games"} across {done.venues}{" "}
          {done.venues === 1 ? "venue" : "venues"}.
        </p>
        <button
          onClick={() => router.push("/timeline")}
          className="rounded-xl px-6 py-3 text-sm font-display tracking-wider uppercase text-white"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          See your timeline
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-[26px] text-text-primary tracking-wide leading-tight">
          We found {suggestions.length} {suggestions.length === 1 ? "game" : "games"} in your photos
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Pick the ones you went to. Rooting and the final score are filled in where we could — tap to fix anything.
        </p>
      </div>

      {/* Bulk rooting rollup */}
      {unknownTeams.length > 0 && (
        <div className="px-4 mb-3">
          <button
            onClick={() => setBulkOpen((v) => !v)}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-bg-card px-4 py-3 text-left"
          >
            <span className="text-sm text-text-secondary">
              Rooting set for {inferredCount} · {unknownTeams.length}{" "}
              {unknownTeams.length === 1 ? "team" : "teams"} we&apos;re unsure about
            </span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: bulkOpen ? "rotate(180deg)" : "none" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {bulkOpen && (
            <div className="mt-2 rounded-xl border border-border bg-bg-card p-3">
              <div className="text-xs text-text-muted mb-2">Tap the teams you root for — we&apos;ll set it across their games.</div>
              <div className="flex flex-wrap gap-2">
                {unknownTeams.map((t) => {
                  const on = rootedTeams.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleRootedTeam(t.id)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        on ? "bg-accent/15 border-accent text-accent" : "bg-bg-input border-border text-text-secondary"
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Suggestion cards */}
      <div className="px-4 space-y-2">
        {suggestions.map((s) => {
          const st = rows[s.eventId];
          const rooting = st.rootingTeamId;
          const res = resultText(s, rooting);
          return (
            <div
              key={s.eventId}
              className={`rounded-xl border overflow-hidden transition-colors ${
                st.included ? "border-border bg-bg-card" : "border-border/50 bg-bg-card/40 opacity-60"
              }`}
            >
              <div className="flex items-center gap-3 px-3 py-3">
                <div className="w-10 h-10 rounded-lg bg-bg-elevated flex items-center justify-center flex-shrink-0">
                  <SportIcon sport={s.sport} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-text-primary font-medium truncate">
                    {s.away.name} @ {s.home.name}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {fmtDate(s.date)} · {s.venueName}
                  </div>
                </div>
                <button
                  onClick={() => toggleIncluded(s.eventId)}
                  aria-label={st.included ? "Exclude" : "Include"}
                  className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                    st.included ? "bg-accent border-accent" : "border-border"
                  }`}
                >
                  {st.included && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Rooting row */}
              <div className="px-3 pb-3 -mt-1">
                {rooting ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-text-secondary">Rooting {teamName.get(rooting)}</span>
                    {res.label && (
                      <span className={res.tone === "win" ? "text-win font-medium" : res.tone === "loss" ? "text-loss font-medium" : "text-text-muted"}>
                        · {res.label}
                      </span>
                    )}
                    <button onClick={() => setRooting(s.eventId, null)} className="ml-auto text-text-muted hover:text-text-secondary">
                      change
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs text-text-muted mr-1">Who&apos;d you root for?</span>
                    <button onClick={() => setRooting(s.eventId, s.away.id)} className="px-2.5 py-1 rounded-full text-xs bg-bg-input border border-border text-text-secondary hover:border-accent">
                      {s.away.name}
                    </button>
                    <button onClick={() => setRooting(s.eventId, s.home.id)} className="px-2.5 py-1 rounded-full text-xs bg-bg-input border border-border text-text-secondary hover:border-accent">
                      {s.home.name}
                    </button>
                    <span className="text-xs text-text-muted">· or leave neutral</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="px-4 mt-4 text-center text-xs text-text-muted">
        Missing some games? Make sure BoxdSeats can access all your photos in Settings → Photos.
      </p>

      {/* Commit bar */}
      <div
        className="fixed bottom-0 inset-x-0 border-t border-border bg-bg/95 backdrop-blur px-4 pt-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <div className="max-w-lg mx-auto">
          <button
            onClick={commit}
            disabled={saving || includedCount === 0}
            className="w-full py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-40 transition-opacity"
            style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
          >
            {saving ? (status || "Logging…") : `Log ${includedCount} ${includedCount === 1 ? "game" : "games"}`}
          </button>
        </div>
      </div>
    </div>
  );
}
