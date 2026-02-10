"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { postComment, deleteComment, type EventComment } from "@/lib/queries/event";

type Props = {
  eventLogId: string;
  userId: string;
  initialComments: EventComment[];
};

export default function CommentsSection({ eventLogId, userId, initialComments }: Props) {
  const [comments, setComments] = useState<EventComment[]>(initialComments);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    if (!body.trim()) return;
    setPosting(true);
    setError(null);

    const supabase = createClient();
    const result = await postComment(supabase, userId, eventLogId, body);

    if ("error" in result) {
      setError(result.error);
      setPosting(false);
      return;
    }

    // Fetch updated comments to get the full data
    const { data } = await supabase
      .from("comments")
      .select("id, user_id, body, created_at, event_log_id")
      .eq("event_log_id", eventLogId)
      .order("created_at", { ascending: true });

    if (data) {
      const userIds = [...new Set(data.map((d) => d.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, p])
      );

      setComments(
        data.map((c) => {
          const profile = profileMap.get(c.user_id);
          return {
            id: c.id,
            user_id: c.user_id,
            username: profile?.username || "unknown",
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
            body: c.body,
            created_at: c.created_at,
            event_log_id: c.event_log_id,
          };
        })
      );
    }

    setBody("");
    setPosting(false);
  };

  const handleDelete = async (commentId: string) => {
    const supabase = createClient();
    const result = await deleteComment(supabase, commentId, userId);

    if ("error" in result) {
      setError(result.error);
      return;
    }

    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div>
      {/* Existing comments */}
      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-bg-card rounded-xl border border-border px-4 py-3"
            >
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden mt-0.5">
                  {comment.avatar_url ? (
                    <img
                      src={comment.avatar_url}
                      alt={comment.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-display">
                      {(comment.display_name || comment.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-primary font-medium">
                      {comment.display_name || comment.username}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {formatTime(comment.created_at)}
                    </span>
                    {comment.user_id === userId && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="ml-auto text-[10px] text-text-muted hover:text-loss transition-colors bg-transparent border-none cursor-pointer p-0"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="text-[13px] text-text-secondary leading-relaxed mt-0.5">
                    {comment.body}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handlePost();
            }
          }}
          placeholder="Add a comment..."
          className="flex-1 bg-bg-input rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <button
          onClick={handlePost}
          disabled={posting || !body.trim()}
          className="bg-accent rounded-lg px-4 py-2.5 text-sm text-white font-display tracking-wider uppercase disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed"
        >
          {posting ? "..." : "Post"}
        </button>
      </div>

      {error && (
        <div className="text-xs text-loss mt-2">{error}</div>
      )}

      {comments.length === 0 && !error && (
        <div className="text-xs text-text-muted text-center mt-3">
          No comments yet. Be the first!
        </div>
      )}
    </div>
  );
}
