"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { followList, unfollowList, forkList } from "@/lib/queries/lists";

type Props = {
  listId: string;
  userId: string;
  isOwner: boolean;
  isFollowing: boolean;
  source: string;
};

export default function ListActions({
  listId,
  userId,
  isOwner,
  isFollowing: initialIsFollowing,
  source,
}: Props) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [forking, setForking] = useState(false);

  const handleFollowToggle = async () => {
    if (loading) return;
    setLoading(true);

    const supabase = createClient();
    const previous = following;

    if (following) {
      setFollowing(false);
      const result = await unfollowList(supabase, userId, listId);
      if ("error" in result) setFollowing(previous);
    } else {
      setFollowing(true);
      const result = await followList(supabase, userId, listId);
      if ("error" in result) setFollowing(previous);
    }
    setLoading(false);
  };

  const handleFork = async () => {
    if (forking) return;
    setForking(true);

    const supabase = createClient();
    const result = await forkList(supabase, userId, listId);

    if ("id" in result) {
      router.push(`/lists/${result.id}`);
      router.refresh();
    }
    setForking(false);
  };

  const btnBase =
    "flex items-center justify-center gap-2 rounded-lg py-2 px-4 border text-xs font-display tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-50";

  return (
    <div className="flex gap-2">
      {/* Owner: Edit button */}
      {isOwner && (
        <button
          onClick={() => router.push(`/lists/${listId}/edit`)}
          className={`${btnBase} bg-bg-elevated border-border text-text-secondary hover:border-text-muted hover:text-text-primary`}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Edit
        </button>
      )}

      {/* Non-owner: Follow button */}
      {!isOwner && (
        <button
          onClick={handleFollowToggle}
          disabled={loading}
          className={`${btnBase} ${
            following
              ? "bg-bg-elevated border-border text-text-secondary hover:border-loss/40 hover:text-loss hover:bg-loss/10"
              : "bg-accent border-accent text-white hover:opacity-90"
          }`}
        >
          {following ? (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
              Following
            </>
          ) : (
            <>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Follow
            </>
          )}
        </button>
      )}

      {/* Fork button */}
      <button
        onClick={handleFork}
        disabled={forking}
        className={`${btnBase} bg-bg-elevated border-border text-text-secondary hover:border-text-muted hover:text-text-primary`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
          <line x1="12" y1="12" x2="12" y2="15" />
        </svg>
        {forking ? "..." : "Fork"}
      </button>
    </div>
  );
}
