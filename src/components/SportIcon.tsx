import Image from "next/image";
import { getSportIconPath, getLeagueIconPath } from "@/lib/sportIcons";

type SportIconProps = {
  /** Sport name (e.g. "basketball", "football") */
  sport?: string | null;
  /** League slug (e.g. "nfl", "nba") — used if sport is not provided */
  league?: string | null;
  /** Icon path override (e.g. "/basketball.svg") */
  src?: string | null;
  /** Size in pixels (width and height) */
  size?: number;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Renders a sport SVG logo icon.
 * Accepts a sport name, league slug, or direct src path.
 * Falls back to a generic stadium icon if no matching SVG exists.
 */
export default function SportIcon({
  sport,
  league,
  src,
  size = 20,
  className = "",
}: SportIconProps) {
  const iconPath = src || getSportIconPath(sport) || getLeagueIconPath(league);

  if (!iconPath) {
    // Fallback: generic stadium icon
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M2 12c0-4 4.5-7 10-7s10 3 10 7-4.5 7-10 7-10-3-10-7Z" />
        <path d="M2 12c0 4 4.5 7 10 7s10-3 10-7" />
        <path d="M12 5v14" />
        <path d="M5.5 8.5c1.5 1.5 4 2.5 6.5 2.5s5-1 6.5-2.5" />
      </svg>
    );
  }

  return (
    <Image
      src={iconPath}
      alt=""
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}
