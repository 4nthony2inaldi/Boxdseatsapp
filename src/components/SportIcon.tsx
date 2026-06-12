import Image from "next/image";
import { getSportIconPath, getLeagueIconPath } from "@/lib/sportIcons";
import { Logo } from "@/components/Logo";

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
    // Fallback: the BoxdSeats mark, not a generic stadium glyph.
    return (
      <span
        className={`inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <Logo size={size * 1.7} />
      </span>
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
