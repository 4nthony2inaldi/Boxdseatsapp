/**
 * Centralized sport icon mapping.
 * Maps sport names to their SVG logo paths in /public.
 */

const SPORT_ICON_MAP: Record<string, string> = {
  baseball: "/baseball.svg",
  basketball: "/basketball.svg",
  football: "/football.svg",
  golf: "/golf.svg",
  hockey: "/hockey.svg",
  motorsports: "/motorsports.svg",
  soccer: "/soccer.svg",
  tennis: "/tennis.svg",
};

/** League slug → sport name mapping */
const LEAGUE_SPORT_MAP: Record<string, string> = {
  nfl: "football",
  nba: "basketball",
  mlb: "baseball",
  nhl: "hockey",
  mls: "soccer",
  "pga-tour": "golf",
  pga: "golf",
};

/**
 * Get the SVG icon path for a sport name.
 * Returns null if no icon is available.
 */
export function getSportIconPath(sport: string | null | undefined): string | null {
  if (!sport) return null;
  return SPORT_ICON_MAP[sport] || null;
}

/**
 * Get the SVG icon path for a league slug.
 * Returns null if no icon is available.
 */
export function getLeagueIconPath(leagueSlug: string | null | undefined): string | null {
  if (!leagueSlug) return null;
  const sport = LEAGUE_SPORT_MAP[leagueSlug.toLowerCase()];
  if (!sport) return null;
  return SPORT_ICON_MAP[sport] || null;
}

/** All available sports with their keys, labels, and icon paths */
export const SPORTS_LIST = [
  { key: "basketball", label: "Basketball", icon: "/basketball.svg" },
  { key: "football", label: "Football", icon: "/football.svg" },
  { key: "baseball", label: "Baseball", icon: "/baseball.svg" },
  { key: "hockey", label: "Hockey", icon: "/hockey.svg" },
  { key: "soccer", label: "Soccer", icon: "/soccer.svg" },
  { key: "golf", label: "Golf", icon: "/golf.svg" },
  { key: "tennis", label: "Tennis", icon: "/tennis.svg" },
  { key: "motorsports", label: "Motorsports", icon: "/motorsports.svg" },
] as const;

/** League list with slugs, names, and icon paths */
export const LEAGUES_LIST = [
  { slug: "nfl", name: "NFL", icon: "/football.svg" },
  { slug: "nba", name: "NBA", icon: "/basketball.svg" },
  { slug: "mlb", name: "MLB", icon: "/baseball.svg" },
  { slug: "nhl", name: "NHL", icon: "/hockey.svg" },
  { slug: "mls", name: "MLS", icon: "/soccer.svg" },
  { slug: "pga-tour", name: "PGA Tour", icon: "/golf.svg" },
] as const;
