import type { ReactNode } from "react";

/**
 * Small all-caps section/field label (the 11px scale), distinct from the larger
 * SectionLabel (13px). Was hand-copied across the passport, favorites, compare,
 * and onboarding screens. Pass spacing (mb-2/mb-3/px-4) via `className`.
 */
export default function MiniLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`font-display text-[11px] text-text-muted tracking-[1.5px] uppercase ${className}`.trim()}>
      {children}
    </div>
  );
}
