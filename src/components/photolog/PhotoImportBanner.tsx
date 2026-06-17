"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native/photoScan";

/**
 * Entry point to photo-based game discovery, shown at the start of the log
 * flow. Native-app only (photo scanning needs the on-device library), so it
 * self-hides on the web.
 */
export default function PhotoImportBanner({ className = "" }: { className?: string }) {
  const [native, setNative] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isNativeApp()) setNative(true);
  }, []);

  if (!native) return null;

  return (
    <Link
      href="/log/photos"
      className={`flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3 active:opacity-70 transition-opacity ${className}`}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
        <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
      </svg>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary font-medium">Log from your photos</div>
        <div className="text-xs text-text-muted">Find the games you&apos;ve been to automatically.</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}
