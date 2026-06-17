"use client";

import { useState, useCallback } from "react";
import TimelineCard from "@/components/TimelineCard";
import CommentSheet from "@/components/event/CommentSheet";
import { SkeletonFeedCard } from "@/components/Skeleton";
import { createClient } from "@/lib/supabase/client";
import { toggleLike, type FeedEntry } from "@/lib/queries/social";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { UsersIcon } from "@/components/icons";
import { toastError } from "@/components/Toaster";

const PAGE_SIZE = 20;

type Props = {
  initialEntries: FeedEntry[];
  initialHasMore: boolean;
  userId: string;
};

export default function FeedList({ initialEntries, initialHasMore, userId }: Props) {
  const [entries, setEntries] = useState(initialEntries);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [commentLogId, setCommentLogId] = useState<string | null>(null);

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
      toastError("Couldn't save your like — check your connection.");
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
    // Open the log's comment thread in a bottom sheet (preserves feed scroll).
    setCommentLogId(entryId);
  };

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(false);

    try {
      const offset = entries.length;
      const res = await fetch(`/api/feed?offset=${offset}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error(`feed ${res.status}`);
      const data = await res.json();
      setEntries((prev) => [...prev, ...data.entries]);
      setHasMore(data.hasMore);
    } catch {
      // Keep hasMore true so the user can retry; surface the failure instead
      // of silently looking like the end of the feed.
      setLoadError(true);
      toastError("Couldn't load more posts — check your connection.");
    } finally {
      setLoadingMore(false);
    }
  }, [entries.length, hasMore, loadingMore]);

  const sentinelRef = useInfiniteScroll(loadMore, {
    enabled: hasMore && !loadingMore && !loadError,
  });

  if (entries.length === 0) {
    return (
      <div className="px-4">
        <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
          <div className="mb-3 flex justify-center text-text-muted">
            <UsersIcon size={40} />
          </div>
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

      {/* Loading more skeleton */}
      {loadingMore && (
        <div>
          {[1, 2].map((i) => (
            <SkeletonFeedCard key={`loading-${i}`} />
          ))}
        </div>
      )}

      {/* Retry affordance when a page failed to load */}
      {loadError && hasMore && !loadingMore && (
        <div className="flex justify-center py-4">
          <button
            onClick={loadMore}
            className="px-4 py-2 rounded-lg border border-border bg-bg-card text-sm text-text-secondary active:opacity-70 transition-opacity"
          >
            Tap to retry
          </button>
        </div>
      )}

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} className="h-1" />

      {commentLogId && (
        <CommentSheet
          eventLogId={commentLogId}
          userId={userId}
          onClose={() => setCommentLogId(null)}
          onCountChange={(count) =>
            setEntries((prev) =>
              prev.map((e) =>
                e.id === commentLogId ? { ...e, comment_count: count } : e
              )
            )
          }
        />
      )}
    </div>
  );
}
