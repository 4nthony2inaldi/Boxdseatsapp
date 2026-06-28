"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  checkUsernameAvailable,
  updateProfileSetup,
} from "@/lib/queries/onboarding";
import AvatarUpload from "@/components/AvatarUpload";
import Button from "@/components/Button";
import { METROS } from "@/lib/metros";
import OnboardingActionBar from "./OnboardingActionBar";

type StepAccountProps = {
  userId: string;
  username: string;
  displayName: string;
  onUsernameChange: (v: string) => void;
  onDisplayNameChange: (v: string) => void;
  onNext: () => void;
};

export default function StepAccount({
  userId,
  username,
  displayName,
  onUsernameChange,
  onDisplayNameChange,
  onNext,
}: StepAccountProps) {
  const [saving, setSaving] = useState(false);
  const [homeCity, setHomeCity] = useState("");
  const [error, setError] = useState<string | null>(null);
  // Result of the most recent completed availability check.
  const [lastCheck, setLastCheck] = useState<{
    name: string;
    available: boolean;
  } | null>(null);
  const supabase = createClient();
  // Capture the username from the first render to detect edits.
  const [initialUsername] = useState(username);

  const trimmed = username.trim().toLowerCase();
  const syntaxValid = trimmed.length >= 3 && /^[a-z0-9_]+$/.test(trimmed);
  const isUnchanged = trimmed === initialUsername;

  const usernameStatus: "idle" | "checking" | "available" | "taken" | "invalid" =
    !trimmed
      ? "idle"
      : !syntaxValid
        ? "invalid"
        : isUnchanged
          ? "available"
          : lastCheck?.name === trimmed
            ? lastCheck.available
              ? "available"
              : "taken"
            : "checking";

  useEffect(() => {
    if (!syntaxValid || isUnchanged) return;
    if (lastCheck?.name === trimmed) return;

    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(supabase, trimmed, userId);
      setLastCheck({ name: trimmed, available });
    }, 400);

    return () => clearTimeout(timer);
  }, [trimmed, syntaxValid, isUnchanged, lastCheck, userId, supabase]);

  async function handleNext() {
    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (usernameStatus === "taken") {
      setError("Username is already taken.");
      return;
    }

    setSaving(true);
    setError(null);

    const updates: { username?: string; display_name?: string; home_city?: string } = {};
    if (trimmedUsername !== initialUsername) {
      updates.username = trimmedUsername;
    }
    if (displayName.trim()) {
      updates.display_name = displayName.trim();
    }
    if (homeCity) {
      updates.home_city = homeCity;
    }

    if (Object.keys(updates).length > 0) {
      const result = await updateProfileSetup(supabase, userId, updates);
      if ("error" in result) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    onNext();
  }

  const usernameValid =
    usernameStatus === "available" ||
    (username.trim().toLowerCase() === initialUsername &&
      username.trim().length >= 3);

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Set up your profile
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Choose your username and personalize your account.
      </p>

      {/* Profile Photo — first, so it's the natural first action and fewer skip it */}
      <div className="flex flex-col items-center mb-7">
        <AvatarUpload
          userId={userId}
          currentAvatarUrl={null}
          displayName={displayName || null}
          username={username}
          size={96}
        />
        <span className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase mt-2.5">
          Add a profile photo
        </span>
      </div>

      {/* Username */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Username
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-sm">
            @
          </span>
          <input
            type="text"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value.replace(/\s/g, ""))}
            placeholder="username"
            className="w-full py-3.5 pl-8 pr-10 rounded-xl bg-bg-input border border-border text-text-primary text-[15px] outline-none focus:border-accent transition-colors"
          />
          {/* Status indicator */}
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {usernameStatus === "checking" && (
              <div className="w-4 h-4 border-2 border-text-muted border-t-accent rounded-full animate-spin" />
            )}
            {usernameStatus === "available" && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-win)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
            {usernameStatus === "taken" && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-loss)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
          </div>
        </div>
        {usernameStatus === "taken" && (
          <p className="text-loss text-xs mt-1.5">Username is taken</p>
        )}
        {usernameStatus === "invalid" && username.trim().length > 0 && (
          <p className="text-text-muted text-xs mt-1.5">
            3+ characters, letters, numbers, underscores only
          </p>
        )}
      </div>

      {/* Display Name */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Display Name <span className="text-text-muted font-body text-[10px] normal-case tracking-normal">(optional)</span>
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="Your Name"
          className="w-full py-3.5 px-3.5 rounded-xl bg-bg-input border border-border text-text-primary text-[15px] outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* Home City */}
      <div className="mb-5">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Home City <span className="text-text-muted font-body text-[10px] normal-case tracking-normal">(optional — powers your local feed)</span>
        </label>
        <select
          value={homeCity}
          onChange={(e) => setHomeCity(e.target.value)}
          className="w-full py-3.5 px-3.5 rounded-xl bg-bg-input border border-border text-text-primary text-[15px] outline-none focus:border-accent transition-colors"
        >
          <option value="">Select your city...</option>
          {METROS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
              {m.state ? `, ${m.state}` : ""}
            </option>
          ))}
        </select>
      </div>

      <OnboardingActionBar>
        {error && <p className="text-loss text-sm mb-2">{error}</p>}
        <Button onClick={handleNext} disabled={saving || !usernameValid} fullWidth>
          {saving ? "SAVING..." : "NEXT"}
        </Button>
      </OnboardingActionBar>
    </div>
  );
}
