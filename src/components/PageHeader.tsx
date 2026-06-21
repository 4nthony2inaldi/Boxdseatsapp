"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

/**
 * Go back to the previous screen, falling back to a fixed href when there's no
 * history (a fresh deep-link or refresh). Matches the detail-page BackButton —
 * so a header reached from many places (e.g. notifications, opened from the
 * bell on any screen) returns you where you came from instead of a hardcoded
 * destination. `href` is the fallback.
 */
function useGoBack(href: string) {
  const router = useRouter();
  return () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push(href);
  };
}

/**
 * The slim back chevron used in sub-page headers. Icon-only, so it carries an
 * aria-label. `className` defaults to the app's standard back padding; pass your
 * own to match a header that used a different one.
 */
export function BackLink({
  href,
  label = "Back",
  className = "p-1 hover:opacity-80 transition-opacity",
}: {
  href: string;
  label?: string;
  className?: string;
}) {
  const goBack = useGoBack(href);
  return (
    <button type="button" onClick={goBack} aria-label={label} className={`${className} cursor-pointer`}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

/**
 * Circular back affordance (filled chip) used by the larger section headers
 * (timeline, venues, lists, …). Visually matches the detail-page BackButton.
 * Icon-only, so it carries an aria-label.
 */
export function BackLinkCircle({ href, label = "Back" }: { href: string; label?: string }) {
  const goBack = useGoBack(href);
  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className="flex items-center justify-center w-11 h-11 rounded-full bg-bg-elevated hover:opacity-80 transition-opacity cursor-pointer"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
  );
}

/**
 * Standard sub-page header bar: a back chevron, a title, and an optional
 * right-aligned action. Replaces the markup that was hand-copied across ~20
 * screens (and adds the missing back-button aria-label everywhere).
 */
export default function PageHeader({
  title,
  backHref,
  backLabel,
  backClassName,
  right,
}: {
  title: ReactNode;
  backHref: string;
  backLabel?: string;
  backClassName?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
      <BackLink href={backHref} label={backLabel} className={backClassName} />
      <h1 className="font-display text-lg text-text-primary tracking-wide">{title}</h1>
      {right ? <div className="ml-auto flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
