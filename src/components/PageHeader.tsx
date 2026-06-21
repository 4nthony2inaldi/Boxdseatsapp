import type { ReactNode } from "react";
import Link from "next/link";

/**
 * The slim back chevron used in sub-page headers. Icon-only, so it carries an
 * aria-label for screen readers. `className` defaults to the app's standard
 * back-link padding; pass your own to match a header that used a different one.
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
  return (
    <Link href={href} aria-label={label} className={className}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </Link>
  );
}

/**
 * Circular back affordance (filled chip) used by the larger section headers
 * (timeline, venues, lists, …). Visually matches the detail-page BackButton but
 * navigates to a fixed href. Icon-only, so it carries an aria-label.
 */
export function BackLinkCircle({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-elevated hover:opacity-80 transition-opacity"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </Link>
  );
}

/**
 * Standard sub-page header bar: a back chevron, a title, and an optional
 * right-aligned action. Replaces the same markup that was hand-copied across
 * ~20 screens (and adds the missing back-button aria-label everywhere).
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
