"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  followUser,
  unfollowUser,
  removeFollower,
  type FollowUser,
} from "@/lib/queries/social";

type Props = {
  users: FollowUser[];
  currentUserId: string;
  /** True on your own followers list — lets you remove a follower. */
  allowRemove?: boolean;
};

export default function UserList({
  users: initialUsers,
  currentUserId,
  allowRemove = false,
}: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (targetId: string) => {
    if (removingId) return;
    setRemovingId(targetId);
    const supabase = createClient();
    const result = await removeFollower(supabase, currentUserId, targetId);
    if (!("error" in result)) {
      setUsers((prev) => prev.filter((u) => u.id !== targetId));
    }
    setRemovingId(null);
  };

  const handleToggleFollow = async (targetId: string) => {
    const user = users.find((u) => u.id === targetId);
    if (!user || user.id === currentUserId) return;

    const supabase = createClient();

    if (user.isFollowing || user.isPending) {
      // Optimistic unfollow
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetId ? { ...u, isFollowing: false, isPending: false } : u
        )
      );
      const result = await unfollowUser(supabase, currentUserId, targetId);
      if ("error" in result) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetId
              ? { ...u, isFollowing: user.isFollowing, isPending: user.isPending }
              : u
          )
        );
      }
    } else {
      // Follow
      const result = await followUser(supabase, currentUserId, targetId);
      if (!("error" in result)) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === targetId
              ? {
                  ...u,
                  isFollowing: result.status === "active",
                  isPending: result.status === "pending",
                }
              : u
          )
        );
      }
    }
  };

  if (users.length === 0) {
    return (
      <div className="text-center text-text-muted text-sm py-12">
        No users to show.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center gap-3 px-4 py-3 hover:bg-bg-card/50 transition-colors"
        >
          {/* Avatar */}
          <Link
            href={`/user/${user.username}`}
            className="w-10 h-10 rounded-full shrink-0 overflow-hidden"
          >
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.display_name || user.username}
                width={40}
                height={40}
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-sm font-display"
                style={{
                  background:
                    "linear-gradient(135deg, #D4872C 0%, #7B5B3A 100%)",
                }}
              >
                {(user.display_name || user.username || "?")[0].toUpperCase()}
              </div>
            )}
          </Link>

          {/* Name + username */}
          <Link
            href={`/user/${user.username}`}
            className="flex-1 min-w-0"
          >
            <div className="text-sm text-text-primary font-medium truncate">
              {user.display_name || user.username}
            </div>
            <div className="text-xs text-text-muted">@{user.username}</div>
          </Link>

          {/* Remove follower */}
          {allowRemove && user.id !== currentUserId && (
            <button
              onClick={() => handleRemove(user.id)}
              disabled={removingId === user.id}
              className="rounded-lg px-2.5 py-1.5 text-xs text-text-muted bg-bg-elevated border border-border hover:text-loss hover:border-loss/30 disabled:opacity-50 transition-colors"
            >
              {removingId === user.id ? "..." : "Remove"}
            </button>
          )}

          {/* Follow button */}
          {user.id !== currentUserId && (
            <button
              onClick={() => handleToggleFollow(user.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-display tracking-wider uppercase transition-colors cursor-pointer ${
                user.isFollowing
                  ? "bg-bg-elevated border border-border text-text-secondary hover:bg-loss/20 hover:text-loss hover:border-loss/30"
                  : user.isPending
                  ? "bg-bg-elevated border border-border text-text-muted"
                  : "bg-accent text-white hover:opacity-90"
              }`}
            >
              {user.isFollowing
                ? "Following"
                : user.isPending
                ? "Requested"
                : "Follow"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
