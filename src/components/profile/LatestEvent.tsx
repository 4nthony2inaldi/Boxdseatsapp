"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { TimelineEntry } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";
import TimelineCard from "../TimelineCard";
import CommentSheet from "../event/CommentSheet";
import { createClient } from "@/lib/supabase/client";
import { toggleLike } from "@/lib/queries/social";
import { toastError } from "@/components/Toaster";

type LatestEventProps = {
  entry: TimelineEntry | null;
  timelineHref?: string;
  canEdit?: boolean;
  /** The signed-in viewer (may differ from the profile owner). Enables liking. */
  viewerId?: string;
};

export default function LatestEvent({
  entry,
  timelineHref = "/timeline",
  canEdit = false,
  viewerId,
}: LatestEventProps) {
  // Local copy so the like count can update optimistically.
  const [current, setCurrent] = useState(entry);
  const [liked, setLiked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  // Keep local state in sync if the entry prop changes.
  useEffect(() => {
    setCurrent(entry);
  }, [entry]);

  // Look up whether the viewer has already liked this entry.
  useEffect(() => {
    if (!viewerId || !entry) return;
    const supabase = createClient();
    supabase
      .from("likes")
      .select("event_log_id")
      .eq("user_id", viewerId)
      .eq("event_log_id", entry.id)
      .maybeSingle()
      .then(({ data }) => setLiked(!!data));
  }, [viewerId, entry]);

  if (!current) return null;

  const handleComment = () => {
    // Open the log's comment thread in a bottom sheet (no navigation).
    if (viewerId) setCommentsOpen(true);
  };

  const handleLike = async (entryId: string) => {
    if (!viewerId) return;
    const currentlyLiked = liked;

    // Optimistic update
    setLiked(!currentlyLiked);
    setCurrent((prev) =>
      prev ? { ...prev, like_count: prev.like_count + (currentlyLiked ? -1 : 1) } : prev
    );

    const supabase = createClient();
    const result = await toggleLike(supabase, viewerId, entryId, currentlyLiked);
    if ("error" in result) {
      toastError("Couldn't save your like — check your connection.");
      // Revert
      setLiked(currentlyLiked);
      setCurrent((prev) =>
        prev ? { ...prev, like_count: prev.like_count + (currentlyLiked ? 1 : -1) } : prev
      );
    }
  };

  return (
    <div className="px-4">
      <div className="flex items-center justify-between mb-2.5">
        <SectionLabel>Latest Event</SectionLabel>
        <Link
          href={timelineHref}
          className="text-[11px] text-accent font-display tracking-[1px] uppercase hover:opacity-80 transition-opacity"
        >
          See All
        </Link>
      </div>
      <TimelineCard
        entry={current}
        editHref={canEdit ? `/log?edit=${current.id}` : null}
        liked={liked}
        onLike={viewerId ? handleLike : undefined}
        onComment={handleComment}
      />

      {commentsOpen && viewerId && (
        <CommentSheet
          eventLogId={current.id}
          userId={viewerId}
          onClose={() => setCommentsOpen(false)}
          onCountChange={(count) =>
            setCurrent((prev) =>
              prev ? { ...prev, comment_count: count } : prev
            )
          }
        />
      )}
    </div>
  );
}
