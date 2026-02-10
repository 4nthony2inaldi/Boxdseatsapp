"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { blockUser, reportContent } from "@/lib/queries/social";

type Props = {
  targetUserId: string;
  currentUserId: string;
  targetUsername: string;
};

export default function UserProfileActions({
  targetUserId,
  currentUserId,
  targetUsername,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const handleBlock = async () => {
    setSubmitting(true);
    const supabase = createClient();
    const result = await blockUser(supabase, currentUserId, targetUserId);
    setSubmitting(false);
    setIsOpen(false);

    if ("error" in result) {
      setMessage(result.error);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) return;
    setSubmitting(true);
    const supabase = createClient();
    const result = await reportContent(
      supabase,
      currentUserId,
      "user",
      targetUserId,
      reportReason
    );
    setSubmitting(false);
    setShowReport(false);
    setIsOpen(false);

    if ("error" in result) {
      setMessage(result.error);
    } else {
      setMessage("Report submitted. Thank you.");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-elevated border border-border cursor-pointer hover:opacity-80 transition-opacity"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="#9BA1B5"
          stroke="none"
        >
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && !showReport && (
        <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border rounded-lg py-1 z-30 min-w-[140px] shadow-lg">
          <button
            onClick={() => {
              setShowReport(true);
            }}
            className="block w-full text-left px-3 py-2 text-xs text-text-secondary hover:bg-bg-input transition-colors"
          >
            Report @{targetUsername}
          </button>
          <button
            onClick={handleBlock}
            disabled={submitting}
            className="block w-full text-left px-3 py-2 text-xs text-loss hover:bg-bg-input transition-colors disabled:opacity-50"
          >
            {submitting ? "Blocking..." : `Block @${targetUsername}`}
          </button>
        </div>
      )}

      {isOpen && showReport && (
        <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border rounded-lg p-3 z-30 min-w-[220px] shadow-lg">
          <div className="text-xs text-text-primary font-medium mb-2">
            Report @{targetUsername}
          </div>
          <textarea
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Why are you reporting this user?"
            rows={3}
            className="w-full bg-bg-input border border-border rounded-lg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowReport(false);
                setReportReason("");
              }}
              className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary cursor-pointer hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={handleReport}
              disabled={submitting || !reportReason.trim()}
              className="flex-1 bg-accent rounded-lg px-3 py-1.5 text-xs text-white font-medium cursor-pointer disabled:opacity-40 hover:opacity-90"
            >
              {submitting ? "..." : "Submit"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border rounded-lg px-3 py-2 z-30 text-xs text-text-secondary shadow-lg whitespace-nowrap">
          {message}
        </div>
      )}
    </div>
  );
}
