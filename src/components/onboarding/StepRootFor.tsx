"use client";

import { useState } from "react";
import BigFourDrillThrough from "@/components/profile/BigFourDrillThrough";
import Button from "@/components/Button";
import OnboardingActionBar from "./OnboardingActionBar";

type Summary = { count: number; topName: string | null };

type Props = {
  userId: string;
  teamCount: number;
  athleteCount: number;
  onTeamChange: (s: Summary) => void;
  onAthleteChange: (s: Summary) => void;
  onBack: () => void;
  onNext: () => void;
  /** Label for the primary button when ready to advance (e.g. "SEE MY PROFILE"
   *  when this is the last step on the scanned path). Defaults to "NEXT". */
  nextLabel?: string;
  /** When true, onNext is finishing onboarding — disable + show a building state. */
  finishing?: boolean;
};

export default function StepRootFor({
  userId,
  teamCount,
  athleteCount,
  onTeamChange,
  onAthleteChange,
  onBack,
  onNext,
  nextLabel = "NEXT",
  finishing = false,
}: Props) {
  const [tab, setTab] = useState<"team" | "athlete">("team");

  // Switch tabs AND jump to the top — otherwise, after scrolling down the long
  // Teams list, switching to Players swaps the content above your scroll position
  // and it looks like nothing happened.
  const selectTab = (k: "team" | "athlete") => {
    setTab(k);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const needTeam = teamCount === 0;
  const needAthlete = teamCount > 0 && athleteCount === 0;

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Who do you root for?
      </h2>
      <p className="text-sm text-text-secondary mb-5">
        Add a favorite team and a favorite player for the leagues you follow. Your first pick in each headlines your profile; the rest stack behind it.
      </p>

      <div className="flex gap-1.5 mb-4">
        {(["team", "athlete"] as const).map((k) => {
          const active = tab === k;
          // Draw the eye to Players once a team is in but no athlete yet.
          const attention = k === "athlete" && needAthlete && !active;
          return (
            <button
              key={k}
              onClick={() => selectTab(k)}
              className="relative flex-1 py-2 rounded-lg font-display text-xs tracking-[1px] uppercase transition-colors active:opacity-70"
              style={{
                background: active ? "var(--color-accent)" : "var(--color-bg-input)",
                color: active ? "#fff" : "var(--color-text-secondary)",
                border: attention ? "1px solid var(--color-accent)" : "1px solid transparent",
              }}
            >
              {k === "team" ? "Teams" : "Players"}
              {attention && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* Both stay mounted so picks persist across tab switches */}
      <div className={tab === "team" ? "" : "hidden"}>
        <BigFourDrillThrough userId={userId} category="team" initialFavorites={[]} onChange={onTeamChange} />
      </div>
      <div className={tab === "athlete" ? "" : "hidden"}>
        <BigFourDrillThrough userId={userId} category="athlete" initialFavorites={[]} onChange={onAthleteChange} />
      </div>

      <OnboardingActionBar>
        {needAthlete && (
          <button
            onClick={() => selectTab("athlete")}
            className="w-full mb-2.5 flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-accent/40 bg-accent/10 text-left active:opacity-80 transition-opacity"
          >
            <span className="text-sm text-accent font-medium">
              Now choose 1+ favorite athlete to continue
            </span>
            {tab === "team" && (
              <span className="text-accent text-sm font-semibold whitespace-nowrap">Players →</span>
            )}
          </button>
        )}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl bg-bg-card border border-border text-text-secondary text-sm hover:bg-bg-elevated active:opacity-70 transition-colors"
          >
            Back
          </button>
          <Button
            onClick={needAthlete ? () => selectTab("athlete") : onNext}
            disabled={needTeam || finishing}
            title={needTeam ? "Add at least one team" : ""}
            className="flex-[2]"
          >
            {needAthlete ? "PICK AN ATHLETE" : finishing ? "BUILDING YOUR PROFILE…" : nextLabel}
          </Button>
        </div>
      </OnboardingActionBar>
    </div>
  );
}
