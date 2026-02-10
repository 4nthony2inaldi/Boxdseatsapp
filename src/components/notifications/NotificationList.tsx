"use client";

import Link from "next/link";
import type { Notification } from "@/lib/queries/notifications";

type Props = {
  notifications: Notification[];
};

const TYPE_ICONS: Record<string, string> = {
  like: "❤️",
  comment: "💬",
  follow: "👤",
  follow_request_approved: "✅",
  companion_tag: "🏟️",
  badge_earned: "🏆",
  progress_nudge: "📊",
  friend_activity: "📣",
  friend_milestone: "🎉",
};

const TYPE_LABELS: Record<string, string> = {
  like: "liked your event log",
  comment: "commented on your event log",
  follow: "started following you",
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
  if (n.type === "follow" || n.type === "follow_request_approved") {
    return n.actor ? `/user/${n.actor.username}` : null;
  }
  if (n.type === "like" || n.type === "comment" || n.type === "companion_tag") {
    return n.target_id ? `/event/${n.target_id}` : null;
  }
  return null;
}

export default function NotificationList({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="px-4 py-16 text-center">
        <div className="text-4xl mb-3">🔔</div>
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
        const icon = TYPE_ICONS[n.type] || "🔔";
        const link = getNotificationLink(n);

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
                  <img
                    src={n.actor.avatar_url}
                    alt={n.actor.display_name || n.actor.username}
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
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center bg-bg-elevated text-lg">
                {icon}
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
