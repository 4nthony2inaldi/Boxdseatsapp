import type { BigFourItem } from "@/lib/queries/profile";

type BigFourCardProps = {
  item: BigFourItem;
};

const categoryColors: Record<string, string> = {
  team: "#002D72",
  venue: "#D4872C",
  athlete: "#7B5B3A",
  event: "#8B0000",
};

export default function BigFourCard({ item }: BigFourCardProps) {
  const color = categoryColors[item.category] || "#D4872C";

  return (
    <div className="flex-1 min-w-0 rounded-xl overflow-hidden bg-bg-card border border-border flex flex-col">
      {/* Image placeholder area */}
      <div className="h-[110px] relative overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            background: `linear-gradient(160deg, ${color}55, var(--color-bg-elevated))`,
          }}
        />
        {/* Gradient fade to card bg */}
        <div
          className="absolute bottom-0 left-0 right-0 h-10"
          style={{
            background:
              "linear-gradient(transparent, var(--color-bg-card))",
          }}
        />
      </div>
      {/* Label + Name */}
      <div className="px-1.5 pb-2.5 pt-2 text-center">
        <div className="font-display text-[9px] text-text-muted tracking-[1.5px] uppercase mb-0.5">
          {item.category}
        </div>
        <div className="text-[11px] text-text-primary font-semibold leading-tight truncate">
          {item.name}
        </div>
        {item.subtitle && (
          <div className="text-[9px] text-text-muted mt-0.5 truncate">
            {item.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
