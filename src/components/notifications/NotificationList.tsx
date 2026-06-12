"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Notification } from "@/lib/queries/notifications";
import { createClient } from "@/lib/supabase/client";
import {
  acceptFollowRequest,
  declineFollowRequest,
} from "@/lib/queries/social";
import {
  BellIcon,
  CheckCircleIcon,
  CelebrationIcon,
  ChartIcon,
  CommentIcon,
  HeartIcon,
  MegaphoneIcon,
  StadiumIcon,
  TrophyIcon,
  UserPlusIcon,
} from "@/components/icons";

type Props = {
  notifications: Notification[];
  currentUserId?: string;
  pendingRequesterIds?: string[];
};

const TYPE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  like: HeartIcon,
  comment: CommentIcon,
  follow: UserPlusIcon,
  follow_request: UserPlusIcon,
  follow_request_approved: CheckCircleIcon,
  companion_tag: StadiumIcon,
  badge_earned: TrophyIcon,
  progress_nudge: ChartIcon,
  friend_activity: MegaphoneIcon,
  friend_milestone: CelebrationIcon,
};

const TYPE_LABELS: Record<string, string> = {
  like: "liked your event log",
  comment: "commented on your event log",
  follow: "started following you",
  follow_request: "requested to follow you",
  follow_request_approved: "accepted your follow request",
  companion_tag: "tagged you as a companion",
  badge_earned: "You earned a badge!",
  progress_nudge: "Check your progress",
  friend_activity: "logged an event",
  friend_milestone: "reached a milestone",
};

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getNotificationLink(n: Notification): string | null {
  if (
    n.type === "follow" ||
    n.type === "follow_request" ||
    n.type === "follow_request_approved"
  ) {
    return n.actor ? `/user/${n.actor.username}` : null;
  }
  if (n.type === "like" || n.type === "comment" || n.type === "companion_tag") {
    return n.target_id ? `/event/${n.target_id}` : null;
  }
  return null;
}

export default function NotificationList({
  notifications,
  currentUserId,
  pendingRequesterIds = [],
}: Props) {
  // requesterId -> 'accepted' | 'declined' once handled in this session
  const [handledRequests, setHandledRequests] = useState<
    Record<string, "accepted" | "declined">
  >({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  async function handleRequest(
    requesterId: string,
    action: "accepted" | "declined"
  ) {
    if (!currentUserId || processingId) return;
    setProcessingId(requesterId);
    const supabase = createClient();
    const result =
      action === "accepted"
        ? await acceptFollowRequest(supabase, currentUserId, requesterId)
        : await declineFollowRequest(supabase, currentUserId, requesterId);
    if (!("error" in result)) {
      setHandledRequests((prev) => ({ ...prev, [requesterId]: action }));
    }
    setProcessingId(null);
  }

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="mb-3 flex justify-center text-text-muted">
          <BellIcon size={40} />
        </div>
        <div className="font-display text-lg text-text-primary tracking-wide mb-1">
          No Notifications
        </div>
        <p className="text-sm text-text-muted">
          When someone interacts with your content, you{"'"}ll see it here.
        </p>
      </div>
    );
  }

  return (
    <div>
      {notifications.map((n) => {
        const Icon = TYPE_ICONS[n.type] || BellIcon;
        const link = getNotificationLink(n);
        const requesterId = n.actor?.id ?? null;
        const handled = requesterId ? handledRequests[requesterId] : undefined;
        const isActionableRequest =
          n.type === "follow_request" &&
          !!requesterId &&
          !!currentUserId &&
          (pendingRequesterIds.includes(requesterId) || !!handled);

        const content = (
          <div
            className="flex items-start gap-3 px-4 py-3.5 border-b border-border transition-colors"
            style={{
              background: n.is_read ? "transparent" : "rgba(212,135,44,0.04)",
            }}
          >
            {/* Actor avatar or icon */}
            {n.actor ? (
              <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden">
                {n.actor.avatar_url ? (
                  <Image
                    src={n.actor.avatar_url}
                    alt={n.actor.display_name || n.actor.username}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{
                      background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
                    }}
                  >
                    <span className="font-display text-sm text-white">
                      {(n.actor.display_name || n.actor.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-bg-elevated text-accent">
                <Icon size={18} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-primary leading-snug">
                {n.actor && (
                  <span className="font-semibold text-accent">
                    {n.actor.display_name || `@${n.actor.username}`}
                  </span>
                )}{" "}
                {n.message || TYPE_LABELS[n.type] || "sent you a notification"}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {formatTimeAgo(n.created_at)}
              </p>

              {isActionableRequest && !handled && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRequest(requesterId!, "accepted");
                    }}
                    disabled={processingId === requesterId}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-opacity"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleRequest(requesterId!, "declined");
                    }}
                    disabled={processingId === requesterId}
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold text-text-secondary bg-bg-input border border-border disabled:opacity-50 hover:text-loss transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}
              {isActionableRequest && handled && (
                <p
                  className={`text-xs mt-2 ${
                    handled === "accepted" ? "text-win" : "text-text-muted"
                  }`}
                >
                  {handled === "accepted"
                    ? "Request accepted"
                    : "Request declined"}
                </p>
              )}
            </div>

            {!n.is_read && (
              <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0 mt-2" />
            )}
          </div>
        );

        if (link) {
          return (
            <Link key={n.id} href={link} className="block hover:bg-bg-card/50">
              {content}
            </Link>
          );
        }

        return <div key={n.id}>{content}</div>;
      })}
    </div>
  );
}
