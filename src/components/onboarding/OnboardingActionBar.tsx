"use client";

/**
 * The onboarding step's action area (prompt + Back/Next), pinned to the bottom
 * of the viewport on every step so it's always reachable and consistent —
 * regardless of how short or long the step's content is. The bottom nav is
 * hidden during onboarding, so this owns the bottom edge.
 */
export default function OnboardingActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-bg border-t border-border">
      <div className="max-w-lg mx-auto px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {children}
      </div>
    </div>
  );
}
