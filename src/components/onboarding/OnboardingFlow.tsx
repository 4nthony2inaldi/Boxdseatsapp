"use client";

import { useEffect, useMemo, useState } from "react";
import MiniLabel from "@/components/MiniLabel";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { completeOnboarding, finalizeOnboardingExtras } from "@/lib/queries/onboarding";
import { toastError } from "@/components/Toaster";
import { isNativeApp } from "@/lib/native/photoScan";
import StepAccount from "./StepAccount";
import StepPhotoFinder from "./StepPhotoFinder";
import StepRootFor from "./StepRootFor";
import StepBeenThere from "./StepBeenThere";
import StepBestGame from "./StepBestGame";
import StepGetApp from "./StepGetApp";
import OnboardingProgress, { type BigFourProgress } from "./OnboardingProgress";
import type { FavoriteSuggestion } from "@/components/profile/BigFourDrillThrough";

type OnboardingFlowProps = {
  userId: string;
  initialUsername: string;
};

type StepKey = "account" | "photo" | "rootfor" | "venues" | "bestgame" | "getapp";

export default function OnboardingFlow({ userId, initialUsername }: OnboardingFlowProps) {
  const [current, setCurrent] = useState<StepKey>("account");
  const [username, setUsername] = useState(initialUsername);
  const [displayName, setDisplayName] = useState("");
  const [progress, setProgress] = useState<BigFourProgress>({
    team: { count: 0, name: null },
    venue: { count: 0, name: null },
    athlete: { count: 0, name: null },
    event: { filled: false, name: null },
  });
  const [finishing, setFinishing] = useState(false);

  // The photo finder is the native app's signature draw, so on iOS it leads
  // (step 2). A successful scan logs games and marks venues visited, which seeds
  // the rest of onboarding — so the scanned path skips the manual venue + best
  // game steps (the favorite event becomes a glowing slot to fill on the
  // profile). The web / declined path keeps the original line.
  const [native, setNative] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [scanTeams, setScanTeams] = useState<FavoriteSuggestion[]>([]);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isNativeApp()) setNative(true);
  }, []);

  // The step order branches by platform + whether a scan filled things in.
  const flow = useMemo<StepKey[]>(() => {
    if (!native) return ["account", "rootfor", "venues", "bestgame", "getapp"];
    if (scanned) return ["account", "photo", "rootfor"];
    return ["account", "photo", "rootfor", "venues", "bestgame"];
  }, [native, scanned]);

  const stepIndex = Math.max(0, flow.indexOf(current));
  const stepCount = flow.length;

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

  // The photo step renders its own full-width scan + review UI, so it skips the
  // shared horizontal padding (which would otherwise double-inset the cards).
  const isPhoto = current === "photo";

  return (
    <div className="pt-6 pb-40">
      {/* Chrome: step dots, label, and the Big Four strip */}
      <div className="px-4">
        <div className="flex gap-1.5 mb-3">
          {Array.from({ length: stepCount }).map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1 rounded-full transition-colors duration-300"
              style={{ background: i <= stepIndex ? "var(--color-accent)" : "var(--color-bg-input)" }}
            />
          ))}
        </div>
        <MiniLabel className={isPhoto ? "" : "mb-4"}>
          {current === "account" ? "Build your fan card" : `Step ${stepIndex + 1} of ${stepCount}`}
        </MiniLabel>
        {/* The Big Four assembling — the spine of the flow. Hidden on the photo
            finder step, which has its own full-screen scan + review UI. */}
        {!isPhoto && <OnboardingProgress progress={progress} />}
      </div>

      <div className={isPhoto ? "" : "px-4"}>
      {current === "account" && (
        <StepAccount
          userId={userId}
          username={username}
          displayName={displayName}
          onUsernameChange={setUsername}
          onDisplayNameChange={setDisplayName}
          onNext={() => setCurrent(native ? "photo" : "rootfor")}
        />
      )}

      {current === "photo" && (
        <StepPhotoFinder
          onScanned={({ teams }) => {
            setScanned(true);
            setScanTeams(teams);
            // Venue + event are left as "Choose" slots to pick on the profile,
            // so we don't pre-fill them in the Big Four strip here.
            setCurrent("rootfor");
          }}
          onSkip={() => {
            setScanned(false);
            setCurrent("rootfor");
          }}
          onBack={() => setCurrent("account")}
        />
      )}

      {current === "rootfor" && (
        <StepRootFor
          userId={userId}
          teamCount={progress.team.count}
          athleteCount={progress.athlete.count}
          onTeamChange={(s) => setProgress((p) => ({ ...p, team: { count: s.count, name: s.topName } }))}
          onAthleteChange={(s) => setProgress((p) => ({ ...p, athlete: { count: s.count, name: s.topName } }))}
          onBack={() => setCurrent(native ? "photo" : "account")}
          onNext={() => (native && scanned ? handleFinish("/profile") : setCurrent("venues"))}
          finishing={finishing}
          nextLabel={native && scanned ? "SEE MY PROFILE" : "NEXT"}
          suggestedTeams={scanTeams}
        />
      )}

      {current === "venues" && (
        <StepBeenThere
          userId={userId}
          canNext={canLeaveVenues}
          onVenueChange={(s) => setProgress((p) => ({ ...p, venue: { count: s.count, name: s.topName } }))}
          onBack={() => setCurrent("rootfor")}
          onNext={() => setCurrent("bestgame")}
        />
      )}

      {current === "bestgame" && (
        <StepBestGame
          userId={userId}
          best={progress.event}
          onBestChange={(b) => setProgress((p) => ({ ...p, event: b }))}
          finishing={finishing}
          finishLabel={native ? "SEE MY PROFILE" : "NEXT"}
          onBack={() => setCurrent("venues")}
          onFinish={() => (native ? handleFinish("/profile") : setCurrent("getapp"))}
        />
      )}

      {current === "getapp" && (
        <StepGetApp
          finishing={finishing}
          onContinue={() => handleFinish("/profile")}
          onBack={() => setCurrent("bestgame")}
        />
      )}
      </div>
    </div>
  );
}
