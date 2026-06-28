"use client";

import Button from "@/components/Button";
import OnboardingActionBar from "./OnboardingActionBar";

const APP_STORE_URL = "https://apps.apple.com/app/id6781299327";

type Props = {
  finishing: boolean;
  onContinue: () => void;
  onBack: () => void;
};

/**
 * Final onboarding step on the WEB only. The photo finder (the signature
 * feature) is iOS-app exclusive, so web signups would otherwise finish without
 * ever hearing about it. Sell it and push to the App Store, while still letting
 * them continue on the web. (Native users get the photo finder up front instead.)
 */
export default function StepGetApp({ finishing, onContinue, onBack }: Props) {
  function handleGetApp() {
    window.open(APP_STORE_URL, "_blank", "noopener");
    onContinue();
  }

  return (
    <div>
      <div className="mb-4">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
        </svg>
      </div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Get the app to finish the magic
      </h2>
      <p className="text-sm text-text-secondary leading-6 mb-5">
        Most of the games you&apos;ve been to are already in your photos. The BoxdSeats
        app finds them and logs them automatically, privately, all on your phone. It&apos;s
        the fastest way to build your history, and it&apos;s only on iPhone.
      </p>

      <div className="rounded-2xl border border-border bg-bg-card p-4 space-y-2.5">
        <div className="flex items-start gap-3">
          <span className="text-accent mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>
          </span>
          <p className="text-sm text-text-secondary leading-6">
            Auto-finds the games you&apos;ve already been to from your camera roll.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-accent mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </span>
          <p className="text-sm text-text-secondary leading-6">
            Your photos never leave your phone, only a venue and date are checked.
          </p>
        </div>
      </div>

      <OnboardingActionBar>
        <div className="flex flex-col gap-2">
          <Button onClick={handleGetApp} disabled={finishing}>GET THE APP</Button>
          <button
            onClick={onContinue}
            disabled={finishing}
            className="py-3 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated active:opacity-70 transition-colors disabled:opacity-50"
          >
            {finishing ? "…" : "Continue on the web"}
          </button>
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
