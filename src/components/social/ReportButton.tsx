"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { reportContent } from "@/lib/queries/social";

type Props = {
  targetType: "comment" | "event_log";
  targetId: string;
  reporterId: string;
  /** What the user is reporting, for the prompt copy (e.g. "comment", "photo"). */
  label?: string;
  className?: string;
};

/**
 * A small "Report" affordance for a single piece of user content (a comment, a
 * logged photo, etc.). Opens an inline reason box and files a report via
 * reportContent. Apple Guideline 1.2 wants per-content reporting, not just
 * user-level blocking.
 */
export default function ReportButton({ targetType, targetId, reporterId, label = "content", className }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const submit = async () => {
    setBusy(true);
    const result = await reportContent(createClient(), reporterId, targetType, targetId, reason);
    setBusy(false);
    if (!("error" in result)) {
      setDone(true);
      setOpen(false);
      setTimeout(() => setDone(false), 3000);
    }
  };

  if (done) {
    return <span className={`text-[10px] text-text-muted ${className ?? ""}`}>Reported. Thank you.</span>;
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Report ${label}`}
        className={`text-[10px] text-text-muted hover:text-loss transition-colors bg-transparent border-none cursor-pointer ${className ?? ""}`}
      >
        Report
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 w-56 bg-bg-elevated border border-border rounded-lg p-3 shadow-lg">
          <div className="text-xs text-text-primary font-medium mb-2">Report this {label}</div>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What's wrong with it? (optional)"
            rows={3}
            className="w-full bg-bg-input border border-border rounded-lg px-2.5 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none mb-2"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(false)}
              className="flex-1 bg-bg-input border border-border rounded-lg px-3 py-1.5 text-xs text-text-secondary cursor-pointer hover:opacity-80"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="flex-1 bg-accent rounded-lg px-3 py-1.5 text-xs text-bg font-medium cursor-pointer disabled:opacity-40 hover:opacity-90"
            >
              {busy ? "..." : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
