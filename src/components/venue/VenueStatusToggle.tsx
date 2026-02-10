"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  upsertVenueVisit,
  removeVenueVisit,
  type VenueVisitStatus,
} from "@/lib/queries/venue";

type Props = {
  venueId: string;
  userId: string;
  initialStatus: VenueVisitStatus;
  hasEventLogs: boolean;
};

export default function VenueStatusToggle({
  venueId,
  userId,
  initialStatus,
  hasEventLogs,
}: Props) {
  const [status, setStatus] = useState<VenueVisitStatus>(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (target: "visited" | "want_to_visit") => {
    if (loading) return;
    if (target === status && target === "visited" && hasEventLogs) return;

    const supabase = createClient();
    const previous = status;

    if (target === status) {
      // Toggle off
      setStatus(null);
      setLoading(true);
      const result = await removeVenueVisit(supabase, userId, venueId);
      if ("error" in result) setStatus(previous);
    } else {
      // Set new status
      setStatus(target);
      setLoading(true);
      const result = await upsertVenueVisit(supabase, userId, venueId, target);
      if ("error" in result) setStatus(previous);
    }
    setLoading(false);
  };

  // When user has event logs, show locked visited badge
  if (hasEventLogs) {
    return (
      <div className="bg-win/15 rounded-xl border border-win/30 py-2.5 text-center">
        <span className="text-xs font-display tracking-wider uppercase text-win flex items-center justify-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Visited
        </span>
      </div>
    );
  }

  const visitedActive = status === "visited";
  const wantActive = status === "want_to_visit";

  const btnBase =
    "flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 border text-xs font-display tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-50";

  const visitedStyles = visitedActive
    ? "bg-win/15 border-win/30 text-win"
    : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted hover:text-text-primary";

  const wantStyles = wantActive
    ? "bg-accent/15 border-accent/30 text-accent"
    : "bg-bg-elevated border-border text-text-secondary hover:border-text-muted hover:text-text-primary";

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleToggle("visited")}
        disabled={loading}
        className={`${btnBase} ${visitedStyles}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={visitedActive ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {visitedActive ? (
            <>
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" stroke={visitedActive ? "#161920" : "currentColor"} />
            </>
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </>
          )}
        </svg>
        Visited
      </button>
      <button
        onClick={() => handleToggle("want_to_visit")}
        disabled={loading}
        className={`${btnBase} ${wantStyles}`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={wantActive ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
        Want to Visit
      </button>
    </div>
  );
}
