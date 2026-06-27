"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native/photoScan";

/**
 * Nudge on your own profile: you have logged games with no photo — scan your
 * camera roll to backfill them. Native-only (the scan needs the device) and
 * only when there's something to backfill.
 */
export default function BackfillPhotosPrompt({ count }: { count: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isNativeApp() && count > 0) setShow(true);
  }, [count]);

  if (!show) return null;

  return (
    <Link
      href="/log/backfill"
      className="mx-4 mb-4 flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 active:opacity-70 transition-opacity"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary font-medium">Add photos to your games</div>
        <div className="text-xs text-text-muted">
          {count} logged {count === 1 ? "game has" : "games have"} no photo — match them from your camera roll.
        </div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
