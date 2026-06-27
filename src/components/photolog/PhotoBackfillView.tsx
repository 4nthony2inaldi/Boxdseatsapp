"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadPhotoFile } from "@/lib/native/photoScan";
import { uploadEventPhoto, updateEventLogPhoto } from "@/lib/photos";
import Button from "@/components/Button";
import SportIcon from "@/components/SportIcon";
import { toastError } from "@/components/Toaster";
import type { BackfillSuggestion } from "@/lib/queries/photoBackfill";

type Props = {
  suggestions: BackfillSuggestion[];
  /** `${venueId}|${date}` -> photo identifier to attach. */
  photoByKey: Record<string, string>;
};

function fmtDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PhotoBackfillView({ suggestions, photoByKey }: Props) {
  const router = useRouter();
  const [included, setIncluded] = useState<Record<string, boolean>>(
    Object.fromEntries(suggestions.map((s) => [s.logId, true]))
  );
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState<number | null>(null);

  const includedCount = suggestions.filter((s) => included[s.logId]).length;

  async function commit() {
    const jobs = suggestions
      .filter((s) => included[s.logId])
      .map((s) => ({ s, photoId: photoByKey[`${s.venueId}|${s.date}`] }))
      .filter((j): j is { s: BackfillSuggestion; photoId: string } => !!j.photoId);
    if (!jobs.length) return;

    setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      toastError("Please sign in again.");
      return;
    }

    let added = 0;
    for (let i = 0; i < jobs.length; i++) {
      const { s, photoId } = jobs[i];
      setStatus(`Adding photos… ${i + 1}/${jobs.length}`);
      try {
        const file = await loadPhotoFile(photoId);
        if (!file) continue;
        const up = await uploadEventPhoto(supabase, user.id, s.logId, file);
        if ("url" in up) {
          await updateEventLogPhoto(supabase, s.logId, user.id, up.url, "upload", `${s.date}T12:00:00Z`, false);
          added++;
        }
      } catch {
        // best-effort per photo
      }
    }
    setSaving(false);
    setStatus("");
    if (added === 0) {
      toastError("Couldn't add those photos — try again.");
      return;
    }
    setDone(added);
  }

  if (done !== null) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl text-text-primary tracking-wide mb-2">
          Added photos to {done} {done === 1 ? "game" : "games"}
        </h1>
        <p className="text-text-secondary text-sm mb-8">
          Your timeline just got a lot more vivid.
        </p>
        <button
          onClick={() => { router.push("/timeline"); router.refresh(); }}
          className="rounded-xl px-6 py-3 text-sm font-display tracking-wider uppercase text-white"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          See your timeline
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-36">
      <div className="px-4 pt-5 pb-3">
        <h1 className="font-display text-[26px] text-text-primary tracking-wide leading-tight">
          Photos for {suggestions.length} of your {suggestions.length === 1 ? "game" : "games"}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          We matched photos to games you logged without one. Pick which to add.
        </p>
      </div>

      <div className="px-2">
        {suggestions.map((s) => {
          const on = included[s.logId];
          return (
            <button
              key={s.logId}
              onClick={() => setIncluded((prev) => ({ ...prev, [s.logId]: !prev[s.logId] }))}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left active:bg-bg-card transition-colors"
            >
              <span className="shrink-0 text-text-muted">
                <SportIcon sport={s.sport} size={22} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-text-primary truncate">{s.title}</span>
                <span className="block text-xs text-text-muted truncate">
                  {s.venueName} · {fmtDate(s.date)}
                </span>
              </span>
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center border ${
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

      <div
        className="fixed bottom-0 inset-x-0 border-t border-border bg-bg/95 backdrop-blur px-4 pt-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.75rem)" }}
      >
        <div className="max-w-lg mx-auto space-y-2">
          <Button onClick={commit} disabled={saving || includedCount === 0} size="lg" fullWidth>
            {saving ? (status || "Adding…") : `Add photos to ${includedCount} ${includedCount === 1 ? "game" : "games"}`}
          </Button>
          <button
            onClick={() => router.push("/profile")}
            disabled={saving}
            className="w-full py-2.5 text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
