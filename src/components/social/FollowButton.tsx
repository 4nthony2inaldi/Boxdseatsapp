"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { followUser, unfollowUser } from "@/lib/queries/social";

type Props = {
  targetUserId: string;
  currentUserId: string;
  initialIsFollowing: boolean;
  initialIsPending: boolean;
  onFollowChange?: (isFollowing: boolean, isPending: boolean) => void;
};

export default function FollowButton({
  targetUserId,
  currentUserId,
  initialIsFollowing,
  initialIsPending,
  onFollowChange,
}: Props) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, setIsPending] = useState(initialIsPending);
  const [loading, setLoading] = useState(false);

  if (targetUserId === currentUserId) return null;

  const handleToggle = async () => {
    setLoading(true);
    const supabase = createClient();

    if (isFollowing || isPending) {
      // Optimistic: unfollow / cancel request
      setIsFollowing(false);
      setIsPending(false);
      onFollowChange?.(false, false);

      const result = await unfollowUser(supabase, currentUserId, targetUserId);
      if ("error" in result) {
        // Revert
        setIsFollowing(initialIsFollowing);
        setIsPending(initialIsPending);
        onFollowChange?.(initialIsFollowing, initialIsPending);
      }
    } else {
      // Optimistic: follow
      const result = await followUser(supabase, currentUserId, targetUserId);
      if ("error" in result) {
        // Stay as-is
      } else {
        const newFollowing = result.status === "active";
        const newPending = result.status === "pending";
        setIsFollowing(newFollowing);
        setIsPending(newPending);
        onFollowChange?.(newFollowing, newPending);
      }
    }

    setLoading(false);
  };

  let label: string;
  let style: string;

  if (isFollowing) {
    label = "Following";
    style =
      "bg-bg-elevated border border-border text-text-secondary hover:bg-loss/20 hover:text-loss hover:border-loss/30";
  } else if (isPending) {
    label = "Requested";
    style =
      "bg-bg-elevated border border-border text-text-muted";
  } else {
    label = "Follow";
    style =
      "bg-accent text-white hover:opacity-90";
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-lg px-4 py-1.5 text-xs font-display tracking-wider uppercase transition-colors cursor-pointer disabled:opacity-50 ${style}`}
    >
      {loading ? "..." : label}
    </button>
  );
}
