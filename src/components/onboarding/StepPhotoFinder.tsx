"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Button from "@/components/Button";
import OnboardingActionBar from "./OnboardingActionBar";
import PhotoSuggestionsView from "@/components/photolog/PhotoSuggestionsView";
import { Spinner, ScanProgressView } from "@/components/photolog/ScanStatus";
import { scanPhotosForVenues, PhotoReadError, type ScanItem, type ScanProgress, type PhotoReadReason } from "@/lib/native/photoScan";
import type { PhotoSuggestionsResult } from "@/lib/queries/photoSuggestions";
import type { FavoriteSuggestion } from "@/components/profile/BigFourDrillThrough";
import { createClient } from "@/lib/supabase/client";
import { fetchSampleVenues, type SampleVenue } from "@/lib/queries/onboarding";

type Props = {
  /** Called once the user has saved games/venues from the scan; carries the
   *  venue count + the teams they rooted for, to seed later steps. */
  onScanned: (result: { created: number; venues: number; teams: FavoriteSuggestion[] }) => void;
  /** Called when the user skips, the scan finds nothing, or it errors. */
  onSkip: () => void;
  onBack: () => void;
};

type State = "intro" | "scanning" | "loading" | "ready" | "empty" | "error";

function TicketIcon() {
  return (
    <svg aria-hidden="true" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
      <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
    </svg>
  );
}

/**
 * Onboarding step 2 (native only): the photo finder, the app's signature draw.
 * Reward-forward intro, then an on-device scan that defaults to the user's whole
 * library (no range picker — the point is to surface their entire history). The
 * scan logs games and marks venues visited, which seeds the rest of onboarding.
 *
 * Reuses the standalone photo flow's machinery (scan + suggestions review) but
 * advances onboarding on completion instead of routing away.
 */
export default function StepPhotoFinder({ onScanned, onSkip, onBack }: Props) {
  const [state, setState] = useState<State>("intro");
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [data, setData] = useState<PhotoSuggestionsResult | null>(null);
  const [photoByKey, setPhotoByKey] = useState<Record<string, string>>({});
  const [readReason, setReadReason] = useState<PhotoReadReason | null>(null);
  const [samples, setSamples] = useState<SampleVenue[]>([]);
  const [samplesLoaded, setSamplesLoaded] = useState(false);

  // A few recognizable stadiums to tease the finder before the scan runs.
  useEffect(() => {
    let cancelled = false;
    fetchSampleVenues(createClient(), 3)
      .then((v) => { if (!cancelled) setSamples(v); })
      .catch(() => { /* montage is decorative — fall back to the icon */ })
      .finally(() => { if (!cancelled) setSamplesLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  async function resolve(items: ScanItem[]) {
    if (!items.length) {
      setState("empty");
      return;
    }
    setPhotoByKey(
      Object.fromEntries(items.filter((i) => i.photoId).map((i) => [`${i.venueId}|${i.date}`, i.photoId as string]))
    );
    setState("loading");
    try {
      const res = await fetch("/api/photo-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) return setState("error");
      const json: PhotoSuggestionsResult = await res.json();
      setData(json);
      setState(json.suggestions.length > 0 || json.venueSuggestions.length > 0 ? "ready" : "empty");
    } catch {
      setState("error");
    }
  }

  async function handleScan() {
    setProgress({ phase: "reading" });
    setReadReason(null);
    setState("scanning");
    try {
      // No range argument: always scan the whole library in onboarding.
      const items = await scanPhotosForVenues({ onProgress: setProgress });
      if (items === null) {
        // No native photo access — shouldn't happen (native-only step), but fall
        // through gracefully to the rest of onboarding rather than dead-end.
        onSkip();
        return;
      }
      await resolve(items);
    } catch (e) {
      setReadReason(e instanceof PhotoReadError ? e.reason : "unknown");
      setState("error");
    }
  }

  if (state === "ready" && data) {
    return (
      <PhotoSuggestionsView
        suggestions={data.suggestions}
        unknownTeams={data.unknownTeams}
        venueSuggestions={data.venueSuggestions}
        photoByKey={photoByKey}
        onComplete={onScanned}
        onSkip={onSkip}
      />
    );
  }

  if (state === "scanning") return <ScanProgressView progress={progress} />;
  if (state === "loading") return <Spinner message="Finding your games…" />;

  if (state === "empty" || state === "error") {
    const errorMessage =
      readReason === "denied"
        ? "BoxdSeats can't see your photos. Open Settings, find BoxdSeats, tap Photos, and choose All Photos. Then try again."
        : readReason === "timeout"
          ? "The scan took too long to read your library. Try again."
          : "Something went wrong. Please try again.";
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-text-secondary text-sm">
          {state === "error" ? errorMessage : "We didn't find any games in your photos yet."}
        </p>
        {state === "empty" && (
          <p className="text-text-muted text-xs mt-3 leading-5">
            If you allowed only some photos, switch to All Photos in Settings, then scan again.
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-3">
          <Button onClick={() => { setReadReason(null); setState("intro"); }}>
            Try again
          </Button>
          <button
            onClick={onSkip}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // intro
  const showMontage = !samplesLoaded || samples.length > 0;
  return (
    <div className="px-4">
      {showMontage ? (
        <div className="grid grid-cols-3 gap-2 mb-5">
          {samples.length > 0
            ? samples.map((v) => (
                <div key={v.id} className="relative aspect-[4/5] rounded-xl overflow-hidden bg-bg-elevated">
                  <Image
                    src={v.photo_url}
                    alt=""
                    fill
                    sizes="(max-width: 512px) 33vw, 160px"
                    className="object-cover"
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.05) 55%)" }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <div className="text-[11px] font-semibold text-white leading-tight truncate">{v.name}</div>
                    {(v.city || v.state) && (
                      <div className="text-[10px] text-white/70 truncate">
                        {[v.city, v.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              ))
            : [0, 1, 2].map((i) => (
                <div key={i} className="aspect-[4/5] rounded-xl bg-bg-elevated animate-pulse" />
              ))}
        </div>
      ) : (
        <div className="mb-4">
          <TicketIcon />
        </div>
      )}
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-2">
        Your photos are your memories
      </h2>
      <p className="text-sm text-text-secondary leading-6 mb-5">
        You&apos;ve been to games that you&apos;ve forgotten, but your camera roll remembers. Let&apos;s match
        your pictures to games and log them for you.
      </p>

      <div className="rounded-2xl border border-border bg-bg-card p-4 flex gap-4">
        <div>
          <div className="font-display text-2xl text-accent leading-none">Seconds</div>
          <div className="text-xs text-text-muted mt-1">to rebuild years of games</div>
        </div>
        <div className="w-px bg-border" />
        <div>
          <div className="font-display text-2xl text-accent leading-none">Auto</div>
          <div className="text-xs text-text-muted mt-1">venues and scores filled in</div>
        </div>
      </div>

      <p className="text-xs text-text-muted leading-5 mt-4">
        We match photos on your phone. Nothing uploads unless you choose to add it to a game.
      </p>

      <OnboardingActionBar>
        <Button onClick={handleScan} size="lg" fullWidth>
          FIND MY GAMES
        </Button>
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={onBack}
            className="py-2.5 text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Back
          </button>
          <button
            onClick={onSkip}
            className="py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Skip for now
          </button>
        </div>
      </OnboardingActionBar>
    </div>
  );
}
