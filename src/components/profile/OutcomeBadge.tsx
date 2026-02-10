type OutcomeBadgeProps = {
  outcome: string | null;
};

const outcomeConfig: Record<string, { color: string; borderColor: string }> = {
  win: { color: "text-win", borderColor: "border-win/20" },
  loss: { color: "text-loss", borderColor: "border-loss/20" },
  draw: { color: "text-draw", borderColor: "border-draw/20" },
  neutral: { color: "text-text-muted", borderColor: "border-text-muted/20" },
};

export default function OutcomeBadge({ outcome }: OutcomeBadgeProps) {
  if (!outcome) return null;

  const config = outcomeConfig[outcome] || outcomeConfig.neutral;
  const label = outcome === "win" ? "W" : outcome === "loss" ? "L" : outcome === "draw" ? "D" : "";

  if (!label) return null;

  return (
    <span
      className={`font-display text-[13px] tracking-wider px-1.5 py-0.5 border rounded ${config.color} ${config.borderColor}`}
    >
      {label}
    </span>
  );
}
