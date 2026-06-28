"use client";

import type { ScanProgress } from "@/lib/native/photoScan";

/** Simple centered spinner with a message. Shared by the photo flow + onboarding. */
export function Spinner({ message }: { message: string }) {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 flex flex-col items-center text-center">
      <div className="w-8 h-8 border-2 border-text-muted/30 border-t-accent rounded-full animate-spin mb-4" />
      <p className="text-text-secondary text-sm">{message}</p>
    </div>
  );
}

/** Progress UI for an on-device photo scan (reading -> scanning -> matching). */
export function ScanProgressView({ progress }: { progress: ScanProgress | null }) {
  let label = "Reading your library…";
  let pct: number | null = null;
  if (progress?.phase === "scanning") {
    label = `Scanning ${progress.total.toLocaleString()} photos for game locations…`;
    pct = progress.total ? Math.min(99, Math.round((progress.processed / progress.total) * 100)) : 0;
  } else if (progress?.phase === "matching") {
    label = "Matching venues…";
    pct = 100;
  }
  return (
    <div className="max-w-lg mx-auto px-4 py-24 flex flex-col items-center text-center">
      {pct === null ? (
        <div className="w-8 h-8 border-2 border-text-muted/30 border-t-accent rounded-full animate-spin mb-4" />
      ) : (
        <div className="w-full max-w-xs mb-4">
          <div className="h-2 rounded-full bg-bg-input overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-200"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--color-accent), var(--color-accent-brown))" }}
            />
          </div>
          <div className="text-xs text-text-muted mt-1.5">{pct}%</div>
        </div>
      )}
      <p className="text-text-secondary text-sm">{label}</p>
      {pct === null && (
        <p className="text-text-muted text-xs mt-2">This can take a few seconds on a big camera roll.</p>
      )}
    </div>
  );
}
