"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toastError } from "@/components/Toaster";

type Props = {
  /** The viewer's own log of the shared game — the tag hangs off this. */
  myLogId: string;
  targetUserId: string;
  targetDisplayName: string;
};

/**
 * One-tap "we were here together" for a game both users logged independently.
 * Drops a pending companion tag on the viewer's log; the existing
 * notify-on-tag trigger pings the other user to accept + co-log.
 */
export default function TagTogetherButton({ myLogId, targetUserId, targetDisplayName }: Props) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");

  const handleTag = async () => {
    setState("sending");
    const supabase = createClient();
    const { error } = await supabase.from("companion_tags").insert({
      event_log_id: myLogId,
      tagged_user_id: targetUserId,
      display_name: targetDisplayName,
    });
    if (error) {
      // Unique violation = already tagged → treat as success.
      if (error.code === "23505") {
        setState("sent");
        return;
      }
      toastError("Couldn't send the tag — try again.");
      setState("idle");
      return;
    }
    setState("sent");
  };

  if (state === "sent") {
    return (
      <span className="flex items-center gap-1 text-[11px] text-win font-medium whitespace-nowrap">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Tag sent
      </span>
    );
  }

  return (
    <button
      onClick={handleTag}
      disabled={state === "sending"}
      className="rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-medium text-accent whitespace-nowrap hover:bg-accent/20 transition-colors disabled:opacity-50 cursor-pointer"
    >
      {state === "sending" ? "..." : "Tag each other"}
    </button>
  );
}
