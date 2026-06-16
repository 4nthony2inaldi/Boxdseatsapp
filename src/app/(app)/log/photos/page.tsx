"use client";

import { useEffect, useState } from "react";
import PhotoSuggestionsView from "@/components/photolog/PhotoSuggestionsView";
import type { PhotoSuggestionsResult } from "@/lib/queries/photoSuggestions";

type ScanItem = { venueId: string; date: string };

/**
 * Review screen for games discovered in the user's photos. The native photo
 * scan geofences photos on-device and hands off (venue, date) pairs — for now
 * via a sessionStorage bucket ("photoScanItems") it writes before navigating
 * here. We resolve those to candidate games server-side and let the user
 * bulk-log them.
 */
export default function PhotoLogPage() {
  const [state, setState] = useState<"loading" | "empty" | "ready" | "error">("loading");
  const [data, setData] = useState<PhotoSuggestionsResult | null>(null);

  useEffect(() => {
    (async () => {
      let items: ScanItem[] = [];
      try {
        items = JSON.parse(sessionStorage.getItem("photoScanItems") || "[]");
      } catch {
        items = [];
      }
      if (!Array.isArray(items) || items.length === 0) {
        setState("empty");
        return;
      }
      try {
        const res = await fetch("/api/photo-suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) {
          setState("error");
          return;
        }
        const json: PhotoSuggestionsResult = await res.json();
        setData(json);
        setState(json.suggestions.length > 0 ? "ready" : "empty");
      } catch {
        setState("error");
      }
    })();
  }, []);

  if (state === "ready" && data) {
    return <PhotoSuggestionsView suggestions={data.suggestions} unknownTeams={data.unknownTeams} />;
  }

  const message =
    state === "loading"
      ? "Looking through your photos…"
      : state === "error"
        ? "Something went wrong. Please try again."
        : "No new games found in your photos. Photo scanning runs in the BoxdSeats app.";

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}
