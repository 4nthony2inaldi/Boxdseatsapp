"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchEventComments, type EventComment } from "@/lib/queries/event";
import { useSwipeDismiss } from "@/lib/useSwipeDismiss";
import CommentsSection from "./CommentsSection";

type Props = {
  /** The event log whose comment thread to show. */
  eventLogId: string;
  /** The signed-in viewer (comment author). */
  userId: string;
  onClose: () => void;
  /** Fires with the thread's new total when a comment is posted or deleted. */
  onCountChange?: (count: number) => void;
};

// Instagram-style bottom sheet for a log's comments — slides up over the
// current screen instead of navigating away, so feed scroll is preserved.
export default function CommentSheet({
  eventLogId,
  userId,
  onClose,
  onCountChange,
}: Props) {
  const [comments, setComments] = useState<EventComment[] | null>(null);
  const [logOwnerId, setLogOwnerId] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [visible, setVisible] = useState(false);

  // Slide in after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    // Let the slide-down transition finish before unmounting.
    setTimeout(onClose, 200);
  };

  // Swipe the handle/header down to dismiss.
  const { offset, dragging, handleProps } = useSwipeDismiss(handleClose);

  // Escape to close.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the log owner (for delete permissions) and load the thread.
  useEffect(() => {
    let active = true;
    const supabase = createClient();
    (async () => {
      try {
        const [{ data: log }, fetched] = await Promise.all([
          supabase
            .from("event_logs")
            .select("user_id")
            .eq("id", eventLogId)
            .maybeSingle(),
          fetchEventComments(supabase, eventLogId),
        ]);
        if (!active) return;
        setLogOwnerId(log?.user_id ?? "");
        setComments(fetched);
      } catch {
        if (!active) return;
        setLoadError(true);
        setComments([]);
      }
    })();
    return () => {
      active = false;
    };
  }, [eventLogId]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Comments"
        className="relative bg-bg-elevated rounded-t-2xl border-t border-border h-[80vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
        style={{
          transform: visible ? `translateY(${offset}px)` : "translateY(100%)",
          transition: dragging ? "none" : "transform 200ms",
        }}
      >
        {/* Drag handle + header — swipe down or tap to close */}
        <div className="shrink-0 pt-2 pb-3 px-4 border-b border-border" {...handleProps}>
          <button
            onClick={handleClose}
            aria-label="Close comments"
            className="block mx-auto w-10 h-1.5 rounded-full bg-border mb-3 cursor-pointer border-none"
          />
          <div className="text-center font-display text-sm tracking-wider text-text-primary uppercase">
            Comments
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 px-4 py-4">
          {loadError ? (
            <div className="text-center text-text-muted text-sm py-8">
              Couldn&apos;t load comments. Please try again.
            </div>
          ) : comments === null ? (
            <div className="text-center text-text-muted text-sm py-8">
              Loading…
            </div>
          ) : (
            <CommentsSection
              eventLogId={eventLogId}
              userId={userId}
              logOwnerId={logOwnerId}
              initialComments={comments}
              onCountChange={onCountChange}
              stickyInput
            />
          )}
        </div>
      </div>
    </div>
  );
}
