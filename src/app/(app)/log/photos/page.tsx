"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhotoScanIntro from "@/components/photolog/PhotoScanIntro";
import PhotoSuggestionsView from "@/components/photolog/PhotoSuggestionsView";
import { Spinner, ScanProgressView } from "@/components/photolog/ScanStatus";
import { scanPhotosForVenues, isNativeApp, type ScanItem, type ScanProgress } from "@/lib/native/photoScan";
import type { PhotoSuggestionsResult } from "@/lib/queries/photoSuggestions";

type State = "intro" | "scanning" | "loading" | "ready" | "empty" | "error";

/**
 * Photo discovery flow: privacy-first intro → on-device scan → review the games
 * we found → bulk-log.
 */
export default function PhotoLogPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("intro");
  const [webFallback, setWebFallback] = useState(false);
  // The scan needs the on-device library, so it's iPhone-app only. Detect web up
  // front and show the "get the app" state instead of an iOS flow that can't run.
  const [appRequired, setAppRequired] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isNativeApp()) setAppRequired(true);
  }, []);
  const [data, setData] = useState<PhotoSuggestionsResult | null>(null);
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [readError, setReadError] = useState(false);
  // venueId|date -> representative photo identifier, for auto-attach on commit.
  const [photoByKey, setPhotoByKey] = useState<Record<string, string>>({});

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
      setState(json.suggestions.length > 0 ? "ready" : "empty");
    } catch {
      setState("error");
    }
  }

  async function handleScan(monthsBack?: number) {
    setProgress({ phase: "reading" });
    setReadError(false);
    setState("scanning");
    try {
      const items = await scanPhotosForVenues({ monthsBack, onProgress: setProgress });
      if (items === null) {
        // No native photo access (web) — back to the intro with a gentle note.
        setWebFallback(true);
        setState("intro");
        return;
      }
      await resolve(items);
    } catch {
      // Stalled or denied photo read — never leave the spinner running.
      setReadError(true);
      setState("error");
    }
  }

  if (state === "ready" && data) {
    return <PhotoSuggestionsView suggestions={data.suggestions} unknownTeams={data.unknownTeams} photoByKey={photoByKey} />;
  }

  if (state === "intro") {
    return <PhotoScanIntro onScan={handleScan} onCancel={() => router.back()} webFallback={webFallback} appRequired={appRequired} />;
  }

  if (state === "scanning") return <ScanProgressView progress={progress} />;
  if (state === "loading") return <Spinner message="Finding your games…" />;

  // empty / error
  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-text-secondary text-sm">
        {state === "error"
          ? readError
            ? 'Couldn’t read your photos. Open Settings → BoxdSeats → Photos and choose “All Photos,” then try again — or pick a shorter time range.'
            : "Something went wrong. Please try again."
          : "No new games found in your photos."}
      </p>
      {state === "empty" && (
        <p className="text-text-muted text-xs mt-3 leading-5">
          If you only allowed access to some photos, allow access to all photos in Settings → Photos to find more.
        </p>
      )}
      <div className="mt-5 flex flex-col items-center gap-3">
        {/* When the scan finds nothing, don't dead-end — route to the normal
            log flow so the user still reaches their first logged game. */}
        {state === "empty" && (
          <button
            onClick={() => router.push("/log")}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
            style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
          >
            Log a game manually
          </button>
        )}
        <button
          onClick={() => {
            setReadError(false);
            setState("intro");
          }}
          className={
            state === "empty"
              ? "text-sm text-text-muted hover:text-text-secondary transition-colors"
              : "px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
          }
          style={
            state === "empty"
              ? undefined
              : { background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }
          }
        >
          Try again
        </button>
        {state === "error" && (
          <button
            onClick={() => router.push("/log")}
            className="text-sm text-text-muted hover:text-text-secondary transition-colors"
          >
            Log a game manually
          </button>
        )}
      </div>
    </div>
  );
}
