"use client";

import { useRouter } from "next/navigation";

/**
 * Slim back affordance for detail pages (event/venue/team). Uses history
 * when there is one; falls back to a sensible route for direct loads —
 * installed-PWA users have no browser chrome to lean on.
 */
export default function BackButton({ fallback = "/" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      aria-label="Back"
      className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-elevated border-none cursor-pointer active:opacity-70 transition-opacity"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}
