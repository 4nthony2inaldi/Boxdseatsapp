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
  "eng.1": "soccer",
  "esp.1": "soccer",
  "ger.1": "soccer",
  "ita.1": "soccer",
  "fra.1": "soccer",
  "fifa.world": "soccer",
  ncaam: "basketball",
  ncaaw: "basketball",
  ncaaf: "football",
  "pga-tour": "golf",
  pga: "golf",
  atp: "tennis",
  wta: "tennis",
  "nascar-cup": "motorsports",
  "nascar-xfinity": "motorsports",
  "nascar-truck": "motorsports",
  indycar: "motorsports",
  f1: "motorsports",
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
