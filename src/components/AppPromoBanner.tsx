"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/native/photoScan";

const APP_STORE_URL = "https://apps.apple.com/app/id6781299327";
const DISMISS_KEY = "boxd:getapp:dismissed";

/**
 * Persistent, dismissible nudge shown to WEB users only (self-hides in the app
 * via isNativeApp). The photo finder is iOS-only, so this keeps the signature
 * feature in front of web users who skipped it at onboarding or signed up
 * directly on the site. Hidden on the immersive onboarding/log flows.
 */
export default function AppPromoBanner() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isNativeApp()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch {
      // localStorage unavailable — still show.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
  }, []);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!show) return null;
  // Stay out of the way on full-screen flows.
  if (pathname.startsWith("/onboarding") || pathname.startsWith("/log")) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 pt-3">
      <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/[0.06] px-4 py-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
          <path d="M13 5v2" /><path d="M13 11v2" /><path d="M13 17v2" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-text-primary font-medium">Find every game you&apos;ve been to</div>
          <div className="text-xs text-text-muted">The photo finder auto-logs your past games. Only in the iPhone app.</div>
        </div>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-bg active:opacity-70 transition-opacity"
        >
          Get the app
        </a>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>
    </div>
  );
}
