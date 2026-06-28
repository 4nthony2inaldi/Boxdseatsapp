"use client";

import { useState } from "react";
import Button from "@/components/Button";
import OnboardingActionBar from "./OnboardingActionBar";
import PhotoSuggestionsView from "@/components/photolog/PhotoSuggestionsView";
import { Spinner, ScanProgressView } from "@/components/photolog/ScanStatus";
import { scanPhotosForVenues, type ScanItem, type ScanProgress } from "@/lib/native/photoScan";
import type { PhotoSuggestionsResult } from "@/lib/queries/photoSuggestions";

type Props = {
  /** Called once the user has logged at least one game from the scan. */
  onScanned: (created: number) => void;
  /** Called when the user skips, the scan finds nothing, or it errors. */
  onSkip: () => void;
  onBack: () => void;
};

type State = "intro" | "scanning" | "loading" | "ready" | "empty" | "error";

function TicketIcon() {
  return (
    <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
  const [readError, setReadError] = useState(false);

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
    setReadError(false);
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
    } catch {
      setReadError(true);
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
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-text-secondary text-sm">
          {state === "error"
            ? readError
              ? "Couldn't read your photos. Open Settings, then BoxdSeats, then Photos and choose “All Photos,” then try again."
              : "Something went wrong reading your photos."
            : "We didn't find any games in your photos yet."}
        </p>
        {state === "empty" && (
          <p className="text-text-muted text-xs mt-3 leading-5">
            If you only allowed access to some photos, allow all photos in Settings, then Photos, to find more.
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            onClick={() => { setReadError(false); setState("intro"); }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
            style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
          >
            Try again
          </button>
          <button
            onClick={onSkip}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Continue setting up
          </button>
        </div>
      </div>
    );
  }

  // intro
  return (
    <div>
      <div className="mb-4">
        <TicketIcon />
      </div>
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
        <button
          onClick={onSkip}
          className="w-full mt-2 py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Skip for now
        </button>
      </OnboardingActionBar>

      <button
        onClick={onBack}
        className="mt-3 text-xs text-text-muted hover:text-text-secondary"
      >
        ← Back
      </button>
    </div>
  );
}
