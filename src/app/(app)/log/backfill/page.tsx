"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { scanPhotosForVenues, isNativeApp, type ScanProgress } from "@/lib/native/photoScan";
import PhotoBackfillView from "@/components/photolog/PhotoBackfillView";
import Button from "@/components/Button";
import type { BackfillSuggestion } from "@/lib/queries/photoBackfill";

const APP_STORE_URL = "https://apps.apple.com/app/id6781299327";

type State = "intro" | "scanning" | "loading" | "review" | "empty" | "error";

function Centered({
  title,
  body,
  spinner,
  action,
}: {
  title: string;
  body?: string;
  spinner?: boolean;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 flex flex-col items-center text-center">
      {spinner && <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />}
      <h1 className="font-display text-xl text-text-primary tracking-wide mb-1">{title}</h1>
      {body && <p className="text-sm text-text-secondary mb-6 max-w-xs">{body}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-xl px-6 py-2.5 text-sm font-display tracking-wider uppercase text-white"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default function BackfillPage() {
  const router = useRouter();
  const [state, setState] = useState<State>("intro");
  const [native, setNative] = useState(true);
  const [, setProgress] = useState<ScanProgress | null>(null);
  const [suggestions, setSuggestions] = useState<BackfillSuggestion[]>([]);
  const [photoByKey, setPhotoByKey] = useState<Record<string, string>>({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNative(isNativeApp());
  }, []);

  async function handleScan() {
    setProgress({ phase: "reading" });
    setState("scanning");
    try {
      const items = await scanPhotosForVenues({ onProgress: setProgress });
      if (items === null) {
        setNative(false);
        setState("intro");
        return;
      }
      if (!items.length) {
        setState("empty");
        return;
      }
      setPhotoByKey(
        Object.fromEntries(
          items.filter((i) => i.photoId).map((i) => [`${i.venueId}|${i.date}`, i.photoId as string])
        )
      );
      setState("loading");
      const res = await fetch("/api/photo-backfill-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: items.map((i) => ({ venueId: i.venueId, date: i.date })) }),
      });
      if (!res.ok) return setState("error");
      const json = await res.json();
      const sugg: BackfillSuggestion[] = json.suggestions ?? [];
      setSuggestions(sugg);
      setState(sugg.length ? "review" : "empty");
    } catch {
      setState("error");
    }
  }

  if (state === "review") return <PhotoBackfillView suggestions={suggestions} photoByKey={photoByKey} />;
  if (state === "scanning") return <Centered title="Scanning your photos…" spinner />;
  if (state === "loading") return <Centered title="Matching your games…" spinner />;
  if (state === "empty") {
    return (
      <Centered
        title="No new matches"
        body="We didn't find photos that line up with games you logged without one. Check back as you take more photos at games."
        action={{ label: "Back to profile", onClick: () => router.push("/profile") }}
      />
    );
  }
  if (state === "error") {
    return (
      <Centered
        title="Something went wrong"
        body="Couldn't scan right now. Try again in a moment."
        action={{ label: "Try again", onClick: handleScan }}
      />
    );
  }

  // intro
  return (
    <div className="max-w-lg mx-auto px-5 pt-8 pb-10">
      <h1 className="font-display text-[26px] text-text-primary tracking-wide leading-tight">
        Add photos to your logged games
      </h1>
      <p className="text-sm text-text-secondary leading-6 mt-2">
        Logged games without a photo? We can scan your camera roll and match photos to the games you
        already logged, by date and location, all on your phone. Nothing is uploaded until you choose
        to add it.
      </p>
      {native ? (
        <div className="mt-6 space-y-2">
          <Button onClick={handleScan} size="lg" fullWidth>
            Find my photos
          </Button>
          <button
            onClick={() => router.push("/profile")}
            className="w-full py-3 rounded-xl text-sm text-text-secondary hover:bg-bg-card transition-colors"
          >
            Not now
          </button>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-accent/30 bg-accent/[0.06] p-4">
          <p className="text-sm text-text-primary font-medium">Only in the iPhone app</p>
          <p className="text-sm text-text-secondary leading-6 mt-1">
            Photo scanning runs on your device, so it lives in the BoxdSeats iPhone app.
          </p>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex w-full items-center justify-center py-3 rounded-xl bg-accent text-bg font-display tracking-wide active:opacity-70"
          >
            GET THE APP
          </a>
        </div>
      )}
    </div>
  );
}
