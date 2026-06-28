import Image from "next/image";
import type { BigFourItem } from "@/lib/queries/profile";

type BigFourCardProps = {
  item: BigFourItem;
  /** Owners see empty slots as "add" prompts; visitors see a quiet placeholder. */
  isOwner?: boolean;
};

const categoryColors: Record<string, string> = {
  team: "#002D72",
  venue: "#D4872C",
  athlete: "#7B5B3A",
  event: "#8B0000",
};

export default function BigFourCard({ item, isOwner = false }: BigFourCardProps) {
  const color = categoryColors[item.category] || "#D4872C";

  // Empty slot. Both variants mirror the filled card's shell (110px media area
  // + label area) so the row stays the same height. No "Not set" copy.
  if (item.empty) {
    if (isOwner) {
      // Venue + event are the slots the scan-first onboarding leaves for you to
      // pick from your own history, so glow them to invite the tap. Team +
      // athlete are picked during onboarding, so an empty one is just "Add".
      const glow = item.category === "event" || item.category === "venue";
      return (
        <div
          className={`flex-1 min-w-0 rounded-xl overflow-hidden bg-bg-card border border-dashed flex flex-col ${
            glow ? "border-accent bigfour-glow" : "border-accent/40 hover:border-accent/80 transition-colors"
          }`}
        >
          <div className="h-[110px] flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-accent/15 flex items-center justify-center">
              <span className="text-accent text-xl leading-none">+</span>
            </div>
          </div>
          <div className="px-1.5 pb-2.5 pt-2 text-center">
            <div className="font-display text-[10px] text-text-muted tracking-[1.5px] uppercase mb-0.5">
              {item.category}
            </div>
            <div className="text-[11px] text-accent font-semibold leading-tight">
              {glow ? "Choose" : "Add"}
            </div>
            {/* Spacer matching the filled card's subtitle line so empty slots
                stay the same height as their neighbors. */}
            <div className="text-[10px] mt-0.5 leading-tight" aria-hidden>&nbsp;</div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex-1 min-w-0 rounded-xl overflow-hidden bg-bg-card border border-border flex flex-col opacity-50">
        <div className="h-[110px] flex items-center justify-center">
          <span className="text-text-muted text-2xl leading-none">&mdash;</span>
        </div>
        <div className="px-1.5 pb-2.5 pt-2 text-center">
          <div className="font-display text-[10px] text-text-muted tracking-[1.5px] uppercase">
            {item.category}
          </div>
          {/* Spacers matching a filled card's name + subtitle rows, so a visitor's
              empty slot stays the same height as filled neighbors in the row. */}
          <div className="text-[11px] leading-tight" aria-hidden>&nbsp;</div>
          <div className="text-[10px] mt-0.5 leading-tight" aria-hidden>&nbsp;</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 rounded-xl overflow-hidden bg-bg-card border border-border flex flex-col">
      {/* Image area */}
      <div className="h-[110px] relative overflow-hidden">
        <div
          className="w-full h-full"
          style={{
            background: `linear-gradient(160deg, ${color}55, var(--color-bg-elevated))`,
          }}
        />
        {item.image_url &&
          (item.category === "team" ? (
            // Logos sit on the gradient with padding rather than cropping
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <Image
                src={item.image_url}
                alt={item.name}
                width={80}
                height={80}
                className="max-h-full w-auto object-contain drop-shadow-lg"
              />
            </div>
          ) : (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="120px"
              className="object-cover"
            />
          ))}
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
        <div className="font-display text-[10px] text-text-muted tracking-[1.5px] uppercase mb-0.5">
          {item.category}
        </div>
        <div className="text-[11px] text-text-primary font-semibold leading-tight truncate">
          {item.name}
        </div>
        {item.subtitle && (
          <div className="text-[10px] text-text-muted mt-0.5 truncate">
            {item.subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
