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
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
          <div className="text-4xl mb-3">👥</div>
          <div className="font-display text-lg text-text-primary tracking-wide mb-2">
            Find Fans to Follow
          </div>
          <p className="text-text-muted text-sm mb-4">
            Follow other users to see their event logs in your feed.
          </p>
          <a
            href="/explore"
            className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity"
            style={{
              background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
            }}
          >
            Explore Users
          </a>
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
