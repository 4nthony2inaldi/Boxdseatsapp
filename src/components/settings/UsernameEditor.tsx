"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  checkUsernameAvailable,
  updateProfileSetup,
} from "@/lib/queries/onboarding";
import { toastError } from "@/components/Toaster";

/**
 * In-app username change with the same guards as onboarding: 3+ chars,
 * [a-z0-9_], live availability check, and the unique-constraint catch.
 * Safe because username only drives profile routing (no JWT/caching);
 * old links to a prior handle simply 404 — fine pre-launch.
 */
export default function UsernameEditor({ userId, currentUsername }: { userId: string; currentUsername: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentUsername);
  const [status, setStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const supabase = createClient();

  const trimmed = value.trim().toLowerCase();
  const syntaxValid = trimmed.length >= 3 && /^[a-z0-9_]+$/.test(trimmed);
  const unchanged = trimmed === currentUsername.toLowerCase();

  useEffect(() => {
    if (!open || unchanged || !syntaxValid) {
      setStatus(unchanged ? "idle" : syntaxValid ? status : trimmed ? "invalid" : "idle");
      return;
    }
    setStatus("checking");
    const t = setTimeout(async () => {
      const ok = await checkUsernameAvailable(supabase, trimmed, userId);
      setStatus(ok ? "available" : "taken");
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed, open, unchanged, syntaxValid]);

  async function handleSave() {
    if (!syntaxValid || status === "taken" || unchanged) return;
    setSaving(true);
    const result = await updateProfileSetup(supabase, userId, { username: trimmed });
    if ("error" in result) {
      toastError(result.error);
      setSaving(false);
      return;
    }
    // keep auth metadata in sync (not used for routing, but tidy)
    await supabase.auth.updateUser({ data: { username: trimmed } }).catch(() => {});
    setSaving(false);
    setSaved(true);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); setValue(currentUsername); setSaved(false); }}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border hover:bg-bg-elevated active:opacity-70 transition-colors"
      >
        <span className="text-sm text-text-primary">Username</span>
        <span className="flex items-center gap-2 text-sm text-text-muted">
          @{currentUsername}
          {saved && <span className="text-win text-xs">Saved ✓</span>}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className="px-4 py-3 border-b border-border">
      <label className="text-xs text-text-muted block mb-1">Username</label>
      <div className="flex items-center gap-2 rounded-lg bg-bg-input border border-border px-3 py-2 focus-within:border-accent transition-colors">
        <span className="text-text-muted text-sm">@</span>
        <input
          autoFocus
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-transparent text-text-primary text-sm outline-none border-none"
        />
        {status === "checking" && <div className="w-4 h-4 border-2 border-text-muted border-t-accent rounded-full animate-spin" />}
        {status === "available" && <span className="text-win text-xs">available</span>}
        {status === "taken" && <span className="text-loss text-xs">taken</span>}
      </div>
      {status === "invalid" && (
        <p className="text-text-muted text-xs mt-1">3+ characters — letters, numbers, underscores only.</p>
      )}
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={() => { setOpen(false); setValue(currentUsername); }}
          className="flex-1 py-2 rounded-lg bg-bg-card border border-border text-text-secondary text-sm active:opacity-70"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || unchanged || !syntaxValid || status === "taken" || status === "checking"}
          className="flex-[2] py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 active:opacity-80"
          style={{ background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))" }}
        >
          {saving ? "Saving..." : "Save username"}
        </button>
      </div>
    </div>
  );
}
