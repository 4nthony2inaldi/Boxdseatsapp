"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding, finalizeOnboardingExtras } from "@/lib/queries/onboarding";
import StepAccount from "./StepAccount";
import StepRootFor from "./StepRootFor";
import StepBeenThere from "./StepBeenThere";
import StepBestGame from "./StepBestGame";
import OnboardingProgress, { type BigFourProgress } from "./OnboardingProgress";

type OnboardingFlowProps = {
  userId: string;
  initialUsername: string;
};

const STEP_COUNT = 4;

export default function OnboardingFlow({ userId, initialUsername }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState("");
  const [progress, setProgress] = useState<BigFourProgress>({
    team: { count: 0, name: null },
    venue: { count: 0, name: null },
    athlete: { count: 0, name: null },
    event: { filled: false, name: null },
  });
  const [finishing, setFinishing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleFinish() {
    setFinishing(true);
    try {
      await finalizeOnboardingExtras(supabase, userId);
      await completeOnboarding(supabase);
      router.push("/profile");
      router.refresh();
    } catch {
      setFinishing(false);
    }
  }

  // A team is required to advance; a favorite player is encouraged but optional.
  const canLeaveRootFor = progress.team.count > 0;
  const canLeaveVenues = progress.venue.count > 0;

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Step indicator */}
      <div className="flex gap-1.5 mb-3">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-colors duration-300"
            style={{ background: i <= step ? "var(--color-accent)" : "var(--color-bg-input)" }}
          />
        ))}
      </div>
      <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-4">
        {step === 0 ? "Build your fan card" : `Step ${step + 1} of ${STEP_COUNT}`}
      </div>

      {/* The Big Four assembling — the spine of the whole flow */}
      <OnboardingProgress progress={progress} />

      {step === 0 && (
        <StepAccount
          userId={userId}
          username={username}
          displayName={displayName}
          onUsernameChange={setUsername}
          onDisplayNameChange={setDisplayName}
          onNext={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <StepRootFor
          userId={userId}
          canNext={canLeaveRootFor}
          onTeamChange={(s) => setProgress((p) => ({ ...p, team: { count: s.count, name: s.topName } }))}
          onAthleteChange={(s) => setProgress((p) => ({ ...p, athlete: { count: s.count, name: s.topName } }))}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepBeenThere
          userId={userId}
          canNext={canLeaveVenues}
          onVenueChange={(s) => setProgress((p) => ({ ...p, venue: { count: s.count, name: s.topName } }))}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepBestGame
          userId={userId}
          best={progress.event}
          onBestChange={(b) => setProgress((p) => ({ ...p, event: b }))}
          finishing={finishing}
          onBack={() => setStep(2)}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
