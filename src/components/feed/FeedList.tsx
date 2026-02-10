"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TimelineCard from "@/components/TimelineCard";
import { createClient } from "@/lib/supabase/client";
import { toggleLike, type FeedEntry } from "@/lib/queries/social";

type Props = {
  initialEntries: FeedEntry[];
  userId: string;
};

export default function FeedList({ initialEntries, userId }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const router = useRouter();

  const handleLike = async (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? {
              ...e,
              liked_by_me: !e.liked_by_me,
              like_count: e.liked_by_me
                ? e.like_count - 1
                : e.like_count + 1,
            }
          : e
      )
    );

    const supabase = createClient();
    const result = await toggleLike(supabase, userId, entryId, entry.liked_by_me);

    if ("error" in result) {
      // Revert on error
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entryId
            ? {
                ...e,
                liked_by_me: entry.liked_by_me,
                like_count: entry.like_count,
              }
            : e
        )
      );
    }
  };

  const handleComment = (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (entry?.event_id) {
      router.push(`/event/${entry.event_id}`);
    }
  };

  if (entries.length === 0) {
    return (
      <div className="px-4">
        <div className="rounded-xl border border-border bg-bg-card p-6 text-center">
          <p className="text-text-muted text-sm">
            No events yet. Follow other users to see their activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {entries.map((entry) => (
        <TimelineCard
          key={entry.id}
          entry={entry}
          showAuthor={true}
          author={entry.author}
          liked={entry.liked_by_me}
          onLike={handleLike}
          onComment={handleComment}
        />
      ))}
    </div>
  );
}
