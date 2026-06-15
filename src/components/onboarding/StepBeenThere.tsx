"use client";

import VenueFavoritesPicker from "@/components/profile/VenueFavoritesPicker";

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

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated active:opacity-70 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          title={canNext ? "" : "Add at least one venue"}
          className="flex-[2] py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-40 active:opacity-80 transition-opacity"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
