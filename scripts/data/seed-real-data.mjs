#!/usr/bin/env node
/**
 * seed-real-data.mjs — BoxdSeats real-data seeding pipeline (ESPN public APIs).
 *
 * Populates teams, venues, events, venue_teams from ESPN's public site API for
 * NFL, NBA, MLB, NHL, MLS. Idempotent: events are keyed by external_ids.espn;
 * existing hand-seeded events (no external id) are matched by
 * league + local date + home team + away team and ENRICHED with the ESPN id
 * instead of being duplicated.
 *
 * Usage:
 *   node scripts/data/seed-real-data.mjs \
 *     [--leagues=nfl,nba,mlb,nhl,mls] \
 *     [--from=YYYY-MM-DD] [--to=YYYY-MM-DD] \
 *     [--dry-run]
 *
 * Env:
 *   DATABASE_URL  Postgres connection string (defaults to local test DB).
 *
 * Design notes / documented choices:
 *  - ESPN event `date` is UTC ISO. The events table stores a DATE (the local
 *    calendar date fans remember). We subtract a fixed 5 hours (US Eastern
 *    offset) from the UTC timestamp and take the date. This is exact for all
 *    Eastern/Central venues and correct for Mountain/Pacific venues for any
 *    game starting before ~21:00/19:00 local respectively — i.e. effectively
 *    all real start times. Simpler and more robust than venue-state lookups.
 *  - Only COMPLETED events are inserted (status.type.completed === true).
 *  - Preseason / all-star games are skipped. For the four US leagues that is
 *    season.type 1 (pre) and 4 (off); type 3 ⇒ is_postseason. MLS (soccer)
 *    uses slug-based season types: slug 'regular-season' ⇒ regular, slugs
 *    containing 'preseason'/'all-star'/'friendly' are skipped, everything
 *    else (playoff rounds, mls-cup) ⇒ is_postseason with a humanized
 *    round_or_stage.
 *  - venues.location (geography) is left NULL: the scoreboard payloads do not
 *    include coordinates. Names/cities/states are normalized; full state and
 *    province names are mapped to 2-letter codes to match the existing seed.
 */

import pg from 'pg';

const { Client } = pg;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_DB = 'postgres://boxd:boxd@localhost:5432/boxdseats';

const LEAGUES = {
  nfl: { sport: 'football', espn: 'nfl', soccer: false },
  nba: { sport: 'basketball', espn: 'nba', soccer: false },
  mlb: { sport: 'baseball', espn: 'mlb', soccer: false },
  nhl: { sport: 'hockey', espn: 'nhl', soccer: false },
  mls: { sport: 'soccer', espn: 'usa.1', soccer: true },
};

const CONCURRENCY = 8;
const CHUNK_DAYS = 28; // scoreboard date-range window (well under the 1000-event cap)
const PROGRESS_EVERY = 200;

const STATE_CODES = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH',
  oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX',
  utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
  'district of columbia': 'DC', 'washington, d.c.': 'DC',
  // Canadian provinces
  ontario: 'ON', quebec: 'QC', 'québec': 'QC', 'british columbia': 'BC',
  alberta: 'AB', manitoba: 'MB', saskatchewan: 'SK', 'nova scotia': 'NS',
  'new brunswick': 'NB', 'newfoundland and labrador': 'NL',
  'prince edward island': 'PE',
};
const CA_PROVINCES = new Set(['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB', 'NL', 'PE']);

const COUNTRY_CODES = {
  usa: 'US', 'united states': 'US', canada: 'CA',
  england: 'GB', uk: 'GB', 'united kingdom': 'GB', scotland: 'GB', wales: 'GB',
  germany: 'DE', france: 'FR', spain: 'ES', ireland: 'IE', brazil: 'BR',
  mexico: 'MX', japan: 'JP', 'south korea': 'KR', korea: 'KR', sweden: 'SE',
  finland: 'FI', 'czech republic': 'CZ', czechia: 'CZ', australia: 'AU',
};

// fallback for international venues whose ESPN address has no state/country
const CITY_COUNTRY = {
  london: 'GB', dublin: 'IE', frankfurt: 'DE', munich: 'DE', berlin: 'DE',
  madrid: 'ES', paris: 'FR', 'sao paulo': 'BR', 'mexico city': 'MX',
  tokyo: 'JP', seoul: 'KR', stockholm: 'SE', tampere: 'FI', prague: 'CZ',
  montreal: 'CA', toronto: 'CA', vancouver: 'CA', ottawa: 'CA', calgary: 'CA',
  edmonton: 'CA', winnipeg: 'CA', melbourne: 'AU', sydney: 'AU',
};

// curated name mappings where ESPN's current branding can't be fuzzy-matched
// to the row in our teams table (normalized name -> normalized db name)
const KNOWN_TEAM_ALIASES = {
  'utah mammoth': 'utah hockey club', // franchise renamed in 2025
};

// ESPN occasionally assigns a venue two ids across a sponsorship rename.
// espn venue id -> normalized name of the canonical venue row to merge into.
const KNOWN_VENUE_EQUIVALENTS = {
  4653: 'red bull arena', // "Sports Illustrated Stadium" (2023-25 branding), Harrison NJ
  5779: 'mexico city arena', // "Arena CDMX" == "Mexico City Arena"
  10660: 'bercy arena', // "Accor Arena" == Bercy Arena, Paris
};

// ESPN's scoreboards carry NO venue for most pre-2006 NFL games, 2002-04 MLS,
// a few defunct arenas (Compaq Center, Pyramid, Alamodome era), Cubs spring
// 2014-16 (Sloan Park pre-dating its ESPN id), and spring 2021 at several
// parks — the original backfill skipped all of those ("no venue in payload").
// When the payload lacks a venue, resolve via the home team's era venue.
// Values name the CANONICAL db venue row; nameAtTime preserves the era name.
const SAINTS_2005 = {
  '2005-09-19': { venue: 'Giants Stadium' },
  '2005-10-02': { venue: 'Alamodome' }, '2005-10-16': { venue: 'Alamodome' },
  '2005-12-24': { venue: 'Alamodome' },
  '2005-10-30': { venue: 'Tiger Stadium (Baton Rouge)', nameAtTime: 'Tiger Stadium' },
  '2005-11-06': { venue: 'Tiger Stadium (Baton Rouge)', nameAtTime: 'Tiger Stadium' },
  '2005-12-04': { venue: 'Tiger Stadium (Baton Rouge)', nameAtTime: 'Tiger Stadium' },
  '2005-12-18': { venue: 'Tiger Stadium (Baton Rouge)', nameAtTime: 'Tiger Stadium' },
};
const HOME_VENUE_FALLBACKS = {
  nfl: {
    'Arizona Cardinals': () => ({ venue: 'Sun Devil Stadium' }),
    'Atlanta Falcons': () => ({ venue: 'Georgia Dome' }),
    'Baltimore Ravens': () => ({ venue: 'M&T Bank Stadium' }),
    'Buffalo Bills': () => ({ venue: 'Highmark Stadium', nameAtTime: 'Ralph Wilson Stadium' }),
    'Carolina Panthers': (d) => ({ venue: 'Bank of America Stadium', nameAtTime: d < '2004-06-01' ? 'Ericsson Stadium' : null }),
    'Chicago Bears': (d) => (d < '2003-06-01'
      ? { venue: 'Memorial Stadium (Champaign)', nameAtTime: 'Memorial Stadium' }
      : { venue: 'Soldier Field' }),
    'Cincinnati Bengals': () => ({ venue: 'Paycor Stadium', nameAtTime: 'Paul Brown Stadium' }),
    'Cleveland Browns': () => ({ venue: 'Huntington Bank Field', nameAtTime: 'Cleveland Browns Stadium' }),
    'Dallas Cowboys': () => ({ venue: 'Texas Stadium' }),
    'Denver Broncos': () => ({ venue: 'Empower Field at Mile High', nameAtTime: 'Invesco Field at Mile High' }),
    'Detroit Lions': () => ({ venue: 'Ford Field' }),
    'Green Bay Packers': () => ({ venue: 'Lambeau Field' }),
    'Houston Texans': () => ({ venue: 'NRG Stadium', nameAtTime: 'Reliant Stadium' }),
    'Indianapolis Colts': () => ({ venue: 'RCA Dome' }),
    'Jacksonville Jaguars': () => ({ venue: 'EverBank Stadium', nameAtTime: 'Alltel Stadium' }),
    'Kansas City Chiefs': () => ({ venue: 'GEHA Field at Arrowhead Stadium', nameAtTime: 'Arrowhead Stadium' }),
    'Las Vegas Raiders': () => ({ venue: 'Oakland Coliseum', nameAtTime: 'Network Associates Coliseum' }),
    'Los Angeles Chargers': () => ({ venue: 'SDCCU Stadium', nameAtTime: 'Qualcomm Stadium' }),
    'Los Angeles Rams': () => ({ venue: "The Dome at America's Center", nameAtTime: 'Edward Jones Dome' }),
    'Miami Dolphins': () => ({ venue: 'Hard Rock Stadium', nameAtTime: 'Pro Player Stadium' }),
    'Minnesota Vikings': () => ({ venue: 'Metrodome' }),
    'New England Patriots': () => ({ venue: 'Gillette Stadium' }),
    'New Orleans Saints': (d) => SAINTS_2005[d] ?? { venue: 'Caesars Superdome', nameAtTime: 'Louisiana Superdome' },
    'New York Giants': () => ({ venue: 'Giants Stadium' }),
    'New York Jets': () => ({ venue: 'Giants Stadium' }),
    'Philadelphia Eagles': (d) => (d < '2003-06-01' ? { venue: 'Veterans Stadium' } : { venue: 'Lincoln Financial Field' }),
    'Pittsburgh Steelers': () => ({ venue: 'Acrisure Stadium', nameAtTime: 'Heinz Field' }),
    'San Francisco 49ers': () => ({ venue: 'Candlestick Park' }),
    'Seattle Seahawks': () => ({ venue: 'Lumen Field', nameAtTime: 'Seahawks Stadium' }),
    'Tampa Bay Buccaneers': () => ({ venue: 'Raymond James Stadium' }),
    'Tennessee Titans': () => ({ venue: 'Nissan Stadium', nameAtTime: 'The Coliseum' }),
    'Washington Commanders': () => ({ venue: 'Northwest Stadium', nameAtTime: 'FedExField' }),
  },
  mls: {
    'Chicago Fire FC': (d) => (d < '2003-11-01'
      ? { venue: 'Cardinal Stadium (Naperville)', nameAtTime: 'Cardinal Stadium' }
      : { venue: 'Soldier Field' }),
    'Columbus Crew': () => ({ venue: 'Historic Crew Stadium', nameAtTime: 'Columbus Crew Stadium' }),
    'D.C. United': () => ({ venue: 'RFK Stadium' }),
    'New England Revolution': () => ({ venue: 'Gillette Stadium' }),
    'New York Red Bulls': () => ({ venue: 'Giants Stadium' }),
    'FC Dallas': () => ({ venue: 'Cotton Bowl' }),
    'Sporting Kansas City': () => ({ venue: 'GEHA Field at Arrowhead Stadium', nameAtTime: 'Arrowhead Stadium' }),
    'LA Galaxy': (d) => (d < '2003-06-01'
      ? { venue: 'Rose Bowl' }
      : { venue: 'Dignity Health Sports Park', nameAtTime: 'Home Depot Center' }),
    'San Jose Earthquakes': () => ({ venue: 'Spartan Stadium' }),
    'Colorado Rapids': () => ({ venue: 'Empower Field at Mile High', nameAtTime: 'Invesco Field at Mile High' }),
  },
  nba: {
    'Houston Rockets': (d) => (d < '2003-09-01' ? { venue: 'Compaq Center' } : { venue: 'Toyota Center' }),
    'Memphis Grizzlies': (d) => (d < '2004-09-01' ? { venue: 'Pyramid Arena' } : { venue: 'FedExForum' }),
    'San Antonio Spurs': (d) => (d < '2002-10-01' ? { venue: 'Alamodome' } : { venue: 'Frost Bank Center' }),
  },
  mlb: {
    'Chicago Cubs': (d, pre) => (pre && d >= '2014-01-01'
      ? { venue: 'Sloan Park', nameAtTime: d < '2015-01-01' ? 'Cubs Park' : null }
      : pre ? { venue: 'Hohokam Stadium' } : null),
    'Chicago White Sox': (d, pre) => (pre ? { venue: 'Camelback Ranch - Glendale' } : null),
    'Los Angeles Dodgers': (d, pre) => (pre ? { venue: 'Camelback Ranch - Glendale' } : null),
    'St. Louis Cardinals': (d, pre) => (pre ? { venue: 'Roger Dean Chevrolet Stadium' } : null),
    'Miami Marlins': (d, pre) => (pre ? { venue: 'Roger Dean Chevrolet Stadium' } : null),
    'New York Mets': (d, pre) => (pre ? { venue: 'Clover Park' } : null),
    'Houston Astros': (d, pre) => (pre && d >= '2017-01-01' ? { venue: 'CACTI Park of the Palm Beaches', nameAtTime: d < '2023-01-01' ? 'The Ballpark of the Palm Beaches' : null } : null),
    'Washington Nationals': (d, pre) => (pre && d >= '2017-01-01' ? { venue: 'CACTI Park of the Palm Beaches', nameAtTime: d < '2023-01-01' ? 'The Ballpark of the Palm Beaches' : null } : null),
    'Minnesota Twins': (d, pre) => (pre ? { venue: 'Lee Health Sports Complex', nameAtTime: d < '2024-01-01' ? 'Hammond Stadium' : null } : null),
  },
};

// exhibition competitions to exclude (this is a "games you attended" app, but
// all-star exhibitions pollute the teams table with fake franchises)
const EXCLUDED_COMP_TYPES = new Set(['ALLSTAR', 'QRR']); // QRR = 4 Nations round robin
const EXHIBITION_RE = /all-star|all star|pro bowl|4 nations|rising stars|celebrity|skills challenge/i;
// 2000s Pro Bowls are named just "NFC at AFC" — catch conference pseudo-teams
const CONFERENCE_TEAM_RE = /^(afc|nfc|east|west) (all-stars)?$/i;

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { leagues: Object.keys(LEAGUES), from: '2023-01-01', to: null, dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--leagues=')) args.leagues = a.slice(10).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    else if (a.startsWith('--from=')) args.from = a.slice(7);
    else if (a.startsWith('--to=')) args.to = a.slice(5);
    else { console.error(`Unknown argument: ${a}`); process.exit(2); }
  }
  if (!args.to) {
    const y = new Date(Date.now() - 24 * 3600 * 1000);
    args.to = y.toISOString().slice(0, 10);
  }
  for (const d of [args.from, args.to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { console.error(`Bad date: ${d} (expected YYYY-MM-DD)`); process.exit(2); }
  }
  for (const l of args.leagues) {
    if (!LEAGUES[l]) { console.error(`Unknown league: ${l} (supported: ${Object.keys(LEAGUES).join(',')})`); process.exit(2); }
  }
  return args;
}

/** lowercase, strip diacritics + punctuation, collapse whitespace */
function normName(s) {
  if (!s) return '';
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stateCode(s) {
  if (!s) return null;
  const t = s.trim();
  if (/^[A-Za-z]{2}$/.test(t)) return t.toUpperCase();
  return STATE_CODES[t.toLowerCase()] ?? t;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

/** simple concurrency limiter */
function makeLimiter(max) {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

async function fetchJSON(url, attempt = 0) {
  const MAX_ATTEMPTS = 6;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'BoxdSeats-seeder/1.0' } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt + 1 >= MAX_ATTEMPTS) throw new Error(`HTTP ${res.status} after ${MAX_ATTEMPTS} attempts: ${url}`);
      const backoff = Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500;
      await sleep(backoff);
      return fetchJSON(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt + 1 >= MAX_ATTEMPTS || (err.message ?? '').startsWith('HTTP')) throw err;
    await sleep(Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500); // network hiccup
    return fetchJSON(url, attempt + 1);
  }
}

/** UTC ISO timestamp -> local US date string (fixed UTC-5 approximation; see header) */
function localEventDate(isoUtc) {
  const t = new Date(isoUtc).getTime() - 5 * 3600 * 1000;
  return new Date(t).toISOString().slice(0, 10);
}

/** 'eastern-conference-playoffs---round-one' -> 'Eastern Conference Playoffs - Round One' */
function humanizeSlug(slug) {
  return slug
    .split('---')
    .map((part) => part.split('-').map((w) => (w === 'mls' ? 'MLS' : w ? w[0].toUpperCase() + w.slice(1) : w)).join(' '))
    .join(' - ');
}

function* dateChunks(from, to, days) {
  let start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (start <= end) {
    const stop = new Date(Math.min(start.getTime() + (days - 1) * 86400000, end.getTime()));
    yield [start.toISOString().slice(0, 10).replace(/-/g, ''), stop.toISOString().slice(0, 10).replace(/-/g, '')];
    start = new Date(stop.getTime() + 86400000);
  }
}

// ---------------------------------------------------------------------------
// Team matching
// ---------------------------------------------------------------------------

/** order-insensitive, plural-insensitive token key: "Red Bull New York" ==
 *  "New York Red Bulls" */
function tokenKey(s) {
  const n = normName(s);
  if (!n) return '';
  return n.split(' ').map((w) => w.replace(/s$/, '')).sort().join(' ');
}

class TeamIndex {
  constructor(rows) {
    this.byEspn = new Map();
    this.byAbbrev = new Map(); // lower(abbrev) -> [row]
    this.byName = new Map(); // normalized candidate -> [row]
    this.byTokens = new Map(); // token-set key -> [row]
    for (const row of rows) this.add(row);
  }
  add(row) {
    if (row.external_ids?.espn) this.byEspn.set(String(row.external_ids.espn), row);
    push(this.byAbbrev, row.abbreviation.toLowerCase(), row);
    for (const cand of new Set([
      normName(row.name),
      normName(row.short_name),
      normName(`${row.city} ${row.short_name}`),
    ])) {
      if (cand) push(this.byName, cand, row);
    }
    for (const cand of new Set([tokenKey(row.name), tokenKey(`${row.city} ${row.short_name}`)])) {
      if (cand) push(this.byTokens, cand, row);
    }
  }
  /** match an ESPN team object {id, abbreviation, displayName, shortDisplayName, name, location} */
  match(t) {
    const byId = this.byEspn.get(String(t.id));
    if (byId) return { row: byId, how: 'espn-id' };
    const ab = (t.abbreviation ?? '').toLowerCase();
    if (ab && this.byAbbrev.get(ab)?.length === 1) return { row: this.byAbbrev.get(ab)[0], how: 'abbreviation' };
    for (const cand of new Set([
      normName(t.displayName),
      normName(`${t.location ?? ''} ${t.name ?? ''}`),
      normName(t.name),
      normName(t.shortDisplayName),
    ])) {
      if (cand && this.byName.get(cand)?.length === 1) return { row: this.byName.get(cand)[0], how: 'name' };
    }
    for (const cand of new Set([tokenKey(t.displayName), tokenKey(`${t.location ?? ''} ${t.name ?? ''}`)])) {
      if (cand && this.byTokens.get(cand)?.length === 1) return { row: this.byTokens.get(cand)[0], how: 'tokens' };
    }
    const alias = KNOWN_TEAM_ALIASES[normName(t.displayName)];
    if (alias && this.byName.get(alias)?.length === 1) return { row: this.byName.get(alias)[0], how: 'alias' };
    return null;
  }
}

function push(map, key, val) {
  const arr = map.get(key);
  if (arr) arr.push(val); else map.set(key, [val]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv);
const limiter = makeLimiter(CONCURRENCY);
const db = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB });
await db.connect();
if (args.dryRun) await db.query('begin');

console.log(`Seeding leagues=[${args.leagues.join(',')}] from=${args.from} to=${args.to}${args.dryRun ? ' (DRY RUN — all changes rolled back)' : ''}`);

const summary = {};

// --- shared (cross-league) venue state -------------------------------------
const venueByEspn = new Map(); // espn venue id -> entry
const venueByName = new Map(); // normalized name -> [entry]
const venueById = new Map(); // venue id -> entry {id, name, city, espn}
const venueTeamPairs = new Set(); // `${venueId}|${teamId}`
const venuesByTeam = new Map(); // team id -> Set(venue id)
let espnVenueNamesInLeague = new Set(); // normalized ESPN venue names seen in current league fetch

async function loadVenues() {
  const { rows } = await db.query(
    `select id, name, city, external_ids->>'espn' as espn from venues`,
  );
  for (const v of rows) {
    const entry = { id: v.id, name: v.name, city: v.city, espn: v.espn };
    venueById.set(v.id, entry);
    if (v.espn) venueByEspn.set(String(v.espn), entry);
    push(venueByName, normName(v.name), entry);
  }
  const aliases = await db.query(`select venue_id, alias_name from venue_aliases`);
  for (const a of aliases.rows) {
    const entry = venueById.get(a.venue_id);
    if (entry) push(venueByName, normName(a.alias_name), entry);
  }
  const vt = await db.query(`select venue_id, team_id from venue_teams`);
  for (const r of vt.rows) {
    venueTeamPairs.add(`${r.venue_id}|${r.team_id}`);
    if (!venuesByTeam.has(r.team_id)) venuesByTeam.set(r.team_id, new Set());
    venuesByTeam.get(r.team_id).add(r.venue_id);
  }
}

function parseVenueAddress(addr = {}) {
  let city = addr.city ?? null;
  let state = addr.state ?? null;
  if (city && !state && city.includes(',')) {
    const [c, s] = city.split(',').map((x) => x.trim());
    city = c; state = s;
  }
  let country = addr.country ? (COUNTRY_CODES[addr.country.toLowerCase()] ?? addr.country) : null;
  // ESPN sometimes packs a country into the state slot ("Tokyo, Japan" / "London, UK")
  if (state && COUNTRY_CODES[state.toLowerCase()]) {
    if (!country) country = COUNTRY_CODES[state.toLowerCase()];
    state = null;
  }
  state = stateCode(state);
  if (!country) {
    if (CA_PROVINCES.has(state ?? '')) country = 'CA';
    else country = CITY_COUNTRY[normName(city ?? '')] ?? 'US';
  }
  return { city: city || 'Unknown', state, country };
}

/**
 * Resolve an ESPN venue object to a db venue id, creating it if needed.
 * Match order:
 *   1. external_ids.espn
 *   2. exact normalized name (venues + venue_aliases)
 *   3. unique substring containment ("oriole park at camden yards" ⊃ "camden yards")
 *   4. sponsor-rename heuristic: non-neutral-site game whose home team has
 *      exactly one known home venue in the SAME city and that venue carries no
 *      conflicting ESPN id ⇒ treat the unmatched ESPN name as a rename of that
 *      venue (recorded as a venue_alias). Guards keep true relocations (e.g.
 *      Athletics → Sutter Health Park) from being misattached.
 *   5. insert a new venue.
 */
async function resolveVenue(espnVenue, homeTeamId, neutralSite, stats) {
  const espnId = espnVenue.id != null ? String(espnVenue.id) : null;
  if (espnId && venueByEspn.has(espnId)) return venueByEspn.get(espnId).id;

  const fullName = espnVenue.fullName ?? '';
  const norm = normName(fullName);
  const addr = parseVenueAddress(espnVenue.address);
  let matched = null;
  let how = 'name';
  if (norm && venueByName.get(norm)?.length >= 1) {
    matched = venueByName.get(norm)[0];
  }
  if (!matched && norm.length >= 8) {
    const hits = new Map();
    for (const [key, entries] of venueByName) {
      if (key.length >= 8 && (norm.includes(key) || key.includes(norm))) {
        for (const e of entries) hits.set(e.id, e);
      }
    }
    if (hits.size === 1) { matched = [...hits.values()][0]; how = 'containment'; }
  }
  if (!matched && espnId && KNOWN_VENUE_EQUIVALENTS[espnId]) {
    const cands = venueByName.get(KNOWN_VENUE_EQUIVALENTS[espnId]);
    if (cands?.length === 1) { matched = cands[0]; how = 'curated'; }
  }
  if (!matched && !neutralSite && homeTeamId) {
    const homeVenues = venuesByTeam.get(homeTeamId);
    if (homeVenues?.size === 1) {
      const cand = venueById.get([...homeVenues][0]);
      const sameCity = espnVenue.address?.city && cand && normName(addr.city) === normName(cand.city);
      const noEspnConflict = cand && (!cand.espn || cand.espn === espnId);
      // If ESPN also reports games under the candidate's own name in this
      // league's data, this is an alternate site (e.g. Stade Olympique vs
      // Stade Saputo), NOT a rename — ESPN normalizes renamed venues to their
      // current name everywhere.
      const candNameStillUsed = cand && espnVenueNamesInLeague.has(normName(cand.name));
      if (sameCity && noEspnConflict && !candNameStillUsed) {
        matched = cand;
        how = 'home-venue rename';
        console.log(`  venue rename detected: "${fullName}" -> existing "${cand.name}" (${cand.city})`);
      }
    }
  }

  if (matched) {
    if (espnId && !matched.espn) {
      // record the ESPN id (keep the first one if a different league/sport
      // already supplied one — the partial unique index allows only one)
      await db.query(
        `update venues set external_ids = external_ids || jsonb_build_object('espn', $1::text)
          where id = $2 and not external_ids ? 'espn'`,
        [espnId, matched.id],
      );
      matched.espn = espnId;
    }
    if (espnId) venueByEspn.set(espnId, matched); // in-run resolution either way
    // record the ESPN name as an alias when it differs from the canonical name
    if (fullName && normName(matched.name) !== norm) {
      await db.query(
        `insert into venue_aliases (venue_id, alias_name)
         select $1, $2 where not exists
           (select 1 from venue_aliases where venue_id = $1 and lower(alias_name) = lower($2))`,
        [matched.id, fullName],
      );
      push(venueByName, norm, matched);
    }
    stats.venuesMatched++;
    return matched.id;
  }

  // insert new venue
  const { city, state, country } = addr;
  const ext = espnId ? { espn: espnId } : {};
  const { rows } = await db.query(
    `insert into venues (name, city, state, country, status, external_ids)
     values ($1, $2, $3, $4, 'active', $5) returning id`,
    [fullName || 'Unknown Venue', city, state, country, JSON.stringify(ext)],
  );
  const entry = { id: rows[0].id, name: fullName, city, espn: espnId };
  venueById.set(entry.id, entry);
  if (espnId) venueByEspn.set(espnId, entry);
  if (norm) push(venueByName, norm, entry);
  stats.venuesCreated++;
  console.log(`  created venue: ${fullName} (${city}${state ? ', ' + state : ''}) [espn ${espnId}]`);
  return entry.id;
}

async function ensureVenueTeam(venueId, teamId) {
  const key = `${venueId}|${teamId}`;
  if (venueTeamPairs.has(key)) return;
  await db.query(
    `insert into venue_teams (venue_id, team_id, is_primary)
     select $1, $2, false where not exists
       (select 1 from venue_teams where venue_id = $1 and team_id = $2)`,
    [venueId, teamId],
  );
  venueTeamPairs.add(key);
  if (!venuesByTeam.has(teamId)) venuesByTeam.set(teamId, new Set());
  venuesByTeam.get(teamId).add(venueId);
}

// --- team phase --------------------------------------------------------------

async function syncTeams(leagueSlug, leagueId, cfg, stats) {
  const data = await fetchJSON(
    `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.espn}/teams?limit=100`,
  );
  const espnTeams = (data.sports?.[0]?.leagues?.[0]?.teams ?? []).map((t) => t.team);
  const { rows } = await db.query(
    `select id, name, short_name, abbreviation, city, logo_url, external_ids from teams where league_id = $1`,
    [leagueId],
  );
  const index = new TeamIndex(rows);

  for (const t of espnTeams) {
    const logo = t.logos?.find((l) => l.rel?.includes('default'))?.href ?? t.logos?.[0]?.href ?? null;
    const m = index.match(t);
    if (m) {
      await db.query(
        `update teams set
           external_ids = external_ids || jsonb_build_object('espn', $1::text),
           logo_url = coalesce(logo_url, $2)
         where id = $3`,
        [String(t.id), logo, m.row.id],
      );
      m.row.external_ids = { ...(m.row.external_ids ?? {}), espn: String(t.id) };
      index.byEspn.set(String(t.id), m.row);
      stats.teamsMatched++;
    } else {
      const row = await insertTeam(leagueId, t, logo, index);
      stats.teamsCreated++;
      console.log(`  [${leagueSlug}] created team: ${row.name} (espn ${t.id})`);
    }
  }
  return index;
}

async function insertTeam(leagueId, t, logo, index) {
  const name = t.displayName ?? `${t.location ?? ''} ${t.name ?? ''}`.trim();
  const shortName = t.name ?? t.shortDisplayName ?? name;
  const city = t.location ?? shortName;
  const abbreviation = t.abbreviation ?? normName(name).slice(0, 4).toUpperCase();
  const { rows } = await db.query(
    `insert into teams (league_id, name, short_name, abbreviation, city, logo_url, external_ids)
     values ($1, $2, $3, $4, $5, $6, jsonb_build_object('espn', $7::text)) returning id`,
    [leagueId, name, shortName, abbreviation, city, logo, String(t.id)],
  );
  const row = { id: rows[0].id, name, short_name: shortName, abbreviation, city, logo_url: logo, external_ids: { espn: String(t.id) } };
  index.add(row);
  return row;
}

/** Resolve a competitor's team (lazy: handles teams missing from the current
 *  teams endpoint, e.g. relocated franchises like the Arizona Coyotes). */
async function resolveCompetitorTeam(leagueSlug, leagueId, index, team, stats) {
  const m = index.match(team);
  if (m) {
    if (!m.row.external_ids?.espn) {
      await db.query(
        `update teams set external_ids = external_ids || jsonb_build_object('espn', $1::text) where id = $2`,
        [String(team.id), m.row.id],
      );
      m.row.external_ids = { ...(m.row.external_ids ?? {}), espn: String(team.id) };
      index.byEspn.set(String(team.id), m.row);
    }
    return m.row;
  }
  const row = await insertTeam(leagueId, team, team.logo ?? null, index);
  stats.teamsCreated++;
  console.log(`  [${leagueSlug}] created team from event data: ${row.name} (espn ${team.id})`);
  return row;
}

// --- season classification ----------------------------------------------------

/** returns {include, isPostseason, roundFromSlug} */
function classifySeason(season, soccer) {
  if (!soccer) {
    const t = season?.type;
    if (t === 1) return { include: true, isPostseason: false, isPreseason: true, roundFromSlug: null };
    if (t !== 2 && t !== 3) return { include: false };
    return { include: true, isPostseason: t === 3, isPreseason: false, roundFromSlug: null };
  }
  const slug = season?.slug ?? '';
  if (/all-star|friendly/.test(slug)) return { include: false };
  if (/preseason/.test(slug)) return { include: true, isPostseason: false, isPreseason: true, roundFromSlug: null };
  if (slug === 'regular-season' || slug === '') return { include: true, isPostseason: false, isPreseason: false, roundFromSlug: null };
  return { include: true, isPostseason: true, isPreseason: false, roundFromSlug: humanizeSlug(slug) };
}

// --- event phase ----------------------------------------------------------------

async function seedLeague(leagueSlug) {
  const cfg = LEAGUES[leagueSlug];
  const stats = {
    teamsMatched: 0, teamsCreated: 0,
    venuesMatched: 0, venuesCreated: 0,
    eventsInserted: 0, eventsSkipped: 0, eventsEnriched: 0,
    eventsFiltered: 0, eventsErrored: 0,
  };
  summary[leagueSlug] = stats;

  const lr = await db.query(`select id from leagues where slug = $1`, [leagueSlug]);
  if (lr.rows.length === 0) { console.error(`league not found in db: ${leagueSlug}`); return; }
  const leagueId = lr.rows[0].id;

  console.log(`\n=== ${leagueSlug.toUpperCase()} ===`);
  const teamIndex = await syncTeams(leagueSlug, leagueId, cfg, stats);

  // preload existing events for dedupe
  const existingByEspn = new Set();
  const existingByNatural = new Map(); // `${date}|${homeId}|${awayId}` -> {id, hasEspn, home_score, away_score}
  {
    const { rows } = await db.query(
      `select id, external_ids->>'espn' as espn, event_date::text as event_date,
              home_team_id, away_team_id, home_score, away_score
         from events where league_id = $1`,
      [leagueId],
    );
    for (const e of rows) {
      if (e.espn) existingByEspn.add(e.espn);
      if (e.home_team_id && e.away_team_id) {
        existingByNatural.set(`${e.event_date}|${e.home_team_id}|${e.away_team_id}`, {
          id: e.id, hasEspn: !!e.espn, home_score: e.home_score, away_score: e.away_score,
        });
      }
    }
  }

  // fetch all date chunks (concurrency-limited), keep only the fields we need
  const chunks = [...dateChunks(args.from, args.to, CHUNK_DAYS)];
  const fetches = chunks.map(([a, b]) => limiter(async () => {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.espn}/scoreboard?dates=${a}-${b}&limit=1000`;
    const data = await fetchJSON(url);
    const events = data.events ?? [];
    if (events.length >= 950) console.warn(`  WARNING: chunk ${a}-${b} returned ${events.length} events (near cap) — consider smaller CHUNK_DAYS`);
    return events.map((e) => {
      const comp = e.competitions?.[0] ?? {};
      return {
        id: String(e.id),
        date: e.date,
        name: e.name,
        season: e.season,
        completed: e.status?.type?.completed === true,
        venue: comp.venue ?? null,
        neutralSite: comp.neutralSite === true,
        compType: comp.type?.abbreviation ?? null,
        notes: comp.notes ?? [],
        competitors: (comp.competitors ?? []).map((c) => ({
          homeAway: c.homeAway,
          score: c.score,
          team: {
            id: c.team?.id, abbreviation: c.team?.abbreviation,
            displayName: c.team?.displayName, shortDisplayName: c.team?.shortDisplayName,
            name: c.team?.name, location: c.team?.location, logo: c.team?.logo,
          },
        })),
      };
    });
  }));

  // fetch everything first so venue resolution can see the league-wide set of
  // ESPN venue names (used to distinguish renames from alternate sites)
  const chunkResults = await Promise.all(fetches.map((p) => p.catch((err) => {
    console.error(`  fetch failed (chunk skipped): ${err.message}`);
    stats.eventsErrored++;
    return [];
  })));
  const allEvents = chunkResults.flat(); // chronological (chunks generated in date order)
  espnVenueNamesInLeague = new Set();
  for (const ev of allEvents) {
    const n = normName(ev.venue?.fullName ?? '');
    if (n) espnVenueNamesInLeague.add(n);
  }

  let processed = 0;
  const seenThisRun = new Set();
  for (const ev of allEvents) {
    processed++;
    if (processed % PROGRESS_EVERY === 0) {
      console.log(`  [${leagueSlug}] ${processed}/${allEvents.length} events processed — inserted=${stats.eventsInserted} skipped=${stats.eventsSkipped} enriched=${stats.eventsEnriched}`);
    }
    try {
      await processEvent(ev, leagueSlug, leagueId, cfg, teamIndex, existingByEspn, existingByNatural, seenThisRun, stats);
    } catch (err) {
      stats.eventsErrored++;
      console.error(`  [${leagueSlug}] event ${ev.id} (${ev.name}): ${err.message}`);
    }
  }

  console.log(`  [${leagueSlug}] done. teams matched=${stats.teamsMatched} created=${stats.teamsCreated}; ` +
    `venues matched=${stats.venuesMatched} created=${stats.venuesCreated}; ` +
    `events inserted=${stats.eventsInserted} skipped=${stats.eventsSkipped} enriched=${stats.eventsEnriched} ` +
    `filtered=${stats.eventsFiltered} errored=${stats.eventsErrored}`);
}

async function processEvent(ev, leagueSlug, leagueId, cfg, teamIndex, existingByEspn, existingByNatural, seenThisRun, stats) {
  if (seenThisRun.has(ev.id)) return; // overlap safety
  seenThisRun.add(ev.id);

  if (!ev.completed) { stats.eventsFiltered++; return; }
  const cls = classifySeason(ev.season, cfg.soccer);
  if (!cls.include) { stats.eventsFiltered++; return; }

  // exclude all-star / exhibition competitions (Pro Bowl, ASG, 4 Nations, …)
  if (ev.compType && EXCLUDED_COMP_TYPES.has(ev.compType)) { stats.eventsFiltered++; return; }
  const noteText = (ev.notes ?? []).map((n) => n.headline ?? '').join(' ');
  if (EXHIBITION_RE.test(ev.name ?? '') || EXHIBITION_RE.test(noteText)) { stats.eventsFiltered++; return; }

  if (existingByEspn.has(ev.id)) { stats.eventsSkipped++; return; } // idempotent re-run

  const home = ev.competitors.find((c) => c.homeAway === 'home');
  const away = ev.competitors.find((c) => c.homeAway === 'away');
  if (!home?.team?.id || !away?.team?.id) throw new Error('missing competitor team');
  if (CONFERENCE_TEAM_RE.test(home.team.displayName ?? home.team.name ?? '') ||
      CONFERENCE_TEAM_RE.test(away.team.displayName ?? away.team.name ?? '')) {
    stats.eventsFiltered++; // Pro Bowl et al. under conference pseudo-team names
    return;
  }

  const homeScore = Number.parseInt(home.score, 10);
  const awayScore = Number.parseInt(away.score, 10);
  if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) throw new Error('completed game without numeric scores');

  const homeTeam = await resolveCompetitorTeam(leagueSlug, leagueId, teamIndex, home.team, stats);
  const awayTeam = await resolveCompetitorTeam(leagueSlug, leagueId, teamIndex, away.team, stats);

  const eventDate = localEventDate(ev.date);
  const naturalKey = `${eventDate}|${homeTeam.id}|${awayTeam.id}`;

  // Hand-seeded duplicate (no external id yet)? Enrich instead of inserting.
  // If the natural-key match already carries a *different* ESPN id, this is a
  // genuine doubleheader (two real games, same date/teams) — fall through and
  // insert a new row. Re-runs are still idempotent via the espn-id skip above.
  const existing = existingByNatural.get(naturalKey);
  if (existing && !existing.hasEspn) {
    await db.query(
      `update events set
         external_ids = external_ids || jsonb_build_object('espn', $1::text),
         home_score = coalesce(home_score, $2),
         away_score = coalesce(away_score, $3)
       where id = $4`,
      [ev.id, homeScore, awayScore, existing.id],
    );
    existing.hasEspn = true;
    existingByEspn.add(ev.id);
    stats.eventsEnriched++;
    return;
  }

  let venueId, venueNameAtTime;
  if (!ev.venue?.fullName && !ev.venue?.id) {
    const fb = HOME_VENUE_FALLBACKS[leagueSlug]?.[homeTeam.name]?.(eventDate, cls.isPreseason === true);
    if (!fb) throw new Error('no venue in payload');
    const entry = venueByName.get(normName(fb.venue))?.[0];
    if (!entry) throw new Error(`fallback venue not in db: ${fb.venue}`);
    venueId = entry.id;
    venueNameAtTime = fb.nameAtTime ?? null;
    stats.venuesMatched++;
  } else {
    venueId = await resolveVenue(ev.venue, homeTeam.id, ev.neutralSite, stats);
    const venueName = venueById.get(venueId)?.name;
    venueNameAtTime = ev.venue.fullName && ev.venue.fullName !== venueName ? ev.venue.fullName : null;
  }

  const season = ev.season?.year;
  if (!Number.isFinite(season)) throw new Error('missing season year');

  const roundOrStage = cls.isPostseason
    ? (cfg.soccer ? cls.roundFromSlug : (ev.notes?.find((n) => n.headline)?.headline ?? null))
    : cls.isPreseason
      ? (leagueSlug === 'mlb' ? 'Spring Training' : 'Preseason')
      : null;

  await db.query(
    `insert into events (
       league_id, venue_id, event_date, event_template,
       home_team_id, away_team_id, home_score, away_score, is_draw,
       season, is_postseason, is_preseason, round_or_stage, venue_name_at_time, external_ids
     ) values ($1,$2,$3,'match',$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, jsonb_build_object('espn', $14::text))`,
    [
      leagueId, venueId, eventDate,
      homeTeam.id, awayTeam.id, homeScore, awayScore, homeScore === awayScore,
      season, cls.isPostseason, cls.isPreseason === true, roundOrStage, venueNameAtTime, ev.id,
    ],
  );
  existingByEspn.add(ev.id);
  if (!existingByNatural.has(naturalKey)) {
    existingByNatural.set(naturalKey, { id: null, hasEspn: true, home_score: homeScore, away_score: awayScore });
  }
  if (!ev.neutralSite) await ensureVenueTeam(venueId, homeTeam.id);
  stats.eventsInserted++;
}

// ---------------------------------------------------------------------------

let failed = false;
try {
  await loadVenues();
  for (const slug of args.leagues) {
    await seedLeague(slug);
  }
} catch (err) {
  failed = true;
  console.error(`FATAL: ${err.stack ?? err}`);
} finally {
  if (args.dryRun) {
    await db.query('rollback');
    console.log('\nDRY RUN: all changes rolled back.');
  }
  await db.end();
}

console.log('\n================ SUMMARY ================');
for (const [slug, s] of Object.entries(summary)) {
  console.log(
    `${slug.padEnd(4)} teams: matched=${s.teamsMatched} created=${s.teamsCreated} | ` +
    `venues: matched=${s.venuesMatched} created=${s.venuesCreated} | ` +
    `events: inserted=${s.eventsInserted} skipped=${s.eventsSkipped} enriched=${s.eventsEnriched} ` +
    `filtered=${s.eventsFiltered} errored=${s.eventsErrored}`,
  );
}
process.exit(failed ? 1 : 0);
