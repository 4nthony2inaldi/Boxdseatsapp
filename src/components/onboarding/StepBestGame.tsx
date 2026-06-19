"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAndFeatureBestGame } from "@/lib/queries/onboarding";
import { triggerBoxScoreIngest } from "@/lib/ingest/triggerIngest";
import { toastError } from "@/components/Toaster";
import StepVenue from "@/components/log/StepVenue";
import StepDate from "@/components/log/StepDate";
import StepEvent from "@/components/log/StepEvent";
import OnboardingActionBar from "./OnboardingActionBar";
import type { VenueResult, EventMatch } from "@/lib/queries/log";

type Props = {
  userId: string;
  best: { filled: boolean; name: string | null };
  onBestChange: (b: { filled: boolean; name: string | null }) => void;
  finishing: boolean;
  onBack: () => void;
  onFinish: () => void;
  /** Label for the primary button (e.g. "NEXT" when another step follows). */
  finishLabel?: string;
};

function eventLabel(e: EventMatch): string {
  if (e.home_team_short && e.away_team_short) return `${e.away_team_short} @ ${e.home_team_short}`;
  return e.tournament_name || "Event";
}

export default function StepBestGame({ userId, best, onBestChange, finishing, onBack, onFinish, finishLabel = "SEE MY PROFILE" }: Props) {
  // Mirror the real log flow: venue → date → event.
  const [sub, setSub] = useState<"venue" | "date" | "event">("venue");
  const [venue, setVenue] = useState<VenueResult | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [addingMore, setAddingMore] = useState(false);
  const [logged, setLogged] = useState<string[]>([]);
  const supabase = createClient();

  const inFlow = !best.filled || addingMore;

  async function pickEvents(events: EventMatch[]) {
    if (events.length === 0) return;
    // The first game logged overall becomes the headliner (featured).
    let isFirst = !best.filled;
    let loggedAny = false;
    let firstLabel: string | null = null;
    for (const event of events) {
      const result = await logAndFeatureBestGame(supabase, userId, event.id, isFirst);
      if ("error" in result) {
        toastError(result.error);
        continue;
      }
      triggerBoxScoreIngest(event.id);
      const label = eventLabel(event);
      setLogged((prev) => (prev.includes(label) ? prev : [...prev, label]));
      if (isFirst && firstLabel === null) firstLabel = label;
      loggedAny = true;
      isFirst = false;
    }
    if (firstLabel !== null) onBestChange({ filled: true, name: firstLabel });
    if (loggedAny) {
      // Reset the sub-flow back to the summary
      setVenue(null); setDate(null); setSub("venue"); setAddingMore(false);
    }
  }

  function handleEventSelect(event: EventMatch | null) {
    if (!event) {
      toastError("Pick the specific game from the list to set it as your best.");
      return;
    }
    pickEvents([event]);
  }

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        What&apos;s the best game you&apos;ve been to?
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        {best.filled && !addingMore
          ? "That's your headliner. Add any others you want on your timeline, or head to your profile."
          : "Find it the way you'd log any game — pick the venue, the date, then the matchup."}
      </p>

      {inFlow && (
        <div className="mb-4">
          {sub === "venue" && (
            <StepVenue userId={userId} onSelect={(v) => { setVenue(v); setSub("date"); }} />
          )}
          {sub === "date" && venue && (
            <StepDate
              venueId={venue.id}
              venueName={venue.name}
              onSelect={(d) => { setDate(d); setSub("event"); }}
              onBack={() => setSub("venue")}
            />
          )}
          {sub === "event" && venue && date && (
            <StepEvent
              userId={userId}
              venueId={venue.id}
              venueName={venue.name}
              date={date}
              onSelect={handleEventSelect}
              onSelectMultiDay={(events) => pickEvents(events)}
              onBack={() => setSub("date")}
            />
          )}
        </div>
      )}

      {logged.length > 0 && (
        <div className="mb-4">
          <div className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase mb-2">
            On your timeline
          </div>
          <div className="space-y-1.5">
            {logged.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-win)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {l}{i === 0 && <span className="text-accent text-xs">· headliner</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {best.filled && !addingMore && (
        <button
          onClick={() => { setAddingMore(true); setSub("venue"); }}
          className="w-full mb-4 py-3 rounded-xl bg-bg-input border border-border text-sm text-accent hover:border-accent/40 transition-colors"
        >
          + Log another game (optional)
        </button>
      )}

      <OnboardingActionBar>
        <div className="flex gap-3">
          <button
            onClick={inFlow && sub !== "venue" ? () => setSub(sub === "event" ? "date" : "venue") : onBack}
            className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated active:opacity-70 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onFinish}
            disabled={finishing || !best.filled}
            title={best.filled ? "" : "Pick your best game to finish"}
            className="flex-[2] py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-40 active:opacity-80 transition-opacity"
            style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
          >
            {finishing ? "BUILDING YOUR PROFILE…" : finishLabel}
          </button>
        </div>
      </OnboardingActionBar>
    </div>
  );
}
