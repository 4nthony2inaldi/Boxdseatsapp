"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isNativeApp } from "@/lib/native/photoScan";
import { enablePush } from "@/lib/native/push";
import { toastError } from "@/components/Toaster";

const PUSH_TYPES: { type: string; label: string }[] = [
  { type: "follow", label: "New followers" },
  { type: "like", label: "Likes" },
  { type: "comment", label: "Comments" },
  { type: "companion_tag", label: "Companion tags" },
];

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className="relative w-11 h-6 rounded-full transition-colors shrink-0"
      style={{ background: on ? "var(--color-accent)" : "var(--color-bg-input)" }}
    >
      <div
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(22px)" : "translateX(2px)" }}
      />
    </button>
  );
}

/**
 * Push notification preferences. Native-only (push is delivered via APNs on the
 * iOS app); hidden on the web where there's nothing to deliver. Reads/writes
 * notification_preferences.push_enabled per type; turning a type on also
 * requests OS permission if it hasn't been granted yet.
 */
export default function NotificationSettings({ userId }: { userId: string }) {
  // `ready` is only set from the async callback below (never synchronously in
  // the effect), which keeps SSR/first-render output null and avoids both a
  // hydration mismatch and the set-state-in-effect rule.
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isNativeApp()) return;
    const supabase = createClient();
    supabase
      .from("notification_preferences")
      .select("type, push_enabled")
      .eq("user_id", userId)
      .then(({ data }) => {
        const map: Record<string, boolean> = {};
        for (const r of data || []) map[r.type as string] = r.push_enabled as boolean;
        setPrefs(map);
        setReady(true);
      });
  }, [userId]);

  if (!ready) return null;

  const isOn = (type: string) => prefs[type] !== false; // default on

  async function toggle(type: string) {
    const next = !isOn(type);
    setPrefs((p) => ({ ...p, [type]: next }));
    if (next) await enablePush(); // ensure OS permission when enabling a type
    const supabase = createClient();
    const { error } = await supabase
      .from("notification_preferences")
      .upsert(
        { user_id: userId, type: type as never, push_enabled: next },
        { onConflict: "user_id,type" }
      );
    if (error) {
      setPrefs((p) => ({ ...p, [type]: !next }));
      toastError("Couldn't save — check your connection.");
    }
  }

  return (
    <>
      <h2 className="font-display text-[13px] text-text-muted tracking-[1.5px] uppercase mt-6 mb-3 px-4">
        Push Notifications
      </h2>
      <div className="bg-bg-card border-y border-border">
        {PUSH_TYPES.map(({ type, label }) => (
          <div key={type} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0">
            <span className="text-sm text-text-primary">{label}</span>
            <Toggle on={isOn(type)} onClick={() => toggle(type)} />
          </div>
        ))}
      </div>
    </>
  );
}
