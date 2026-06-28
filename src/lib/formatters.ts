/**
 * Shared display formatters.
 *
 * These are pure helpers used by display components. They intentionally
 * replicate the inline formatting that previously lived in each component so
 * output is byte-for-byte identical.
 */

/**
 * Formats a date-only string (e.g. "2024-03-15") as a localized date.
 *
 * The input is anchored to local midnight ("T00:00:00") so a date-only value
 * doesn't shift across timezones. Defaults to the common
 * `{ month: "short", day: "numeric", year: "numeric" }` format.
 */
export function formatDate(
  dateStr: string,
  opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", opts);
}

/**
 * "1 game" / "3 games" — a count with its singular/plural noun.
 */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Initials for an avatar/placeholder when there's no image (e.g. an athlete with
 * no headshot). First + last initial, or first two letters of a single name.
 */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The shared fan-stats phrase used on the profile + passport share surfaces:
 * "X games at X venues in X cities". Kept in one place so the owner profile,
 * public profile, and passport stay in sync.
 */
export function fanStatsLine(games: number, venues: number, cities: number): string {
  return `${plural(games, "game", "games")} at ${plural(venues, "venue", "venues")} in ${plural(cities, "city", "cities")}`;
}

/**
 * Formats a date-only string as the compact `M/D/YY` style (no leading zeros,
 * 2-digit year), matching the CompareView inline format.
 */
export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return `${date.getMonth() + 1}/${date.getDate()}/${String(
    date.getFullYear()
  ).slice(2)}`;
}

/**
 * Formats a relative "x ago" timestamp from an ISO datetime string, falling
 * back to a short calendar date for anything a week or older. Matches the
 * inline `formatTime` used in the comments UI.
 */
export function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
