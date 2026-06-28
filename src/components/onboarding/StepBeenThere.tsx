"use client";

import VenueFavoritesPicker from "@/components/profile/VenueFavoritesPicker";
import Button from "@/components/Button";
import OnboardingActionBar from "./OnboardingActionBar";

type Summary = { count: number; topName: string | null };

type Props = {
  userId: string;
  canNext: boolean;
  onVenueChange: (s: Summary) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function StepBeenThere({ userId, canNext, onVenueChange, onBack, onNext }: Props) {
  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Where have you been?
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        Add the venues you&apos;ve been to. Your top one becomes your featured venue — and they all count toward your venue total.
      </p>

      <VenueFavoritesPicker userId={userId} initialFavorites={[]} onChange={onVenueChange} />

      <OnboardingActionBar>
        {!canNext && (
          <p className="text-xs text-accent text-center mb-2.5">Add at least one venue to continue</p>
        )}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated active:opacity-70 transition-colors"
          >
            Back
          </button>
          <Button
            onClick={onNext}
            disabled={!canNext}
            title={canNext ? "" : "Add at least one venue"}
            className="flex-[2]"
          >
            NEXT
          </Button>
        </div>
      </OnboardingActionBar>
    </div>
  );
}
