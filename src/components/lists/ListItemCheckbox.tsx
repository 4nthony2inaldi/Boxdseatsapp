"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { upsertVenueVisit } from "@/lib/queries/venue";

type ListItemCheckboxProps = {
  item: { id: string; venue_id: string | null; display_name: string };
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

  const handleMarkVisited = async () => {
    if (visited || !item.venue_id || loading) return;

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
      {/* Check / empty box */}
      <div
        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
          visited
            ? "bg-win/20 text-win"
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

      <span
        className={`text-sm flex-1 ${
          visited ? "text-text-primary" : "text-text-muted"
        }`}
      >
        {item.display_name}
      </span>

      {visited && item.venue_id && (
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

  // Visited items link to the venue page
  if (visited && item.venue_id) {
    return <Link href={`/venue/${item.venue_id}`}>{content}</Link>;
  }

  // Unvisited items with a venue_id are tappable to mark as visited
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
