"use client";

import { useEffect, useState } from "react";
import MiniLabel from "@/components/MiniLabel";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding, finalizeOnboardingExtras } from "@/lib/queries/onboarding";
import { toastError } from "@/components/Toaster";
import { isNativeApp } from "@/lib/native/photoScan";
import StepAccount from "./StepAccount";
import StepRootFor from "./StepRootFor";
import StepBeenThere from "./StepBeenThere";
import StepBestGame from "./StepBestGame";
import StepPhotoImport from "./StepPhotoImport";
import StepGetApp from "./StepGetApp";
import OnboardingProgress, { type BigFourProgress } from "./OnboardingProgress";

type OnboardingFlowProps = {
  userId: string;
  initialUsername: string;
};

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
  // Both platforms get a 5th step. Native: the photo-import scan (on-device).
  // Web: a "get the app" finale, since the photo finder is iOS-only and web
  // signups would otherwise never learn the signature feature exists.
  const [native, setNative] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isNativeApp()) setNative(true);
  }, []);
  const STEP_COUNT = 5;
  const router = useRouter();
  const supabase = createClient();

  async function handleFinish(dest = "/profile") {
    setFinishing(true);
    try {
      await finalizeOnboardingExtras(supabase, userId);
      await completeOnboarding(supabase);
      router.push(dest);
      router.refresh();
    } catch {
      setFinishing(false);
      toastError("Couldn't finish setting up your profile. Try again.");
    }
  }

  const canLeaveVenues = progress.venue.count > 0;

  return (
    <div className="px-4 pt-6 pb-40">
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
      <MiniLabel className="mb-4">{step === 0 ? "Build your fan card" : `Step ${step + 1} of ${STEP_COUNT}`}</MiniLabel>

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
          teamCount={progress.team.count}
          athleteCount={progress.athlete.count}
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
          finishing={false}
          finishLabel="NEXT"
          onBack={() => setStep(2)}
          onFinish={() => setStep(4)}
        />
      )}

      {step === 4 && native && (
        <StepPhotoImport
          finishing={finishing}
          onScan={() => handleFinish("/log/photos")}
          onSkip={() => handleFinish("/profile")}
          onBack={() => setStep(3)}
        />
      )}

      {step === 4 && !native && (
        <StepGetApp
          finishing={finishing}
          onContinue={() => handleFinish("/profile")}
          onBack={() => setStep(3)}
        />
      )}
    </div>
  );
}
