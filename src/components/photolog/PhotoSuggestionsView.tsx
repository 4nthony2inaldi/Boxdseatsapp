"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SportIcon from "@/components/SportIcon";
import Button from "@/components/Button";
import { toastError } from "@/components/Toaster";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp, loadPhotoFile } from "@/lib/native/photoScan";
import { uploadEventPhoto, updateEventLogPhoto } from "@/lib/photos";
import { formatDate, plural } from "@/lib/formatters";
import type { PhotoSuggestion, MatchSuggestion, SuggestionTeam, VenueSuggestion } from "@/lib/queries/photoSuggestions";
import type { FavoriteSuggestion } from "@/components/profile/BigFourDrillThrough";

type Props = {
  suggestions: PhotoSuggestion[];
  unknownTeams: SuggestionTeam[];
  /** Matched venues with no game to log — the "Also been to these?" confirms. */
  venueSuggestions?: VenueSuggestion[];
  /** venueId|date -> representative photo identifier, for auto-attach. */
  photoByKey?: Record<string, string>;
  /**
   * Onboarding mode: when set, the success screen shows a "Continue" button that
   * calls this instead of routing to the timeline, so the scan stays inside the
   * flow. Passes the games logged plus the teams the user rooted for (to seed
   * the favorite-team step).
   */
  onComplete?: (result: { created: number; venues: number; teams: FavoriteSuggestion[] }) => void;
  /** Onboarding mode: called by "Skip for now" instead of routing to /profile. */
  onSkip?: () => void;
};

type RowState = { included: boolean; rootingTeamId: string | null };

// How matched photos are handled when logging. Default is "skip" — we never
// upload a photo unless the user opts in, since not every photo is one they
// want public.
type PhotoMode = "skip" | "all" | "review";

/** Lazily loads + previews a matched photo (full-res, scaled down by the img)
 *  so the user can review it before it's attached. Best-effort: shows nothing
 *  on failure. */
function PhotoPreview({ photoId }: { photoId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;
    loadPhotoFile(photoId)
      .then((file) => {
        if (!file || revoked) return;
        objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoId]);

  if (!url) {
    return <div className="w-14 h-14 rounded-lg bg-bg-elevated animate-pulse flex-shrink-0" />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Matched photo" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />;
}

/** "Won 4–1" / "Lost 1–4" / "Tied" / "Logged" (no score or neutral). */
function resultText(s: MatchSuggestion, rooting: string | null): { label: string; tone: "win" | "loss" | "muted" } {
  if (!rooting || s.home.score == null || s.away.score == null) return { label: "", tone: "muted" };
  const mine = rooting === s.home.id ? s.home.score : s.away.score;
  const opp = rooting === s.home.id ? s.away.score : s.home.score;
  if (mine > opp) return { label: `Won ${mine}–${opp}`, tone: "win" };
  if (mine < opp) return { label: `Lost ${mine}–${opp}`, tone: "loss" };
  return { label: `Tied ${mine}–${opp}`, tone: "muted" };
}

export default function PhotoSuggestionsView({ suggestions, unknownTeams, venueSuggestions = [], photoByKey = {}, onComplete, onSkip }: Props) {
  const router = useRouter();
  // "Also been to these?" — geofence-only venues, default all on.
  const [venueOn, setVenueOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(venueSuggestions.map((v) => [v.id, true]))
  );
  const confirmedVenueIds = venueSuggestions.filter((v) => venueOn[v.id]).map((v) => v.id);
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(
      suggestions.map((s) => [
        s.eventId,
        { included: true, rootingTeamId: s.kind === "match" ? s.suggestedRootingTeamId : null },
      ])
    )
  );
  const [rootedTeams, setRootedTeams] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState<{ created: number; venues: number } | null>(null);
  const [photoMode, setPhotoMode] = useState<PhotoMode>("skip");
  // In "review" mode, which games' photos to keep (default keep all that have one).
  const [keepPhoto, setKeepPhoto] = useState<Record<string, boolean>>({});

  // A matched photo only exists on native, and only for some games.
  const photoIdFor = (s: PhotoSuggestion): string | undefined =>
    isNativeApp() ? photoByKey[`${s.venueId}|${s.date}`] : undefined;
  const anyPhotos = useMemo(
    () => isNativeApp() && suggestions.some((s) => photoByKey[`${s.venueId}|${s.date}`]),
    [suggestions, photoByKey]
  );
  const photoKept = (eventId: string) => keepPhoto[eventId] !== false;

  const teamName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of suggestions) {
      if (s.kind !== "match") continue;
      m.set(s.home.id, s.home.name);
      m.set(s.away.id, s.away.name);
    }
    return m;
  }, [suggestions]);

  const includedCount = Object.values(rows).filter((r) => r.included).length;
  const inferredCount = suggestions.filter((s) => s.kind === "match" && s.suggestedRootingTeamId).length;

  const gamesLabel = plural(includedCount, "game", "games");
  const venuesLabel = plural(confirmedVenueIds.length, "venue", "venues");
  const commitLabel =
    includedCount > 0 && confirmedVenueIds.length > 0
      ? `Add ${gamesLabel} + ${venuesLabel}`
      : includedCount > 0
        ? `Log ${gamesLabel}`
        : `Add ${venuesLabel}`;

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
          if (s.kind !== "match") continue;
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

  // Best-effort: attach the matched photo to each new log. Native only, and
  // only when the user opted in (mode "all", or "review" for the games they
  // kept). A failure here never blocks the log itself.
  async function attachPhotos(picked: PhotoSuggestion[], logs: { eventId: string; logId: string }[]) {
    if (!isNativeApp() || photoMode === "skip" || logs.length === 0) return;
    const logByEvent = new Map(logs.map((l) => [l.eventId, l.logId]));
    const jobs = picked
      .filter((s) => photoMode === "all" || photoKept(s.eventId))
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
        body: JSON.stringify({ picks, visitedVenueIds: confirmedVenueIds }),
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

  // The teams the user rooted for across included games — fuel for the
  // favorite-team step. Deduped by team, most-rooted first.
  function rootedTeamSuggestions(): FavoriteSuggestion[] {
    const byId = new Map<string, { label: string; leagueSlug: string; count: number }>();
    for (const s of suggestions) {
      if (s.kind !== "match") continue;
      const st = rows[s.eventId];
      if (!st?.included || !st.rootingTeamId || !s.leagueSlug) continue;
      const id = st.rootingTeamId;
      const label = teamName.get(id);
      if (!label) continue;
      const cur = byId.get(id);
      if (cur) cur.count++;
      else byId.set(id, { label, leagueSlug: s.leagueSlug, count: 1 });
    }
    return [...byId.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8)
      .map(([id, v]) => ({ id, label: v.label, leagueSlug: v.leagueSlug }));
  }

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
        </svg>
        <h1 className="font-display text-2xl text-text-primary tracking-wide mb-2">
          {done.created > 0
            ? `Logged ${plural(done.created, "game", "games")}`
            : `Added ${plural(done.venues, "venue", "venues")}`}
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          {done.created > 0
            ? `Your passport just grew. ${plural(done.created, "game", "games")} across ${plural(done.venues, "venue", "venues")}.`
            : "Marked on your map. Log games anytime to fill them in."}
        </p>
        <button
          onClick={() =>
            onComplete
              ? onComplete({ created: done.created, venues: done.venues, teams: rootedTeamSuggestions() })
              : router.push("/timeline")
          }
          className="rounded-xl px-6 py-3 text-sm font-display tracking-wider uppercase text-white"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          {onComplete ? "Continue" : "See your timeline"}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-36">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-[26px] text-text-primary tracking-wide leading-tight">
          {suggestions.length > 0
            ? `We found ${plural(suggestions.length, "game", "games")} in your photos`
            : "We found places you've been"}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {suggestions.length > 0
            ? "Pick the ones you went to. Rooting and the final score are filled in where we could — tap to fix anything."
            : "We couldn't pin these to a game, but we can still add them to your venues."}
        </p>
      </div>

      {/* Bulk rooting rollup */}
      {unknownTeams.length > 0 && (
        <div className="px-4 mb-3">
          <button
            onClick={() => setBulkOpen((v) => !v)}
            aria-expanded={bulkOpen}
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

      {/* Photo handling — only when we actually matched on-device photos */}
      {anyPhotos && (
        <div className="px-4 mb-3">
          <div className="text-xs text-text-muted mb-1.5">Your matched photos</div>
          <div role="radiogroup" aria-label="What to do with matched photos" className="flex rounded-xl border border-border bg-bg-card p-1 gap-1">
            {([
              { key: "skip", label: "Don't add" },
              { key: "review", label: "Review" },
              { key: "all", label: "Add all" },
            ] as const).map((opt) => (
              <button
                key={opt.key}
                role="radio"
                aria-checked={photoMode === opt.key}
                onClick={() => setPhotoMode(opt.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  photoMode === opt.key ? "bg-accent/15 text-accent" : "text-text-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-text-muted mt-1.5">
            {photoMode === "skip"
              ? "Logs are saved without any photos."
              : photoMode === "all"
                ? "The matched photo is added to each game you log."
                : "Check the photos you want to keep — the rest aren't uploaded."}
          </p>
        </div>
      )}

      {/* Suggestion cards */}
      <div className="px-4 space-y-2">
        {suggestions.map((s) => {
          const st = rows[s.eventId];
          const rooting = st.rootingTeamId;
          const res = s.kind === "match" ? resultText(s, rooting) : null;
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
                    {s.kind === "match" ? `${s.away.name} @ ${s.home.name}` : s.title}
                  </div>
                  <div className="text-xs text-text-muted truncate">
                    {formatDate(s.date)} · {s.venueName}
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

              {/* Rooting row — team games only; field-sport days have no team. */}
              {s.kind === "match" ? (
                <div className="px-3 pb-3 -mt-1">
                  {rooting ? (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-text-secondary">Rooting {teamName.get(rooting)}</span>
                      {res?.label && (
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
              ) : (
                <div className="px-3 pb-3 -mt-1">
                  <span className="text-xs text-text-muted">Marks the day you were there — no team to root for.</span>
                </div>
              )}

              {/* Photo review — pick which matched photos to attach */}
              {photoMode === "review" && st.included && photoIdFor(s) && (
                <button
                  onClick={() =>
                    setKeepPhoto((prev) => ({ ...prev, [s.eventId]: !photoKept(s.eventId) }))
                  }
                  className="w-full flex items-center gap-3 px-3 pb-3 -mt-1 text-left"
                >
                  <PhotoPreview photoId={photoIdFor(s)!} />
                  <span className="flex-1 text-xs text-text-secondary">
                    {photoKept(s.eventId) ? "This photo will be added" : "Photo skipped"}
                  </span>
                  <span
                    className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 ${
                      photoKept(s.eventId) ? "bg-accent border-accent" : "border-border"
                    }`}
                  >
                    {photoKept(s.eventId) && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Also been to these? — geofence-only venues with no game to log. */}
      {venueSuggestions.length > 0 && (
        <div className="px-4 mt-5">
          <h2 className="font-display text-lg text-text-primary tracking-wide">Also been to these?</h2>
          <p className="text-xs text-text-muted mt-0.5 mb-2.5">
            Your photos put you here, but we couldn&apos;t find a game to log. We&apos;ll still add them to your venues.
          </p>
          <div className="space-y-2">
            {venueSuggestions.map((v) => {
              const on = venueOn[v.id];
              return (
                <button
                  key={v.id}
                  onClick={() => setVenueOn((prev) => ({ ...prev, [v.id]: !prev[v.id] }))}
                  aria-pressed={on}
                  aria-label={`Mark ${v.name} as visited`}
                  className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                    on ? "border-border bg-bg-card" : "border-border/50 bg-bg-card/40 opacity-60"
                  }`}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-text-primary font-medium truncate">{v.name}</span>
                    {(v.city || v.state) && (
                      <span className="block text-xs text-text-muted truncate">
                        {[v.city, v.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${
                      on ? "bg-accent border-accent" : "border-border"
                    }`}
                  >
                    {on && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="px-4 mt-4 text-center text-xs text-text-muted">
        Missing some games? Make sure BoxdSeats can access all your photos in Settings → Photos.
      </p>

      {/* Commit bar */}
      <div
        className="fixed bottom-0 inset-x-0 border-t border-border bg-bg/95 backdrop-blur px-4 pt-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <div className="max-w-lg mx-auto space-y-2">
          <Button onClick={commit} disabled={saving || (includedCount === 0 && confirmedVenueIds.length === 0)} size="lg" fullWidth>
            {saving ? (status || "Saving…") : commitLabel}
          </Button>
          <button
            onClick={() => (onSkip ? onSkip() : router.push("/profile"))}
            disabled={saving}
            className="w-full py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
