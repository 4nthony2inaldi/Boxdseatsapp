// BoxdSeats Brand Tokens — from brand guide
export const colors = {
  // Background system
  bg: "#0D0F14",
  bgCard: "#161920",
  bgElevated: "#1C1F2A",
  bgInput: "#232735",

  // Primary accent (basketball orange)
  accent: "#D4872C",
  accentHover: "#E8A44E",
  accentSubtle: "rgba(212, 135, 44, 0.15)",

  // Logo-derived
  basketball: "#D4872C",
  baseball: "#F0EBE0",
  baseballStitch: "#C83C2C",
  football: "#7B5B3A",

  // Text
  textPrimary: "#F0EBE0",
  textSecondary: "#9BA1B5",
  textMuted: "#5A5F72",

  // Borders
  border: "#2A2D3A",
  borderLight: "rgba(240, 235, 224, 0.15)",

  // Semantic
  win: "#3CB878",
  loss: "#C83C2C",
  draw: "#9BA1B5",
  error: "#C83C2C",
  success: "#3CB878",
} as const;

export const LEAGUES = {
  NFL: { slug: "nfl", color: "#013369", icon: "/football.svg", sport: "football" },
  NBA: { slug: "nba", color: "#1D428A", icon: "/basketball.svg", sport: "basketball" },
  WNBA: { slug: "wnba", color: "#FF6900", icon: "/basketball.svg", sport: "basketball" },
  MLB: { slug: "mlb", color: "#002D72", icon: "/baseball.svg", sport: "baseball" },
  NHL: { slug: "nhl", color: "#000000", icon: "/hockey.svg", sport: "hockey" },
  MLS: { slug: "mls", color: "#5B2C82", icon: "/soccer.svg", sport: "soccer" },
  NWSL: { slug: "nwsl", color: "#1A2A5E", icon: "/soccer.svg", sport: "soccer" },
  EPL: { slug: "eng.1", color: "#3D195B", icon: "/soccer.svg", sport: "soccer" },
  LALIGA: { slug: "esp.1", color: "#E30613", icon: "/soccer.svg", sport: "soccer" },
  BUNDESLIGA: { slug: "ger.1", color: "#D20515", icon: "/soccer.svg", sport: "soccer" },
  SERIEA: { slug: "ita.1", color: "#0066A0", icon: "/soccer.svg", sport: "soccer" },
  LIGUE1: { slug: "fra.1", color: "#091C3E", icon: "/soccer.svg", sport: "soccer" },
  LIGAMX: { slug: "mex.1", color: "#00853F", icon: "/soccer.svg", sport: "soccer" },
  WORLDCUP: { slug: "fifa.world", color: "#3A206B", icon: "/soccer.svg", sport: "soccer" },
  EUROS: { slug: "uefa.euro", color: "#0E1E5B", icon: "/soccer.svg", sport: "soccer" },
  // UEFA club + nations competitions (same clubs/venues as the domestic leagues).
  UCL: { slug: "uefa.champions", color: "#1B1F71", icon: "/soccer.svg", sport: "soccer" },
  UEL: { slug: "uefa.europa", color: "#FF6900", icon: "/soccer.svg", sport: "soccer" },
  UECL: { slug: "uefa.europa.conf", color: "#00B16A", icon: "/soccer.svg", sport: "soccer" },
  NATIONSLEAGUE: { slug: "uefa.nations", color: "#0B1F66", icon: "/soccer.svg", sport: "soccer" },
  // Domestic cups.
  FACUP: { slug: "eng.fa", color: "#C8102E", icon: "/soccer.svg", sport: "soccer" },
  EFLCUP: { slug: "eng.league_cup", color: "#1D1D1B", icon: "/soccer.svg", sport: "soccer" },
  COPADELREY: { slug: "esp.copa_del_rey", color: "#C60B1E", icon: "/soccer.svg", sport: "soccer" },
  COPPAITALIA: { slug: "ita.coppa_italia", color: "#0066A0", icon: "/soccer.svg", sport: "soccer" },
  DFBPOKAL: { slug: "ger.dfb_pokal", color: "#D20515", icon: "/soccer.svg", sport: "soccer" },
  COUPEDEFRANCE: { slug: "fra.coupe_de_france", color: "#002395", icon: "/soccer.svg", sport: "soccer" },
  // More domestic leagues with stable home grounds.
  CHAMPIONSHIP: { slug: "eng.2", color: "#1B458F", icon: "/soccer.svg", sport: "soccer" },
  PRIMEIRALIGA: { slug: "por.1", color: "#006847", icon: "/soccer.svg", sport: "soccer" },
  EREDIVISIE: { slug: "ned.1", color: "#FF6600", icon: "/soccer.svg", sport: "soccer" },
  SCOTTISH: { slug: "sco.1", color: "#18457B", icon: "/soccer.svg", sport: "soccer" },
  // North America (alongside MLS + Liga MX).
  LEAGUESCUP: { slug: "concacaf.leagues.cup", color: "#6CACE4", icon: "/soccer.svg", sport: "soccer" },
  CONCACAFCL: { slug: "concacaf.champions", color: "#C8102E", icon: "/soccer.svg", sport: "soccer" },
  // International + South American tournaments.
  COPAAMERICA: { slug: "conmebol.america", color: "#2E9DF7", icon: "/soccer.svg", sport: "soccer" },
  GOLDCUP: { slug: "concacaf.gold", color: "#C5A572", icon: "/soccer.svg", sport: "soccer" },
  LIBERTADORES: { slug: "conmebol.libertadores", color: "#00843D", icon: "/soccer.svg", sport: "soccer" },
  CLUBWORLDCUP: { slug: "fifa.cwc", color: "#1B1F71", icon: "/soccer.svg", sport: "soccer" },
  NCAAF: { slug: "ncaaf", color: "#0C2340", icon: "/football.svg", sport: "football" },
  NCAAM: { slug: "ncaam", color: "#0C2340", icon: "/basketball.svg", sport: "basketball" },
  NCAAW: { slug: "ncaaw", color: "#0C2340", icon: "/basketball.svg", sport: "basketball" },
  PGA: { slug: "pga-tour", color: "#003B2F", icon: "/golf.svg", sport: "golf" },
  ATP: { slug: "atp", color: "#1565C0", icon: "/tennis.svg", sport: "tennis" },
  WTA: { slug: "wta", color: "#5C2D91", icon: "/tennis.svg", sport: "tennis" },
  NASCAR: { slug: "nascar-cup", color: "#E4A11B", icon: "/motorsports.svg", sport: "motorsports" },
  XFINITY: { slug: "nascar-xfinity", color: "#9E1B32", icon: "/motorsports.svg", sport: "motorsports" },
  TRUCKS: { slug: "nascar-truck", color: "#B5121B", icon: "/motorsports.svg", sport: "motorsports" },
  INDYCAR: { slug: "indycar", color: "#C8102E", icon: "/motorsports.svg", sport: "motorsports" },
  F1: { slug: "f1", color: "#E10600", icon: "/motorsports.svg", sport: "motorsports" },
  IMSA: { slug: "imsa", color: "#E4002B", icon: "/motorsports.svg", sport: "motorsports" },
  UFC: { slug: "ufc", color: "#D20A0A", icon: "/mma.svg", sport: "mma" },
  HORSERACING: { slug: "horse-racing", color: "#5B3A1E", icon: "/horse-racing.svg", sport: "horse_racing" },
  AFL: { slug: "afl", color: "#003DA5", icon: "/football.svg", sport: "australian_football" },
} as const;

export type LeagueKey = keyof typeof LEAGUES;

/** Display label (e.g. "NASCAR") for a database slug (e.g. "nascar-cup"). */
export function leagueLabelFromSlug(
  slug: string | null | undefined
): string | null {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  for (const [label, entry] of Object.entries(LEAGUES)) {
    if (entry.slug === lower) return label;
  }
  return slug;
}

/** Look up league display config by its database slug (e.g. "pga-tour"). */
export function leagueFromSlug(
  slug: string | null | undefined
): (typeof LEAGUES)[LeagueKey] | null {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  for (const entry of Object.values(LEAGUES)) {
    if (entry.slug === lower) return entry;
  }
  return null;
}
