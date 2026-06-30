"use client";

import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { postComment, postEventComment, deleteComment, type EventComment } from "@/lib/queries/event";
import { formatRelative } from "@/lib/formatters";
import ReportButton from "@/components/social/ReportButton";

type Props = {
  /** Per-log thread. Provide exactly one of eventLogId or eventId. */
  eventLogId?: string;
  /** Event-level discussion room (the shared per-game thread). */
  eventId?: string;
  userId: string;
  /** Log owner can moderate their log's thread (per-log mode only). */
  logOwnerId?: string;
  initialComments: EventComment[];
  /** Fires with the new total whenever a comment is posted or deleted. */
  onCountChange?: (count: number) => void;
  /** Sheet layout: list scrolls, input pinned to the bottom. */
  stickyInput?: boolean;
};

export default function CommentsSection({ eventLogId, eventId, userId, logOwnerId, initialComments, onCountChange, stickyInput }: Props) {
  const [comments, setComments] = useState<EventComment[]>(initialComments);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePost = async () => {
    // Guard re-entry: the button is disabled while posting, but the Enter-key
    // path isn't, so without this a fast/repeated Enter posts duplicates.
    if (posting || !body.trim()) return;
    const trimmed = body.trim();
    setPosting(true);
    setError(null);

    const supabase = createClient();
    const result = eventId
      ? await postEventComment(supabase, userId, eventId, body)
      : await postComment(supabase, userId, eventLogId!, body);

    if ("error" in result) {
      setError(result.error);
      setPosting(false);
      return;
    }

    // Fetch updated comments to get the full data
    const { data, error: fetchError } = await supabase
      .from("comments")
      .select("id, user_id, body, created_at, event_log_id, event_id")
      .eq(eventId ? "event_id" : "event_log_id", eventId ?? eventLogId!)
      .order("created_at", { ascending: true });

    if (fetchError || !data) {
      // The insert succeeded but the refetch failed: append the new comment
      // optimistically so it isn't lost, reusing the author's profile from an
      // existing comment in the thread when available.
      const mine = comments.find((c) => c.user_id === userId);
      setComments((prev) => {
        const next = [
          ...prev,
          {
            id: result.id,
            user_id: userId,
            username: mine?.username || "you",
            display_name: mine?.display_name ?? null,
            avatar_url: mine?.avatar_url ?? null,
            body: trimmed,
            created_at: new Date().toISOString(),
            event_log_id: eventLogId ?? null,
            event_id: eventId ?? null,
          },
        ];
        onCountChange?.(next.length);
        return next;
      });
      setBody("");
      setPosting(false);
      return;
    }

    {
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
            event_id: c.event_id,
          };
        })
      );
      onCountChange?.(data.length);
    }

    setBody("");
    setPosting(false);
  };

  const handleDelete = async (commentId: string) => {
    // Optimistic removal, reverted if the delete is rejected (e.g. RLS denies it).
    const prevComments = comments;
    setComments((prev) => {
      const next = prev.filter((c) => c.id !== commentId);
      onCountChange?.(next.length);
      return next;
    });

    const supabase = createClient();
    // Event-room comments have no "log owner" — only the author can delete.
    const result = await deleteComment(supabase, commentId, userId, eventId ? undefined : logOwnerId);

    if ("error" in result) {
      setComments(prevComments);
      onCountChange?.(prevComments.length);
      setError(result.error);
    }
  };

  const commentItems = (
    <>
      {comments.map((comment) => (
            <div
              key={comment.id}
              className="bg-bg-card rounded-xl border border-border px-4 py-3"
            >
              <div className="flex items-start gap-2.5">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full shrink-0 overflow-hidden mt-0.5">
                  {comment.avatar_url ? (
                    <Image
                      src={comment.avatar_url}
                      alt={comment.username}
                      width={28}
                      height={28}
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
                    <span className="text-xs text-text-primary font-medium truncate min-w-0">
                      {comment.display_name || comment.username}
                    </span>
                    <span className="text-[10px] text-text-muted shrink-0">
                      {formatRelative(comment.created_at)}
                    </span>
                    <span className="ml-auto flex items-center gap-3">
                      {comment.user_id !== userId && (
                        <ReportButton targetType="comment" targetId={comment.id} reporterId={userId} label="comment" />
                      )}
                      {(comment.user_id === userId || (!eventId && logOwnerId === userId)) && (
                        <button
                          onClick={() => handleDelete(comment.id)}
                          aria-label="Delete comment"
                          className="text-[10px] text-text-muted hover:text-loss transition-colors bg-transparent border-none cursor-pointer p-2.5 -m-2.5"
                        >
                          Delete
                        </button>
                      )}
                    </span>
                  </div>
                  <div className="text-[13px] text-text-secondary leading-relaxed mt-0.5">
                    {comment.body}
                  </div>
                </div>
              </div>
            </div>
          ))}
    </>
  );

  const emptyState = (
    <div className="text-xs text-text-muted text-center mt-3">
      No comments yet. Be the first!
    </div>
  );

  const inputRow = (
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
        aria-label="Add a comment"
        className="flex-1 bg-bg-input rounded-lg border border-border px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
      />
      <button
        onClick={handlePost}
        disabled={posting || !body.trim()}
        className="bg-accent rounded-lg px-4 py-2.5 text-sm text-bg font-display tracking-wider uppercase disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer disabled:cursor-not-allowed"
      >
        {posting ? "..." : "Post"}
      </button>
    </div>
  );

  const errorEl = error ? <div className="text-xs text-loss mt-2">{error}</div> : null;

  // Sheet layout: scrollable list above a pinned input.
  if (stickyInput) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0 space-y-3">
          {comments.length > 0 ? commentItems : emptyState}
        </div>
        <div className="shrink-0 pt-3 mt-3 border-t border-border">
          {inputRow}
          {errorEl}
        </div>
      </div>
    );
  }

  return (
    <div>
      {comments.length > 0 && (
        <div className="space-y-3 mb-4">{commentItems}</div>
      )}
      {inputRow}
      {errorEl}
      {comments.length === 0 && !error && emptyState}
    </div>
  );
}
