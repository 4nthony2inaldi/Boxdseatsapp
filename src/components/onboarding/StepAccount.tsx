"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  checkUsernameAvailable,
  updateProfileSetup,
} from "@/lib/queries/onboarding";
import AvatarUpload from "@/components/AvatarUpload";

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
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const initialUsername = useRef(username);

  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || trimmed.length < 3) {
      setUsernameStatus(trimmed.length > 0 ? "invalid" : "idle");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setUsernameStatus("invalid");
      return;
    }
    // If unchanged from initial, don't check
    if (trimmed === initialUsername.current) {
      setUsernameStatus("available");
      return;
    }

    setUsernameStatus("checking");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const available = await checkUsernameAvailable(supabase, trimmed, userId);
      setUsernameStatus(available ? "available" : "taken");
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, userId, supabase]);

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

    const updates: { username?: string; display_name?: string } = {};
    if (trimmedUsername !== initialUsername.current) {
      updates.username = trimmedUsername;
    }
    if (displayName.trim()) {
      updates.display_name = displayName.trim();
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
    (username.trim().toLowerCase() === initialUsername.current &&
      username.trim().length >= 3);

  return (
    <div>
      <h2 className="font-display text-[28px] text-text-primary tracking-wide leading-tight mb-1">
        Set Up Your Profile
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        Choose your username and personalize your account.
      </p>

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

      {/* Profile Photo */}
      <div className="mb-8">
        <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
          Profile Photo
        </label>
        <AvatarUpload
          userId={userId}
          currentAvatarUrl={null}
          displayName={displayName || null}
          username={username}
          size={80}
        />
      </div>

      {error && <p className="text-loss text-sm mb-4">{error}</p>}

      <button
        onClick={handleNext}
        disabled={saving || !usernameValid}
        className="w-full py-4 rounded-xl font-display text-lg tracking-widest text-white disabled:opacity-50 transition-opacity"
        style={{
          background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
        }}
      >
        {saving ? "SAVING..." : "NEXT"}
      </button>
    </div>
  );
}
