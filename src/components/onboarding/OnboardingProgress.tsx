"use client";

export type BigFourProgress = {
  team: { count: number; name: string | null };
  venue: { count: number; name: string | null };
  athlete: { count: number; name: string | null };
  event: { filled: boolean; name: string | null };
};

const CARDS: { key: keyof BigFourProgress; label: string }[] = [
  { key: "team", label: "Team" },
  { key: "venue", label: "Venue" },
  { key: "athlete", label: "Athlete" },
  { key: "event", label: "Event" },
];

/**
 * The four cards a user is assembling, shown as a persistent strip during
 * onboarding. Each fills in quietly (accent border + the headliner's name)
 * as a pick is made — the same Big Four that lands on their profile after.
 */
export default function OnboardingProgress({ progress }: { progress: BigFourProgress }) {
  return (
    <div className="grid grid-cols-4 gap-2 mb-6">
      {CARDS.map(({ key, label }) => {
        const p = progress[key];
        const filled = key === "event" ? (p as BigFourProgress["event"]).filled : (p as { count: number }).count > 0;
        const name = p.name;
        const extra = key !== "event" ? (p as { count: number }).count - 1 : 0;
        return (
          <div
            key={key}
            className="rounded-lg px-1.5 pt-2 pb-1.5 flex flex-col items-center justify-center text-center transition-colors min-h-[58px]"
            style={{
              border: filled ? "1px solid var(--color-accent)" : "1px dashed var(--color-border)",
              background: filled ? "rgba(212,135,44,0.08)" : "transparent",
            }}
          >
            <div
              className="font-display text-[9px] tracking-[1px] uppercase mb-0.5"
              style={{ color: filled ? "var(--color-accent)" : "var(--color-text-muted)" }}
            >
              {label}
            </div>
            {filled ? (
              <div className="text-[11px] text-text-primary font-medium leading-tight line-clamp-2">
                {name || "Added"}
                {extra > 0 && <span className="text-text-muted"> +{extra}</span>}
              </div>
            ) : (
              <div className="text-text-muted text-base leading-none">+</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
