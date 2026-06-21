"use client";

import Button from "@/components/Button";
import OnboardingActionBar from "./OnboardingActionBar";

type Props = {
  finishing: boolean;
  onScan: () => void;
  onSkip: () => void;
  onBack: () => void;
};

/**
 * Final onboarding step (native app only): offer to auto-log the games found
 * in the user's camera roll. "Find my games" finishes onboarding and routes to
 * the photo flow (which shows the full consent/priming screen); "Skip" finishes
 * straight to the profile.
 */
export default function StepPhotoImport({ finishing, onScan, onSkip, onBack }: Props) {
  return (
    <div>
      <div className="mb-4">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
        </svg>
      </div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Log your whole camera roll
      </h2>
      <p className="text-sm text-text-secondary leading-6 mb-5">
        Most of the games you&apos;ve been to are already in your photos. We can find them and log them
        in seconds — privately, all on your phone. Nothing gets uploaded.
      </p>

      <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-2.5">
        <div className="flex items-start gap-3">
          <span className="text-accent mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          </span>
          <p className="text-sm text-text-secondary leading-6">
            We read only each photo&apos;s <span className="text-text-primary font-medium">date and location</span> — never the pictures.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-accent mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </span>
          <p className="text-sm text-text-secondary leading-6">
            It all runs <span className="text-text-primary font-medium">on your phone</span> — nothing is uploaded.
          </p>
        </div>
      </div>

      <OnboardingActionBar>
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            disabled={finishing}
            className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated active:opacity-70 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
          <Button onClick={onScan} disabled={finishing} className="flex-[2]">
            {finishing ? "…" : "FIND MY GAMES"}
          </Button>
        </div>
      </OnboardingActionBar>

      <button
        onClick={onBack}
        disabled={finishing}
        className="mt-3 text-xs text-text-muted hover:text-text-secondary disabled:opacity-50"
      >
        ← Back
      </button>
    </div>
  );
}
