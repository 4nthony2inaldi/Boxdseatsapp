"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoScanIntro from "@/components/photolog/PhotoScanIntro";
import PhotoSuggestionsView from "@/components/photolog/PhotoSuggestionsView";
import { scanPhotosForVenues, type ScanItem } from "@/lib/native/photoScan";
import type { PhotoSuggestionsResult } from "@/lib/queries/photoSuggestions";

type State = "intro" | "scanning" | "loading" | "ready" | "empty" | "error";

/**
 * Photo discovery flow: a privacy-first intro (priming screen) → on-device
 * scan → review the games we found → bulk-log. The native scan hands off
 * (venue, date) pairs; if it already did (sessionStorage), we skip straight to
 * the review.
 */
export default function PhotoLogPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("intro");
  const [webFallback, setWebFallback] = useState(false);
  const [data, setData] = useState<PhotoSuggestionsResult | null>(null);

  async function resolve(items: ScanItem[]) {
    if (!items.length) {
      setState("empty");
      return;
    }
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

  async function handleScan() {
    setState("scanning");
    const items = await scanPhotosForVenues();
    if (items === null) {
      // No native photo access (web) — stay on the intro with a gentle note.
      setWebFallback(true);
      setState("intro");
      return;
    }
    await resolve(items);
  }

  if (state === "ready" && data) {
    return <PhotoSuggestionsView suggestions={data.suggestions} unknownTeams={data.unknownTeams} />;
  }

  if (state === "intro" || state === "scanning") {
    return (
      <PhotoScanIntro
        onScan={handleScan}
        onCancel={() => router.back()}
        webFallback={webFallback}
        scanning={state === "scanning"}
      />
    );
  }

  const message =
    state === "loading"
      ? "Looking through your photos…"
      : state === "error"
        ? "Something went wrong. Please try again."
        : "No new games found in your photos.";

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}
