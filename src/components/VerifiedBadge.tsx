"use client";

type VerifiedBadgeProps = {
  size?: "sm" | "md";
};

/**
 * Verified photo badge — camera icon with a subtle accent glow.
 * Shows on photos captured in-app at the event.
 */
export default function VerifiedBadge({ size = "sm" }: VerifiedBadgeProps) {
  const iconSize = size === "sm" ? 12 : 16;
  const padding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1";
  const textSize = size === "sm" ? "text-[9px]" : "text-[11px]";

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${padding} rounded-full bg-accent/15 border border-accent/30`}
      style={{
        boxShadow: "0 0 6px rgba(212, 135, 44, 0.2)",
      }}
      title="Verified — captured at the event"
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D4872C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span className={`${textSize} text-accent font-semibold`}>Verified</span>
    </span>
  );
}
