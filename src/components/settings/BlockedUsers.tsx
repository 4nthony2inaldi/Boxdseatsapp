"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { unblockUser, type BlockedUser } from "@/lib/queries/social";
import { toastError } from "@/components/Toaster";

type Props = {
  currentUserId: string;
  blockedUsers: BlockedUser[];
};

export default function BlockedUsers({ currentUserId, blockedUsers }: Props) {
  const [users, setUsers] = useState(blockedUsers);
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleUnblock(userId: string) {
    if (processingId) return;
    setProcessingId(userId);
    const supabase = createClient();
    const result = await unblockUser(supabase, currentUserId, userId);
    if (!("error" in result)) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      toastError("Couldn't unblock — check your connection.");
    }
    setProcessingId(null);
  }

  if (users.length === 0) {
    return (
      <>
        <div className="px-4 pt-6 pb-2">
          <h2 className="font-display text-[13px] text-text-muted tracking-[2px] uppercase">
            Blocked Users
          </h2>
        </div>
        <div className="bg-bg-card border-y border-border px-4 py-6 text-center text-sm text-text-muted">
          You haven{"'"}t blocked anyone.
        </div>
      </>
    );
  }

  return (
    <>
      <div className="px-4 pt-6 pb-2">
        <h2 className="font-display text-[13px] text-text-muted tracking-[2px] uppercase">
          Blocked Users
        </h2>
      </div>
      <div className="bg-bg-card border-y border-border">
        {users.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0"
          >
            <div className="w-9 h-9 rounded-full shrink-0 overflow-hidden">
              {u.avatar_url ? (
                <Image
                  src={u.avatar_url}
                  alt={u.display_name || u.username}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-xs font-display"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
                  }}
                >
                  {(u.display_name || u.username).charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-primary truncate">
                {u.display_name || u.username}
              </div>
              <div className="text-xs text-text-muted truncate">
                @{u.username}
              </div>
            </div>
            <button
              onClick={() => handleUnblock(u.id)}
              disabled={processingId === u.id}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-bg-input border border-border text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
            >
              {processingId === u.id ? "..." : "Unblock"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
