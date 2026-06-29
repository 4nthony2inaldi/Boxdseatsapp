/**
 * Common fan nicknames / acronyms that don't appear in any DB column, mapped to
 * a substring of the canonical name so search can find them. Keyed by the whole
 * (normalized) query — "sixers" resolves, "the sixers fan" doesn't, which keeps
 * matching tight and avoids surprise results.
 *
 * This is a deliberately small, hand-curated bridge for the well-known cases.
 * The durable fix (once DB writes are available here) is a team nickname column
 * / team_aliases table plus pg_trgm fuzzy matching; this map covers the long
 * tail of nicknames in the meantime and stays useful even after that lands.
 *
 * Each value just needs to be an ilike substring of the real name. Official
 * abbreviations (UNC, BOS, LAL, …) are NOT listed here — team search already
 * matches the `abbreviation` column directly.
 */
const SEARCH_ALIASES: Record<string, string> = {
  // NBA
  sixers: "76ers",
  dubs: "warriors",
  cavs: "cavaliers",
  mavs: "mavericks",
  wolves: "timberwolves",
  "t-wolves": "timberwolves",
  twolves: "timberwolves",
  blazers: "trail blazers",
  // NFL
  niners: "49ers",
  "9ers": "49ers",
  bucs: "buccaneers",
  jags: "jaguars",
  fins: "dolphins",
  pats: "patriots",
  // MLB
  jays: "blue jays",
  bluejays: "blue jays",
  stros: "astros",
  nats: "nationals",
  dbacks: "diamondbacks",
  "d-backs": "diamondbacks",
  halos: "angels",
  // NHL
  habs: "canadiens",
  leafs: "maple leafs",
  preds: "predators",
  canes: "hurricanes",
  caps: "capitals",
  nucks: "canucks",
  sens: "senators",
  bolts: "lightning",
  jackets: "blue jackets",
  knights: "golden knights",
  // College
  unc: "north carolina",
  uconn: "connecticut",
  cuse: "syracuse",
  bama: "alabama",
  nova: "villanova",
  zona: "arizona",
  pitt: "pittsburgh",
  uk: "kentucky",
  gtown: "georgetown",
  // Soccer
  "man u": "manchester united",
  "man utd": "manchester united",
  "man city": "manchester city",
  barca: "barcelona",
  gunners: "arsenal",
  juve: "juventus",
  psg: "paris saint-germain",
  // Venues
  msg: "madison square garden",
  "the linc": "lincoln financial",
  "jerry world": "at&t stadium",
  "the big house": "michigan stadium",
  "the shoe": "ohio stadium",
  "the horseshoe": "ohio stadium",
  "the swamp": "ben hill griffin",
  "mile high": "empower field",
};

/** Normalize for alias lookup: strip accents, lowercase, drop a leading "the". */
function aliasKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * The search term plus any nickname expansion. Returns `[raw]` for an ordinary
 * query, or `[raw, canonical]` when the whole query is a known nickname — so the
 * real name is searched too without ever dropping the original match.
 */
export function expandSearchTerms(raw: string): string[] {
  const key = aliasKey(raw);
  const extra = SEARCH_ALIASES[key];
  return extra ? [raw, extra] : [raw];
}
