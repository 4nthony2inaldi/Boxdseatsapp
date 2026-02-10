"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding, markVenuesVisited } from "@/lib/queries/onboarding";
import StepAccount from "./StepAccount";
import StepBigFour from "./StepBigFour";
import StepVenues from "./StepVenues";
import StepFirstEvent from "./StepFirstEvent";

type OnboardingFlowProps = {
  userId: string;
  initialUsername: string;
  allVenues: { id: string; name: string; city: string; state: string | null; sport: string | null }[];
};

const STEP_LABELS = ["Account", "Favorites", "Venues", "First Event"];

export default function OnboardingFlow({
  userId,
  initialUsername,
  allVenues,
}: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState("");
  const [favSport, setFavSport] = useState<string | null>(null);
  const [favTeamId, setFavTeamId] = useState<string | null>(null);
  const [favVenueId, setFavVenueId] = useState<string | null>(null);
  const [favAthleteId, setFavAthleteId] = useState<string | null>(null);
  const [favEventId, setFavEventId] = useState<string | null>(null);
  const [markedVenueIds, setMarkedVenueIds] = useState<string[]>([]);
  const [finishing, setFinishing] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleFinish(skipFirstEvent = true) {
    setFinishing(true);
    try {
      // Mark venues as visited
      if (markedVenueIds.length > 0) {
        await markVenuesVisited(supabase, userId, markedVenueIds);
      }
      // Mark onboarding complete
      await completeOnboarding(supabase, userId);
      router.push("/profile");
      router.refresh();
    } catch {
      setFinishing(false);
    }
  }

  return (
    <div className="px-4 pt-6 pb-24">
      {/* Progress indicator */}
      <div className="flex gap-1.5 mb-6">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-colors duration-300"
            style={{
              background: i <= step ? "var(--color-accent)" : "var(--color-bg-input)",
            }}
          />
        ))}
      </div>

      {/* Step label */}
      <div className="flex justify-between items-center mb-2">
        <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase">
          Step {step + 1} of {STEP_LABELS.length}
        </div>
      </div>

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
        <StepBigFour
          userId={userId}
          favSport={favSport}
          favTeamId={favTeamId}
          favVenueId={favVenueId}
          favAthleteId={favAthleteId}
          favEventId={favEventId}
          onFavSportChange={setFavSport}
          onFavTeamChange={setFavTeamId}
          onFavVenueChange={setFavVenueId}
          onFavAthleteChange={setFavAthleteId}
          onFavEventChange={setFavEventId}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepVenues
          allVenues={allVenues}
          markedVenueIds={markedVenueIds}
          onToggleVenue={(id) => {
            setMarkedVenueIds((prev) =>
              prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
            );
          }}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <StepFirstEvent
          markedVenueIds={markedVenueIds}
          allVenues={allVenues}
          finishing={finishing}
          onBack={() => setStep(2)}
          onFinish={handleFinish}
        />
      )}
    </div>
  );
}
