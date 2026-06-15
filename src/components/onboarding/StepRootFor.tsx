"use client";

import { useState } from "react";
import BigFourDrillThrough from "@/components/profile/BigFourDrillThrough";

type Summary = { count: number; topName: string | null };

type Props = {
  userId: string;
  canNext: boolean;
  onTeamChange: (s: Summary) => void;
  onAthleteChange: (s: Summary) => void;
  onBack: () => void;
  onNext: () => void;
};

export default function StepRootFor({ userId, canNext, onTeamChange, onAthleteChange, onBack, onNext }: Props) {
  const [tab, setTab] = useState<"team" | "athlete">("team");

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Who do you root for?
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        Add a team and a player for each league you follow. Your first pick in each headlines your profile — the rest stack behind it.
      </p>

      <div className="flex gap-1.5 mb-4">
        {(["team", "athlete"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="flex-1 py-2 rounded-lg font-display text-xs tracking-[1px] uppercase transition-colors active:opacity-70"
            style={{
              background: tab === k ? "var(--color-accent)" : "var(--color-bg-input)",
              color: tab === k ? "#fff" : "var(--color-text-secondary)",
            }}
          >
            {k === "team" ? "Teams" : "Players"}
          </button>
        ))}
      </div>

      {/* Both stay mounted so picks persist across tab switches */}
      <div className={tab === "team" ? "" : "hidden"}>
        <BigFourDrillThrough userId={userId} category="team" initialFavorites={[]} onChange={onTeamChange} />
      </div>
      <div className={tab === "athlete" ? "" : "hidden"}>
        <BigFourDrillThrough userId={userId} category="athlete" initialFavorites={[]} onChange={onAthleteChange} />
      </div>

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
          title={canNext ? "" : "Add at least one team and one player"}
          className="flex-[2] py-3.5 rounded-xl font-display text-base tracking-widest text-white disabled:opacity-40 active:opacity-80 transition-opacity"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          NEXT
        </button>
      </div>
    </div>
  );
}
