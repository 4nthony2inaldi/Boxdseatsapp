"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { upsertVenueVisit } from "@/lib/queries/venue";

type ListItemCheckboxProps = {
  item: {
    id: string;
    venue_id: string | null;
    event_tag?: string | null;
    display_name: string;
  };
  initialVisited: boolean;
  userId: string;
};

export default function ListItemCheckbox({
  item,
  initialVisited,
  userId,
}: ListItemCheckboxProps) {
  const [visited, setVisited] = useState(initialVisited);
  const [loading, setLoading] = useState(false);

  // Event-tag items complete by logging a matching event, not by checking
  // a box — their rows link to the venue (where the Log CTA lives).
  const isEventItem = !!item.event_tag;

  const handleMarkVisited = async () => {
    if (visited || !item.venue_id || loading || isEventItem) return;

    // Optimistic update
    setVisited(true);
    setLoading(true);

    const supabase = createClient();
    const result = await upsertVenueVisit(supabase, userId, item.venue_id, "visited");

    if ("error" in result) {
      // Revert on failure
      setVisited(false);
    }

    setLoading(false);
  };

  const content = (
    <div
      className={`rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
        visited
          ? "bg-bg-card border-border"
          : "bg-bg-card/50 border-border/50"
      }`}
    >
      {/* Check / empty box (circle for event items — not directly checkable) */}
      <div
        className={`w-5 h-5 flex items-center justify-center shrink-0 transition-colors ${
          isEventItem ? "rounded-full" : "rounded"
        } ${
          visited
            ? "bg-win/20 text-win"
            : isEventItem
              ? "border border-border"
              : "border border-border hover:border-accent/50 cursor-pointer"
        }`}
      >
        {visited && (
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <span
          className={`text-sm block ${
            visited ? "text-text-primary" : "text-text-muted"
          }`}
        >
          {item.display_name}
        </span>
        {isEventItem && !visited && (
          <span className="text-[11px] text-text-muted/70 block mt-0.5">
            Log an event at this tournament to check it off
          </span>
        )}
      </div>

      {item.venue_id && (visited || isEventItem) && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5A5F72"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  );

  // Visited items and event items link to the venue page
  if (item.venue_id && (visited || isEventItem)) {
    return <Link href={`/venue/${item.venue_id}`}>{content}</Link>;
  }

  // Unvisited venue items are tappable to mark as visited
  if (!visited && item.venue_id) {
    return (
      <button
        onClick={handleMarkVisited}
        disabled={loading}
        className="block w-full text-left"
      >
        {content}
      </button>
    );
  }

  // Items without venue_id (event-type) are static
  return content;
}
