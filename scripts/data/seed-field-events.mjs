#!/usr/bin/env node
/**
 * seed-field-events.mjs — BoxdSeats field-event seeding pipeline (ESPN public APIs).
 *
 * Populates `field`-template events (tournaments + races) for:
 *   pga      -> league slug 'pga-tour'   (golf)
 *   atp      -> league slug 'atp'        (tennis)
 *   wta      -> league slug 'wta'        (tennis)
 *   nascar   -> league slug 'nascar-cup' (motorsports, Cup series only)
 *   indycar  -> league slug 'indycar'    (motorsports)
 *   f1       -> league slug 'f1'         (motorsports)
 *
 * Usage:
 *   node scripts/data/seed-field-events.mjs \
 *     [--leagues=pga,atp,wta,nascar,indycar,f1] \
 *     [--from=YYYY-MM-DD] [--to=YYYY-MM-DD] [--dry-run]
 *
 * Env:  DATABASE_URL (defaults to the local test DB).
 *
 * Event modeling (the app's log flow uses tournament_id + day_number to offer
 * a day picker for multi-day events):
 *  - Golf:   one events row PER DAY of the tournament (date -> endDate,
 *    typically 4 days; tournaments longer than 8 days are skipped). All day
 *    rows share a generated tournament_id; round_or_stage "Round N" with the
 *    last day "Final Round"; winner_name on every row; season = calendar year
 *    of the start day. Venue + winner come from the per-event leaderboard
 *    endpoint (the golf scoreboard carries neither).
 *  - Tennis: one events row per day of the span, capped at the LAST 15 days
 *    (slam spans include qualifying; capping from the end keeps day 1 at
 *    roughly the main-draw start and the final on the real final day).
 *    round_or_stage "Day N", final day "Final"; winner_name = singles champion
 *    when ESPN's groupings expose the final (else NULL).
 *  - Racing: single-day rows (no tournament_id/day_number), winner_name =
 *    race winner. For F1 the race date/winner come from the weekend's "Race"
 *    competition. NASCAR exhibition events (Clash, Duels, All-Star) are
 *    excluded so each Cup season lands at ~36 points races.
 *  - Only events whose END date is on/before --to (default: yesterday) AND
 *    whose ESPN status is completed are written.
 *
 * external_ids:
 *  - events: {"espn": "<eventId>-d<dayNumber>"} for tournament day rows,
 *    plain "<eventId>" for races. Idempotent: rows whose external id already
 *    exists are skipped; partial tournaments are topped up reusing the
 *    existing tournament_id.
 *  - venues: ESPN ids for golf courses / racing circuits live in PER-SPORT id
 *    spaces that collide with the stadium ids already stored by
 *    seed-real-data.mjs (e.g. golf course 21 = Augusta, ESPN venue 21 = Shea
 *    Stadium). They are therefore stored namespaced: "golf:21", "nascar:21",
 *    "f1:4243". Tennis venues have no ESPN id (matched by name only).
 *
 * Venue notes:
 *  - Existing venues are matched by external id, then curated alias, then
 *    normalized name, then unique substring containment; otherwise created
 *    (country mapped to ISO-2, US state kept as 2-letter code).
 *  - Tennis majors use a curated map of the real venues (Melbourne Park,
 *    Stade Roland Garros, All England Lawn Tennis Club, USTA Billie Jean King
 *    National Tennis Center). Other tennis events get "<Tournament Name> Site"
 *    in the host city (ESPN only exposes "City, Country").
 *  - IndyCar: ESPN exposes no circuit data for IRL events (scoreboard circuit
 *    is null and the core API event has an empty venues list — verified), so
 *    venues come from a curated race-name -> circuit map.
 *
 * PGA hand-seed cleanup: pre-existing pga-tour rows without an ESPN id are
 * matched to real tournaments by (year-stripped tournament-name tokens +
 * season). Matches are UPDATED in place to become the tournament's final-day
 * row (correcting venue/date/winner/tags and joining the inserted sibling day
 * rows via tournament_id) so existing event_logs keep pointing at the right
 * row. Unmatched hand rows inside the seeded season range are deleted when
 * nothing references them, otherwise left untouched and reported.
 */

import crypto from 'node:crypto';
import pg from 'pg';

const { Client } = pg;

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const DEFAULT_DB = 'postgres://boxd:boxd@localhost:5432/boxdseats';

const LEAGUES = {
  pga: {
    slug: 'pga-tour', kind: 'golf', path: 'golf/pga',
    create: { name: 'PGA Tour', sport: 'golf', country: 'US' },
  },
  atp: {
    slug: 'atp', kind: 'tennis', path: 'tennis/atp', singles: 'mens-singles',
    create: { name: 'ATP Tour', sport: 'tennis', country: 'US' },
  },
  wta: {
    slug: 'wta', kind: 'tennis', path: 'tennis/wta', singles: 'womens-singles',
    create: { name: 'WTA Tour', sport: 'tennis', country: 'US' },
  },
  nascar: {
    slug: 'nascar-cup', kind: 'racing', path: 'racing/nascar-premier', extPrefix: 'nascar',
    coreLeague: 'nascar-premier',
    create: { name: 'NASCAR Cup Series', sport: 'motorsports', country: 'US' },
  },
  indycar: {
    slug: 'indycar', kind: 'racing', path: 'racing/irl', extPrefix: 'indycar',
    create: { name: 'IndyCar Series', sport: 'motorsports', country: 'US' },
  },
  f1: {
    slug: 'f1', kind: 'racing', path: 'racing/f1', extPrefix: 'f1',
    create: { name: 'Formula 1', sport: 'motorsports', country: 'GB' },
  },
};

const CONCURRENCY = 8;
const CHUNK_DAYS = 28; // scoreboard date-range window
const MAX_GOLF_DAYS = 8; // skip golf "tournaments" longer than this
const MAX_TENNIS_DAYS = 15; // cap tennis spans (slams incl. qualifying run ~21)

// ESPN's leaderboard endpoint has no course data for some early-2000s
// tournaments; the majors matter (they power the golf-major badge lists), so
// their host courses are curated. Key: `${season} ${stripYears(normName(name))}`.
const GOLF_COURSE_FALLBACKS = {
  '2002 u s open championship': { name: 'Bethpage State Park (Black Course)', city: 'Farmingdale', state: 'NY', country: 'US' },
  '2002 british open championship': { name: 'Muirfield', city: 'Gullane', state: null, country: 'GB' },
  '2002 pga championship': { name: 'Hazeltine National Golf Club', city: 'Chaska', state: 'MN', country: 'US' },
  '2003 u s open championship': { name: 'Olympia Fields Country Club', city: 'Olympia Fields', state: 'IL', country: 'US' },
  '2003 pga championship': { name: 'Oak Hill Country Club', city: 'Rochester', state: 'NY', country: 'US' },
  '2004 u s open championship': { name: 'Shinnecock Hills Golf Club', city: 'Southampton', state: 'NY', country: 'US' },
  '2004 british open championship': { name: 'Royal Troon Golf Club', city: 'Troon', state: null, country: 'GB' },
  '2004 pga championship': { name: 'Whistling Straits', city: 'Kohler', state: 'WI', country: 'US' },
};

// --- tags (CRITICAL: exact strings — they power existing badge lists) -------
const GOLF_MAJOR_TAGS = {
  'masters tournament': ['masters', 'pga_major'],
  'the masters': ['masters', 'pga_major'],
  'the masters tournament': ['masters', 'pga_major'],
  'pga championship': ['pga_championship', 'pga_major'],
  'u s open': ['us_open', 'pga_major'],
  'u s open championship': ['us_open', 'pga_major'],
  'u s open golf championship': ['us_open', 'pga_major'],
  'the open': ['open_championship', 'pga_major'],
  'the open championship': ['open_championship', 'pga_major'],
  'open championship': ['open_championship', 'pga_major'],
  'british open championship': ['open_championship', 'pga_major'],
};
const TENNIS_SLAM_TAGS = {
  'australian open': ['grand_slam_australian_open', 'grand_slam'],
  'roland garros': ['grand_slam_french_open', 'grand_slam'],
  'french open': ['grand_slam_french_open', 'grand_slam'],
  wimbledon: ['grand_slam_wimbledon', 'grand_slam'],
  'wimbledon championships': ['grand_slam_wimbledon', 'grand_slam'],
  'us open': ['grand_slam_us_open', 'grand_slam'],
  'u s open': ['grand_slam_us_open', 'grand_slam'],
  'us open championships': ['grand_slam_us_open', 'grand_slam'],
};

// FedEx Cup playoff events (ESPN marks them season.type 2 like everything else)
const GOLF_POSTSEASON = new Set([
  'fedex st jude championship', 'bmw championship', 'tour championship',
]);

// hand-seed-name equivalences (normalized, year-stripped)
const GOLF_NAME_EQUIV = {
  'the open': 'open championship',
  'the open championship': 'open championship',
};

// ESPN golf course name -> normalized name of the existing venue row
const GOLF_COURSE_ALIASES = {
  'torrey pines south course': 'torrey pines golf course',
  'torrey pines north course': 'torrey pines golf course',
};

// Tennis majors -> real venues (curated; ESPN only has "City, Country")
const TENNIS_MAJOR_VENUES = {
  'australian open': { name: 'Melbourne Park', city: 'Melbourne', state: null, country: 'AU' },
  'roland garros': { name: 'Stade Roland Garros', city: 'Paris', state: null, country: 'FR' },
  'french open': { name: 'Stade Roland Garros', city: 'Paris', state: null, country: 'FR' },
  wimbledon: { name: 'All England Lawn Tennis Club', city: 'London', state: null, country: 'GB' },
  'us open': { name: 'USTA Billie Jean King National Tennis Center', city: 'New York', state: 'NY', country: 'US' },
  // 2024 Olympic tennis was played at Roland Garros
  olympics: { name: 'Stade Roland Garros', city: 'Paris', state: null, country: 'FR' },
};

// Tournaments where ESPN supplies no "City, Country" venue in ANY season
// (verified 2023-2026) — matched by substring of the normalized event name.
const TENNIS_CITY_FALLBACKS = [
  ['adelaide international', { city: 'Adelaide', state: null, country: 'AU' }],
  ['aguascalientes', { city: 'Aguascalientes', state: null, country: 'MX' }],
  ['copa colsanitas', { city: 'Bogotá', state: null, country: 'CO' }],
  ['granby', { city: 'Granby', state: null, country: 'CA' }],
  ['silicon valley classic', { city: 'San Jose', state: 'CA', country: 'US' }],
  ['vanopen', { city: 'Vancouver', state: null, country: 'CA' }],
  ['san luis potosi', { city: 'San Luis Potosí', state: null, country: 'MX' }],
  ['istanbul', { city: 'Istanbul', state: null, country: 'TR' }],
  ['thoreau tennis', { city: 'Concord', state: 'MA', country: 'US' }],
];

// NASCAR exhibition events to exclude (points races only => ~36/season).
// Older naming: Budweiser Shootout / Sprint Unlimited (Clash), Gatorade 125s
// (Duels), The Winston / Nextel Open (All-Star weekend).
const NASCAR_EXHIBITION_RE =
  /\b(clash|duel|all[- ]?star|shootout|gatorade (duel|125)|sprint unlimited|the winston|(nextel|sprint|monster energy) open|showdown)\b/i;

// IndyCar circuits: ESPN exposes no venue data for IRL, curated by race name.
// Key = normalized race name minus "Grand Prix of" / "Race N" noise.
const INDYCAR_VENUES = {
  'st petersburg': { name: 'Streets of St. Petersburg', city: 'St. Petersburg', state: 'FL', country: 'US' },
  thermal: { name: 'The Thermal Club', city: 'Thermal', state: 'CA', country: 'US' },
  '1 million challenge': { name: 'The Thermal Club', city: 'Thermal', state: 'CA', country: 'US' },
  'long beach': { name: 'Streets of Long Beach', city: 'Long Beach', state: 'CA', country: 'US' },
  alabama: { name: 'Barber Motorsports Park', city: 'Birmingham', state: 'AL', country: 'US' },
  texas: { name: 'Texas Motor Speedway', city: 'Fort Worth', state: 'TX', country: 'US' },
  'indianapolis road course': { name: 'Indianapolis Motor Speedway', city: 'Speedway', state: 'IN', country: 'US' },
  'indianapolis 500': { name: 'Indianapolis Motor Speedway', city: 'Speedway', state: 'IN', country: 'US' },
  indianapolis: { name: 'Indianapolis Motor Speedway', city: 'Speedway', state: 'IN', country: 'US' },
  // Downtown street circuit from 2023; Belle Isle 2007-2022 (no race 2009-11)
  detroit: (year) => (year >= 2023
    ? { name: 'Streets of Detroit', city: 'Detroit', state: 'MI', country: 'US' }
    : { name: 'Belle Isle Park', city: 'Detroit', state: 'MI', country: 'US' }),
  'road america': { name: 'Road America', city: 'Elkhart Lake', state: 'WI', country: 'US' },
  'mid ohio': { name: 'Mid-Ohio Sports Car Course', city: 'Lexington', state: 'OH', country: 'US' },
  toronto: { name: 'Exhibition Place', city: 'Toronto', state: 'ON', country: 'CA' },
  iowa: { name: 'Iowa Speedway', city: 'Newton', state: 'IA', country: 'US' },
  illinois: { name: 'World Wide Technology Raceway', city: 'Madison', state: 'IL', country: 'US' },
  portland: { name: 'Portland International Raceway', city: 'Portland', state: 'OR', country: 'US' },
  'laguna seca': { name: 'WeatherTech Raceway Laguna Seca', city: 'Monterey', state: 'CA', country: 'US' },
  monterey: { name: 'WeatherTech Raceway Laguna Seca', city: 'Monterey', state: 'CA', country: 'US' },
  milwaukee: { name: 'The Milwaukee Mile', city: 'West Allis', state: 'WI', country: 'US' },
  phoenix: { name: 'Phoenix Raceway', city: 'Avondale', state: 'AZ', country: 'US' },
  arlington: { name: 'Streets of Arlington', city: 'Arlington', state: 'TX', country: 'US' },
  ontario: { name: 'Streets of Ontario', city: 'Ontario', state: 'CA', country: 'US' },
  'washington d c': { name: 'Streets of Washington, D.C.', city: 'Washington', state: 'DC', country: 'US' },
  // Nashville: downtown street race only 2021-2023; Nashville Superspeedway
  // before (IRL 2001-2008) and after (2024+)
  nashville: (year) => (year >= 2021 && year <= 2023
    ? { name: 'Streets of Nashville', city: 'Nashville', state: 'TN', country: 'US' }
    : { name: 'Nashville Superspeedway', city: 'Lebanon', state: 'TN', country: 'US' }),

  // ── historical circuits (2002-2020 schedules) ──
  japan: { name: 'Twin Ring Motegi', city: 'Motegi', state: null, country: 'JP' },
  motegi: { name: 'Twin Ring Motegi', city: 'Motegi', state: null, country: 'JP' },
  'homestead miami': { name: 'Homestead-Miami Speedway', city: 'Homestead', state: 'FL', country: 'US' },
  kansas: { name: 'Kansas Speedway', city: 'Kansas City', state: 'KS', country: 'US' },
  richmond: { name: 'Richmond Raceway', city: 'Richmond', state: 'VA', country: 'US' },
  'suntrust indy challenge': { name: 'Richmond Raceway', city: 'Richmond', state: 'VA', country: 'US' },
  michigan: { name: 'Michigan International Speedway', city: 'Brooklyn', state: 'MI', country: 'US' },
  'firestone indy 400': { name: 'Michigan International Speedway', city: 'Brooklyn', state: 'MI', country: 'US' },
  kentucky: { name: 'Kentucky Speedway', city: 'Sparta', state: 'KY', country: 'US' },
  'amber alert portal indy 300': { name: 'Kentucky Speedway', city: 'Sparta', state: 'KY', country: 'US' },
  sonoma: { name: 'Sonoma Raceway', city: 'Sonoma', state: 'CA', country: 'US' },
  infineon: { name: 'Sonoma Raceway', city: 'Sonoma', state: 'CA', country: 'US' },
  'argent mortgage indy grand prix': { name: 'Sonoma Raceway', city: 'Sonoma', state: 'CA', country: 'US' },
  'watkins glen': { name: 'Watkins Glen International', city: 'Watkins Glen', state: 'NY', country: 'US' },
  'the glen': { name: 'Watkins Glen International', city: 'Watkins Glen', state: 'NY', country: 'US' },
  chicagoland: { name: 'Chicagoland Speedway', city: 'Joliet', state: 'IL', country: 'US' },
  chicago: { name: 'Chicagoland Speedway', city: 'Joliet', state: 'IL', country: 'US' },
  'peak antifreeze': { name: 'Chicagoland Speedway', city: 'Joliet', state: 'IL', country: 'US' },
  pocono: { name: 'Pocono Raceway', city: 'Long Pond', state: 'PA', country: 'US' },
  'abc supply 500': { name: 'Pocono Raceway', city: 'Long Pond', state: 'PA', country: 'US' },
  gateway: { name: 'World Wide Technology Raceway', city: 'Madison', state: 'IL', country: 'US' },
  bommarito: { name: 'World Wide Technology Raceway', city: 'Madison', state: 'IL', country: 'US' },
  edmonton: { name: 'Edmonton City Centre Airport', city: 'Edmonton', state: 'AB', country: 'CA' },
  baltimore: { name: 'Streets of Baltimore', city: 'Baltimore', state: 'MD', country: 'US' },
  'sao paulo': { name: 'Streets of Sao Paulo', city: 'Sao Paulo', state: null, country: 'BR' },
  houston: { name: 'NRG Park Street Circuit', city: 'Houston', state: 'TX', country: 'US' },
  louisiana: { name: 'NOLA Motorsports Park', city: 'Avondale', state: 'LA', country: 'US' },
  'mavtv 500': { name: 'Auto Club Speedway', city: 'Fontana', state: 'CA', country: 'US' },
  'firestone 550': { name: 'Texas Motor Speedway', city: 'Fort Worth', state: 'TX', country: 'US' },
  'firestone 550k': { name: 'Texas Motor Speedway', city: 'Fort Worth', state: 'TX', country: 'US' },
  'firestone 600': { name: 'Texas Motor Speedway', city: 'Fort Worth', state: 'TX', country: 'US' },
  'firestone twin 275s': { name: 'Texas Motor Speedway', city: 'Fort Worth', state: 'TX', country: 'US' },
  'bombardier 500': { name: 'Texas Motor Speedway', city: 'Fort Worth', state: 'TX', country: 'US' },
  'genesys 300': { name: 'Texas Motor Speedway', city: 'Fort Worth', state: 'TX', country: 'US' },
  wisconsin: { name: 'The Milwaukee Mile', city: 'West Allis', state: 'WI', country: 'US' },
  'abc supply co a j foyt 225': { name: 'The Milwaukee Mile', city: 'West Allis', state: 'WI', country: 'US' },
  'honda indy 225': { name: 'Pikes Peak International Raceway', city: 'Fountain', state: 'CO', country: 'US' },
  'honda indy 200': { name: 'Mid-Ohio Sports Car Course', city: 'Lexington', state: 'OH', country: 'US' },
  'kohler grand prix': { name: 'Road America', city: 'Elkhart Lake', state: 'WI', country: 'US' },
  'new hampshire': { name: 'New Hampshire Motor Speedway', city: 'Loudon', state: 'NH', country: 'US' },
  'circuit of the americas': { name: 'Circuit of the Americas', city: 'Austin', state: 'TX', country: 'US' },
  'gmr grand prix': { name: 'Indianapolis Motor Speedway', city: 'Speedway', state: 'IN', country: 'US' },
  'harvest grand prix': { name: 'Indianapolis Motor Speedway', city: 'Speedway', state: 'IN', country: 'US' },
  'belle isle': { name: 'Belle Isle Park', city: 'Detroit', state: 'MI', country: 'US' },
  'gold coast': { name: 'Surfers Paradise Street Circuit', city: 'Surfers Paradise', state: null, country: 'AU' },
  // deliberately unmapped: 2015 Brasilia Indy 300 (cancelled race ESPN marks
  // completed) and the 2011 Las Vegas finale (abandoned)
};

// F1 circuit address fixes (ESPN puts a state/wrong city in the city slot)
const F1_CIRCUIT_FIXES = {
  4243: { city: 'Miami Gardens', state: 'FL' },
  4250: { city: 'Las Vegas', state: 'NV' },
  608: { state: 'QC' },
  3985: { city: 'Imola' }, // ESPN says "Rome"
};

// ESPN keys each Grand Prix to its CURRENT circuit, so 2023-25 Spanish GPs all
// report "Madring" (the 2026 Madrid venue). Real venue for those years:
const F1_CATALUNYA = {
  extKey: 'f1:5826', name: 'Circuit de Catalunya',
  city: 'Barcelona', state: null, country: 'ES',
};

// NASCAR core venues sometimes carry decades-old sponsor names; canonical
// renames keyed by ESPN venue id (also dedupes against IndyCar's circuits).
const NASCAR_VENUE_RENAMES = {
  3: 'New Hampshire Motor Speedway',
  4: 'Charlotte Motor Speedway', // ESPN: "Lowe's Motor Speedway"
  5: 'Dover Motor Speedway',
  6: 'Richmond Raceway',
  9: 'Sonoma Raceway', // ESPN: "Infineon Raceway"
  16: 'Phoenix Raceway', // ESPN: "Phoenix International Raceway"
  43: 'World Wide Technology Raceway', // ESPN: "Gateway International Raceway"
};

// NASCAR events whose core record has NO venue (verified 2023-2026:
// Iowa, Mexico City, North Wilkesboro), keyed by the "… at X" suffix.
const NASCAR_VENUE_FALLBACKS = {
  iowa: { name: 'Iowa Speedway', city: 'Newton', state: 'IA', country: 'US' },
  'mexico city': { name: 'Autodromo Hermanos Rodriguez', city: 'Mexico City', state: null, country: 'MX' },
  'north wilkesboro': { name: 'North Wilkesboro Speedway', city: 'North Wilkesboro', state: 'NC', country: 'US' },
  // The core API has no venue record for the New Hampshire fall races
  // (2002-2017) and the Fontana fall races (2002-2010)
  'new hampshire': { name: 'New Hampshire Motor Speedway', city: 'Loudon', state: 'NH', country: 'US' },
  'new hampshire 300': { name: 'New Hampshire Motor Speedway', city: 'Loudon', state: 'NH', country: 'US' },
  'sylvania 300': { name: 'New Hampshire Motor Speedway', city: 'Loudon', state: 'NH', country: 'US' },
  california: { name: 'Auto Club Speedway', city: 'Fontana', state: 'CA', country: 'US' },
  'california pres by principal financial group': { name: 'Auto Club Speedway', city: 'Fontana', state: 'CA', country: 'US' },
  'pop secret 500': { name: 'Auto Club Speedway', city: 'Fontana', state: 'CA', country: 'US' },
  'sony hd 500': { name: 'Auto Club Speedway', city: 'Fontana', state: 'CA', country: 'US' },
  'charlotte 310': { name: 'Charlotte Motor Speedway', city: 'Concord', state: 'NC', country: 'US' },
  // deliberately unmapped: 'daytona 500' — ESPN double-lists the 2021 race
  // under a second id (202102143995); mapping it would insert a duplicate
};

const COUNTRY_ISO = {
  usa: 'US', 'united states': 'US', 'puerto rico': 'PR', canada: 'CA', mexico: 'MX',
  'china pr': 'CN', 'korea republic': 'KR', turkiye: 'TR', slovenia: 'SI',
  andorra: 'AD', philippines: 'PH',
  britain: 'GB', 'great britain': 'GB', uk: 'GB', 'united kingdom': 'GB',
  england: 'GB', scotland: 'GB', wales: 'GB', 'northern ireland': 'GB',
  ireland: 'IE', france: 'FR', monaco: 'MC', spain: 'ES', portugal: 'PT',
  italy: 'IT', germany: 'DE', austria: 'AT', switzerland: 'CH', belgium: 'BE',
  netherlands: 'NL', luxembourg: 'LU', sweden: 'SE', norway: 'NO', denmark: 'DK',
  finland: 'FI', hungary: 'HU', romania: 'RO', bulgaria: 'BG', poland: 'PL',
  'czech republic': 'CZ', czechia: 'CZ', slovakia: 'SK', croatia: 'HR',
  serbia: 'RS', 'bosnia and herzegovina': 'BA', greece: 'GR', turkey: 'TR',
  russia: 'RU', ukraine: 'UA', estonia: 'EE', latvia: 'LV', lithuania: 'LT',
  australia: 'AU', 'new zealand': 'NZ', japan: 'JP', china: 'CN',
  'hong kong': 'HK', taiwan: 'TW', singapore: 'SG', malaysia: 'MY',
  thailand: 'TH', vietnam: 'VN', india: 'IN', indonesia: 'ID',
  'south korea': 'KR', korea: 'KR', kazakhstan: 'KZ', uzbekistan: 'UZ',
  azerbaijan: 'AZ', georgia: 'GE', armenia: 'AM', israel: 'IL',
  'saudi arabia': 'SA', qatar: 'QA', bahrain: 'BH', kuwait: 'KW',
  'united arab emirates': 'AE', uae: 'AE', oman: 'OM',
  egypt: 'EG', morocco: 'MA', tunisia: 'TN', 'south africa': 'ZA',
  brazil: 'BR', argentina: 'AR', chile: 'CL', colombia: 'CO', ecuador: 'EC',
  peru: 'PE', uruguay: 'UY', bolivia: 'BO', 'costa rica': 'CR', panama: 'PA',
  'dominican republic': 'DO', bermuda: 'BM', bahamas: 'BS', jamaica: 'JM',
};
// countries with UTC-4..-8 local time (used to approximate race local dates)
const AMERICAS = new Set(['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'DO', 'PR', 'BM', 'BS', 'JM', 'CR', 'PA', 'EC', 'UY', 'BO']);

const US_STATES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
]);

// ---------------------------------------------------------------------------
// Small utilities (same conventions as seed-real-data.mjs)
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
  if (!args.to) args.to = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);
  for (const d of [args.from, args.to]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) { console.error(`Bad date: ${d} (expected YYYY-MM-DD)`); process.exit(2); }
  }
  for (const l of args.leagues) {
    if (!LEAGUES[l]) { console.error(`Unknown league: ${l} (supported: ${Object.keys(LEAGUES).join(',')})`); process.exit(2); }
  }
  return args;
}

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

/** normalized name with standalone year tokens removed ("2025 masters tournament" -> "masters tournament") */
function stripYears(norm) {
  return norm.replace(/\b(19|20)\d{2}\b/g, ' ').replace(/\s+/g, ' ').trim();
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

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
      await sleep(Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500);
      return fetchJSON(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt + 1 >= MAX_ATTEMPTS || (err.message ?? '').startsWith('HTTP')) throw err;
    await sleep(Math.min(30000, 1000 * 2 ** attempt) + Math.random() * 500);
    return fetchJSON(url, attempt + 1);
  }
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

/**
 * Golf/tennis tournament-level date/endDate values are midnight-US-Eastern
 * markers (start "…T04:00Z", end "…T04:00Z"/"…T03:59Z"). Subtracting 4h maps
 * both onto the correct calendar day (verified: Masters 2025 04-10..04-13,
 * Wimbledon 2025 06-23..07-13).
 */
function markerDate(isoUtc) {
  return new Date(new Date(isoUtc).getTime() - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * Race timestamps are real start times. Local calendar date approximation:
 * Americas venues run UTC-4..-8 (races never start before 06:00 local), the
 * rest of the F1/racing world runs UTC+0..+11 with afternoon starts — so
 * subtract 6h for the Americas and add 4h elsewhere.
 *
 * Pre-~2010 events carry midnight-ET placeholders (T04:00Z/T05:00Z) instead
 * of real start times; shifting those lands a day early (2002 Daytona 500:
 * 2002-02-17T05:00Z -> Feb 16). No race starts at exactly midnight ET/UTC,
 * so treat those as date-only and return the UTC calendar date.
 */
function raceLocalDate(isoUtc, countryIso) {
  if (/T0?[045]:00(:00)?Z?$/.test(isoUtc)) return isoUtc.slice(0, 10);
  const offset = AMERICAS.has(countryIso) ? -6 : +4;
  return new Date(new Date(isoUtc).getTime() + offset * 3600 * 1000).toISOString().slice(0, 10);
}

function addDays(ymd, n) {
  return new Date(new Date(`${ymd}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
}

function daySpan(startYmd, endYmd) {
  return Math.round((new Date(`${endYmd}T00:00:00Z`) - new Date(`${startYmd}T00:00:00Z`)) / 86400000) + 1;
}

function countryIso(name, fallback = 'US') {
  if (!name) return fallback;
  const t = String(name).trim();
  if (/^[A-Z]{2}$/.test(t)) return t;
  const iso = COUNTRY_ISO[normName(t)];
  if (!iso) {
    warnings.push(`unmapped country "${t}" — defaulted to ${fallback}`);
    return fallback;
  }
  return iso;
}

function titleCase(s) {
  return s.replace(/\S+/g, (w) => w[0].toUpperCase() + w.slice(1));
}

function push(map, key, val) {
  const arr = map.get(key);
  if (arr) arr.push(val); else map.set(key, [val]);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const args = parseArgs(process.argv);
const limiter = makeLimiter(CONCURRENCY);
const db = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB });
await db.connect();
if (args.dryRun) await db.query('begin');

console.log(`Seeding field events leagues=[${args.leagues.join(',')}] from=${args.from} to=${args.to}${args.dryRun ? ' (DRY RUN — all changes rolled back)' : ''}`);

const summary = {};
const warnings = [];
const pgaCleanupReport = { updated: [], deleted: [], left: [] };

// --- leagues -----------------------------------------------------------------

async function ensureLeague(cfg) {
  await db.query(
    `insert into leagues (name, slug, sport, event_template, country)
     values ($1, $2, $3, 'field', $4)
     on conflict (slug) do nothing`,
    [cfg.create.name, cfg.slug, cfg.create.sport, cfg.create.country],
  );
  const { rows } = await db.query(`select id from leagues where slug = $1`, [cfg.slug]);
  return rows[0].id;
}

// --- venues -------------------------------------------------------------------

const venueByExt = new Map(); // external_ids.espn -> entry
const venueByName = new Map(); // normalized name -> [entry]

async function loadVenues() {
  const { rows } = await db.query(`select id, name, city, external_ids->>'espn' as espn from venues`);
  for (const v of rows) {
    const entry = { id: v.id, name: v.name, city: v.city, espn: v.espn };
    if (v.espn) venueByExt.set(v.espn, entry);
    push(venueByName, normName(v.name), entry);
  }
  const aliases = await db.query(
    `select va.venue_id, va.alias_name, v.name, v.city, v.external_ids->>'espn' as espn
       from venue_aliases va join venues v on v.id = va.venue_id`,
  );
  for (const a of aliases.rows) {
    push(venueByName, normName(a.alias_name), { id: a.venue_id, name: a.name, city: a.city, espn: a.espn });
  }
}

/**
 * Resolve {extKey?, name, city, state?, country, aliasOf?} to a venue id.
 * Match: external id -> curated alias -> exact normalized name -> unique
 * substring containment -> insert.
 */
async function resolveVenue(spec, stats) {
  const { extKey, name } = spec;
  if (extKey && venueByExt.has(extKey)) return venueByExt.get(extKey).id;

  const norm = normName(name);
  let matched = null;
  const aliasTarget = spec.aliasOf ?? GOLF_COURSE_ALIASES[norm];
  if (aliasTarget && venueByName.get(aliasTarget)?.length >= 1) matched = venueByName.get(aliasTarget)[0];
  if (!matched && venueByName.get(norm)?.length >= 1) matched = venueByName.get(norm)[0];
  if (!matched && norm.length >= 8) {
    const hits = new Map();
    for (const [key, entries] of venueByName) {
      if (key.length >= 8 && (norm.includes(key) || key.includes(norm))) {
        for (const e of entries) hits.set(e.id, e);
      }
    }
    if (hits.size === 1) matched = [...hits.values()][0];
  }

  if (matched) {
    // older ESPN seasons sometimes lack location data — if the venue was
    // created with a placeholder city and we now know better, fix it
    if (matched.city === 'Unknown' && spec.city && spec.city !== 'Unknown') {
      await db.query(
        `update venues set city = $1, state = $2, country = $3 where id = $4 and city = 'Unknown'`,
        [spec.city, spec.state ?? null, spec.country || 'US', matched.id],
      );
      matched.city = spec.city;
    }
    if (extKey && !matched.espn) {
      await db.query(
        `update venues set external_ids = external_ids || jsonb_build_object('espn', $1::text)
          where id = $2 and not external_ids ? 'espn'`,
        [extKey, matched.id],
      );
      matched.espn = extKey;
    }
    if (extKey) venueByExt.set(extKey, matched);
    if (name && normName(matched.name) !== norm) {
      await db.query(
        `insert into venue_aliases (venue_id, alias_name)
         select $1, $2 where not exists
           (select 1 from venue_aliases where venue_id = $1 and lower(alias_name) = lower($2))`,
        [matched.id, name],
      );
      push(venueByName, norm, matched);
    }
    stats.venuesMatched++;
    return matched.id;
  }

  const city = spec.city || 'Unknown';
  const state = spec.state && US_STATES.has(spec.state.toUpperCase()) ? spec.state.toUpperCase() : (spec.state ?? null);
  const country = spec.country || 'US';
  const ext = extKey ? { espn: extKey } : {};
  const { rows } = await db.query(
    `insert into venues (name, city, state, country, status, external_ids)
     values ($1, $2, $3, $4, 'active', $5) returning id`,
    [name, city, state, country, JSON.stringify(ext)],
  );
  const entry = { id: rows[0].id, name, city, espn: extKey ?? null };
  if (extKey) venueByExt.set(extKey, entry);
  push(venueByName, norm, entry);
  stats.venuesCreated++;
  console.log(`  created venue: ${name} (${city}${state ? ', ' + state : ''}, ${country})${extKey ? ` [${extKey}]` : ''}`);
  return entry.id;
}

// --- existing-event preload -----------------------------------------------------

async function loadExistingEvents(leagueId) {
  const { rows } = await db.query(
    `select id, external_ids->>'espn' as espn, tournament_name, tournament_id,
            day_number, event_date::text as event_date, season, venue_id,
            exists (select 1 from event_logs el where el.event_id = events.id) as has_logs
       from events where league_id = $1`,
    [leagueId],
  );
  const extSet = new Set();
  const tidByBase = new Map(); // espn base event id -> tournament_id
  const handRows = [];
  for (const r of rows) {
    if (r.espn) {
      extSet.add(r.espn);
      const m = r.espn.match(/^(.*)-d\d+$/);
      if (m && r.tournament_id) tidByBase.set(m[1], r.tournament_id);
    } else {
      handRows.push(r);
    }
  }
  return { extSet, tidByBase, handRows };
}

// --- scoreboard fetch (dedupes events that straddle chunk boundaries) ------------

function shiftYmd(compact, days) {
  const d = new Date(`${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}T00:00:00Z`);
  return new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
}

async function fetchScoreboardEvents(cfg, mergeFn) {
  const chunks = [...dateChunks(args.from, args.to, CHUNK_DAYS)];
  // ESPN's range filter can drop events sitting exactly on a window boundary
  // (verified: racing/irl 2023-08-12 missing from both 0716-0812 and
  // 0813-0909) — widen every window by a day on each side; the id-dedupe
  // below absorbs the overlap.
  const results = await Promise.all(chunks.map(([a0, b0]) => limiter(async () => {
    const [a, b] = [shiftYmd(a0, -1), shiftYmd(b0, 1)];
    const url = `https://site.api.espn.com/apis/site/v2/sports/${cfg.path}/scoreboard?dates=${a}-${b}&limit=1000`;
    try {
      const data = await fetchJSON(url);
      return data.events ?? [];
    } catch (err) {
      warnings.push(`[${cfg.slug}] scoreboard chunk ${a}-${b} failed: ${err.message}`);
      return [];
    }
  })));
  const byId = new Map();
  for (const ev of results.flat()) {
    const prev = byId.get(String(ev.id));
    if (!prev) byId.set(String(ev.id), ev);
    else if (mergeFn) mergeFn(prev, ev);
  }
  return [...byId.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

// ---------------------------------------------------------------------------
// Golf
// ---------------------------------------------------------------------------

function golfTags(name) {
  return GOLF_MAJOR_TAGS[stripYears(normName(name))] ?? null;
}

/** hand-seed match key: year-stripped normalized tournament name + season */
function golfHandKey(name, season) {
  let key = stripYears(normName(name));
  key = GOLF_NAME_EQUIV[key] ?? key;
  return `${key}|${season}`;
}

async function seedGolf(leagueKey, cfg, leagueId, stats) {
  const events = await fetchScoreboardEvents(cfg);
  const { extSet, tidByBase, handRows } = await loadExistingEvents(leagueId);

  const handIndex = new Map();
  for (const r of handRows) handIndex.set(golfHandKey(r.tournament_name ?? '', r.season), r);

  for (const ev of events) {
    const id = String(ev.id);
    if (ev.status?.type?.completed !== true) { stats.filtered++; continue; }
    if (!ev.endDate) { stats.filtered++; continue; }
    const startDay = markerDate(ev.date);
    const endDay = markerDate(ev.endDate);
    if (endDay > args.to || endDay < args.from) { stats.filtered++; continue; }
    const n = daySpan(startDay, endDay);
    if (n < 1 || n > MAX_GOLF_DAYS) {
      warnings.push(`[${cfg.slug}] skipped ${ev.name} (${startDay}..${endDay}: ${n} days)`);
      stats.filtered++;
      continue;
    }

    const season = Number(startDay.slice(0, 4));
    const hand = handIndex.get(golfHandKey(ev.name, season)) ?? null;
    const missing = [];
    for (let d = 1; d <= n; d++) if (!extSet.has(`${id}-d${d}`)) missing.push(d);
    if (missing.length === 0 && !hand) { stats.skipped++; continue; }

    // venue + winner from the per-event leaderboard
    let lb;
    try {
      lb = await limiter(() => fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${id}`));
    } catch (err) {
      warnings.push(`[${cfg.slug}] leaderboard fetch failed for ${ev.name} (${id}): ${err.message} — tournament skipped`);
      stats.errored++;
      continue;
    }
    const lbEvent = lb.events?.[0];
    const courses = lbEvent?.courses ?? [];
    const course = courses.find((c) => c.host) ?? courses[0];
    let venueSpec;
    if (course?.name) {
      const addr = course.address ?? {};
      venueSpec = {
        extKey: `golf:${course.id}`,
        name: course.name,
        city: addr.city ?? 'Unknown',
        state: addr.state ?? null,
        country: countryIso(addr.country),
      };
    } else {
      venueSpec = GOLF_COURSE_FALLBACKS[`${season} ${stripYears(normName(ev.name))}`] ?? null;
    }
    if (!venueSpec) {
      warnings.push(`[${cfg.slug}] no course data for ${ev.name} (${id}) — tournament skipped`);
      stats.errored++;
      continue;
    }
    const winner = lbEvent?.winner?.displayName ?? null;
    const venueId = await resolveVenue(venueSpec, stats);

    const tags = golfTags(ev.name);
    const isPost = GOLF_POSTSEASON.has(stripYears(normName(ev.name)));
    const tournamentId = tidByBase.get(id) ?? (hand?.tournament_id || crypto.randomUUID());
    tidByBase.set(id, tournamentId);

    let handledFinal = false;
    if (hand) {
      const finalExt = `${id}-d${n}`;
      if (!extSet.has(finalExt)) {
        await db.query(
          `update events set
             venue_id = $1, event_date = $2, event_template = 'field',
             tournament_name = $3, tournament_id = $4, day_number = $5,
             winner_name = coalesce($6, winner_name), season = $7, is_postseason = $8,
             round_or_stage = 'Final Round', event_tags = $9,
             external_ids = external_ids || jsonb_build_object('espn', $10::text)
           where id = $11`,
          [venueId, endDay, ev.name, tournamentId, n, winner, season, isPost,
            tags, finalExt, hand.id],
        );
        extSet.add(finalExt);
        handledFinal = true;
        stats.handUpdated++;
        pgaCleanupReport.updated.push(`"${hand.tournament_name}" (${hand.event_date}) -> "${ev.name}" final day ${endDay}, espn ${finalExt}`);
      }
      handIndex.delete(golfHandKey(ev.name, season));
    }

    for (const d of missing) {
      if (d === n && handledFinal) continue;
      const ext = `${id}-d${d}`;
      await db.query(
        `insert into events (
           league_id, venue_id, event_date, event_template, tournament_name,
           tournament_id, day_number, winner_name, season, is_postseason,
           round_or_stage, event_tags, external_ids
         ) values ($1,$2,$3,'field',$4,$5,$6,$7,$8,$9,$10,$11, jsonb_build_object('espn', $12::text))`,
        [leagueId, venueId, addDays(startDay, d - 1), ev.name, tournamentId, d,
          winner, season, isPost, d === n ? 'Final Round' : `Round ${d}`, tags, ext],
      );
      extSet.add(ext);
      stats.inserted++;
    }
    stats.tournaments++;
  }

  // cleanup of unmatched hand-seeded rows — only those dated inside the
  // seeded window (a partial run must not delete rows it never tried to match)
  for (const r of handIndex.values()) {
    if (r.event_date < args.from || r.event_date > args.to) continue;
    if (r.has_logs) {
      stats.handLeft++;
      pgaCleanupReport.left.push(`"${r.tournament_name}" (${r.event_date}) — has event_logs, matched nothing`);
      continue;
    }
    const del = await db.query(
      `delete from events e where e.id = $1
         and not exists (select 1 from event_logs where event_id = $1)
         and not exists (select 1 from profiles where fav_event_id = $1)
         and not exists (select 1 from user_league_favorites where event_id = $1)
         and not exists (select 1 from venues where current_cover_event_id = $1)
       returning id`,
      [r.id],
    );
    if (del.rowCount === 1) {
      stats.handDeleted++;
      pgaCleanupReport.deleted.push(`"${r.tournament_name}" (${r.event_date}) — matched nothing, no references`);
    } else {
      stats.handLeft++;
      pgaCleanupReport.left.push(`"${r.tournament_name}" (${r.event_date}) — matched nothing, kept (referenced)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Tennis
// ---------------------------------------------------------------------------

function mergeTennisEvent(into, ev) {
  // scoreboard chunks repeat tournaments that straddle window edges; merge
  // their grouping competitions (needed to locate the singles final)
  for (const g of ev.groupings ?? []) {
    const slug = g.grouping?.slug;
    const target = (into.groupings ?? []).find((x) => x.grouping?.slug === slug);
    if (!target) { (into.groupings ??= []).push(g); continue; }
    const have = new Set((target.competitions ?? []).map((c) => String(c.id)));
    for (const c of g.competitions ?? []) {
      if (!have.has(String(c.id))) (target.competitions ??= []).push(c);
    }
  }
}

function tennisWinner(ev, singlesSlug) {
  const grouping = (ev.groupings ?? []).find((g) => g.grouping?.slug === singlesSlug)
    ?? (ev.groupings ?? []).find((g) => (g.grouping?.slug ?? '').includes('singles'));
  if (!grouping) return null;
  let last = null;
  for (const c of grouping.competitions ?? []) {
    if (c.status?.type?.completed !== true) continue;
    if (!last || (c.date ?? '') > (last.date ?? '')) last = c;
  }
  const w = (last?.competitors ?? []).find((c) => c.winner === true);
  return w?.athlete?.displayName ?? null;
}

function tennisVenueSpec(ev) {
  const norm = stripYears(normName(ev.name));
  if (TENNIS_MAJOR_VENUES[norm]) return TENNIS_MAJOR_VENUES[norm];
  // ESPN tennis "venue" is "City, Country" on each competition
  let loc = null;
  for (const g of ev.groupings ?? []) {
    for (const c of g.competitions ?? []) {
      if (c.venue?.fullName) { loc = c.venue.fullName; break; }
    }
    if (loc) break;
  }
  let city = 'Unknown';
  let state = null;
  let country = 'US';
  if (loc) {
    const parts = loc.split(',').map((s) => s.trim());
    city = parts[0] || 'Unknown';
    country = countryIso(parts[parts.length - 1]);
  } else {
    const fb = TENNIS_CITY_FALLBACKS.find(([needle]) => norm.includes(needle));
    if (fb) ({ city, state, country } = fb[1]);
  }
  return { name: `${ev.name} Site`, city, state, country };
}

async function seedTennis(leagueKey, cfg, leagueId, stats) {
  const events = await fetchScoreboardEvents(cfg, mergeTennisEvent);
  const { extSet, tidByBase } = await loadExistingEvents(leagueId);

  for (const ev of events) {
    const id = String(ev.id);
    if (!ev.endDate) { stats.filtered++; continue; }
    if (ev.status?.type && ev.status.type.completed !== true) { stats.filtered++; continue; }
    const spanStart = markerDate(ev.date);
    const endDay = markerDate(ev.endDate);
    if (endDay > args.to || endDay < args.from) { stats.filtered++; continue; }
    let n = daySpan(spanStart, endDay);
    if (n < 1 || n > 40) { stats.filtered++; continue; } // bad data guard
    if (n > MAX_TENNIS_DAYS) n = MAX_TENNIS_DAYS; // keep the LAST 15 days
    const startDay = addDays(endDay, -(n - 1));

    const missing = [];
    for (let d = 1; d <= n; d++) if (!extSet.has(`${id}-d${d}`)) missing.push(d);
    if (missing.length === 0) { stats.skipped++; continue; }

    const venueId = await resolveVenue(tennisVenueSpec(ev), stats);
    const winner = tennisWinner(ev, cfg.singles);
    const tags = TENNIS_SLAM_TAGS[stripYears(normName(ev.name))] ?? null;
    const season = Number(ev.season?.year) || Number(startDay.slice(0, 4));
    const tournamentId = tidByBase.get(id) ?? crypto.randomUUID();
    tidByBase.set(id, tournamentId);

    for (const d of missing) {
      const ext = `${id}-d${d}`;
      await db.query(
        `insert into events (
           league_id, venue_id, event_date, event_template, tournament_name,
           tournament_id, day_number, winner_name, season, is_postseason,
           round_or_stage, event_tags, external_ids
         ) values ($1,$2,$3,'field',$4,$5,$6,$7,$8,false,$9,$10, jsonb_build_object('espn', $11::text))`,
        [leagueId, venueId, addDays(startDay, d - 1), ev.name, tournamentId, d,
          winner, season, d === n ? 'Final' : `Day ${d}`, tags, ext],
      );
      extSet.add(ext);
      stats.inserted++;
    }
    stats.tournaments++;
  }
}

// ---------------------------------------------------------------------------
// Racing
// ---------------------------------------------------------------------------

const racingVenueCache = new Map(); // core $ref -> venue json

async function nascarVenueSpec(cfg, ev) {
  const core = await limiter(() => fetchJSON(
    `https://sports.core.api.espn.com/v2/sports/racing/leagues/${cfg.coreLeague}/events/${ev.id}?lang=en&region=us`,
  ));
  const ref = core.venues?.[0]?.$ref;
  if (!ref) {
    const key = normName((ev.name ?? '').replace(/^.*\bat\b/i, ''));
    return NASCAR_VENUE_FALLBACKS[key] ?? null;
  }
  const url = ref.replace('http://', 'https://');
  let v = racingVenueCache.get(url);
  if (!v) {
    v = await limiter(() => fetchJSON(url));
    racingVenueCache.set(url, v);
  }
  const addr = v.address ?? {};
  return {
    extKey: `${cfg.extPrefix}:${v.id}`,
    name: NASCAR_VENUE_RENAMES[Number(v.id)] ?? v.fullName,
    city: addr.city ? titleCase(addr.city) : 'Unknown',
    state: addr.state ?? null,
    country: countryIso(addr.country),
  };
}

function f1VenueSpec(cfg, ev) {
  const c = ev.circuit;
  if (!c?.fullName) return null;
  // ESPN retro-keys the Spanish GP to Madring; 2023-25 ran at Catalunya
  if (String(c.id) === '605' && (Number(ev.season?.year) || 9999) < 2026) {
    return F1_CATALUNYA;
  }
  const fix = F1_CIRCUIT_FIXES[c.id] ?? {};
  const addr = c.address ?? {};
  return {
    extKey: `${cfg.extPrefix}:${c.id}`,
    name: c.fullName,
    city: fix.city ?? (addr.city ? titleCase(addr.city) : 'Unknown'),
    state: fix.state ?? addr.state ?? null,
    country: countryIso(addr.country),
  };
}

function indycarVenueSpec(ev) {
  const year = Number(ev.season?.year) || Number((ev.date ?? '').slice(0, 4));
  const key = stripYears(normName(ev.name))
    .replace(/^grand prix of /, '')
    .replace(/\brace \d+$/, '')
    .trim();
  let hit = INDYCAR_VENUES[key];
  // Historical names wrap the circuit in sponsor noise ("The 92nd
  // Indianapolis 500 Telecast Presented by GoDaddy.com", "Toyota Grand Prix
  // of Long Beach") — fall back to whole-word substring matching, longest
  // key first so "indianapolis 500" beats shorter overlaps.
  if (!hit) {
    if (/\bindianapolis 500\b|\bindy 500\b/.test(key)) {
      hit = INDYCAR_VENUES['indianapolis 500'];
    } else {
      const keys = Object.keys(INDYCAR_VENUES).sort((a, b) => b.length - a.length);
      const sub = keys.find((k) => new RegExp(`\\b${k}\\b`).test(key));
      if (sub) hit = INDYCAR_VENUES[sub];
    }
  }
  if (!hit) return null;
  return typeof hit === 'function' ? hit(year) : hit;
}

async function seedRacing(leagueKey, cfg, leagueId, stats) {
  const events = await fetchScoreboardEvents(cfg);
  const { extSet } = await loadExistingEvents(leagueId);

  for (const ev of events) {
    const id = String(ev.id);
    if (ev.status?.type?.completed !== true) { stats.filtered++; continue; }
    if (ev.season?.type === 1 || ev.season?.type === 4) { stats.filtered++; continue; } // pre/off-season
    if (leagueKey === 'nascar' && NASCAR_EXHIBITION_RE.test(ev.name ?? '')) { stats.filtered++; continue; }
    if (extSet.has(id)) { stats.skipped++; continue; }

    // the race competition (F1 weekends also list FP/Quali/Sprint sessions)
    let raceComp = null;
    if (leagueKey === 'f1') {
      raceComp = (ev.competitions ?? []).find((c) => c.type?.abbreviation === 'Race');
      if (!raceComp) { stats.filtered++; continue; } // testing weekends etc.
    } else {
      raceComp = ev.competitions?.[0] ?? null;
    }

    let venueSpec = null;
    try {
      if (leagueKey === 'f1') venueSpec = f1VenueSpec(cfg, ev);
      else if (leagueKey === 'nascar') venueSpec = await nascarVenueSpec(cfg, ev);
      else venueSpec = indycarVenueSpec(ev);
    } catch (err) {
      warnings.push(`[${cfg.slug}] venue lookup failed for ${ev.name} (${id}): ${err.message} — race skipped`);
      stats.errored++;
      continue;
    }
    if (!venueSpec) {
      warnings.push(`[${cfg.slug}] no venue for ${ev.name} (${id}) — race skipped`);
      stats.errored++;
      continue;
    }
    const venueId = await resolveVenue(venueSpec, stats);

    const raceDate = raceLocalDate(raceComp?.date ?? ev.date, venueSpec.country ?? 'US');
    if (raceDate > args.to || raceDate < args.from) { stats.filtered++; continue; }

    const winner = (raceComp?.competitors ?? []).find((c) => c.winner === true)?.athlete?.displayName
      ?? (raceComp?.competitors ?? []).find((c) => c.order === 1)?.athlete?.displayName
      ?? null;
    const season = Number(ev.season?.year) || Number(raceDate.slice(0, 4));
    const isPost = ev.season?.type === 3;

    await db.query(
      `insert into events (
         league_id, venue_id, event_date, event_template, tournament_name,
         winner_name, season, is_postseason, external_ids
       ) values ($1,$2,$3,'field',$4,$5,$6,$7, jsonb_build_object('espn', $8::text))`,
      [leagueId, venueId, raceDate, String(ev.name ?? '').trim(), winner, season, isPost, id],
    );
    extSet.add(id);
    stats.inserted++;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let failed = false;
try {
  await loadVenues();
  for (const key of args.leagues) {
    const cfg = LEAGUES[key];
    const stats = {
      tournaments: 0, inserted: 0, skipped: 0, filtered: 0, errored: 0,
      venuesMatched: 0, venuesCreated: 0,
      handUpdated: 0, handDeleted: 0, handLeft: 0,
    };
    summary[key] = stats;
    console.log(`\n=== ${cfg.slug.toUpperCase()} ===`);
    const leagueId = await ensureLeague(cfg);
    if (cfg.kind === 'golf') await seedGolf(key, cfg, leagueId, stats);
    else if (cfg.kind === 'tennis') await seedTennis(key, cfg, leagueId, stats);
    else await seedRacing(key, cfg, leagueId, stats);
    console.log(`  [${cfg.slug}] tournaments/races processed=${stats.tournaments || stats.inserted} ` +
      `rows inserted=${stats.inserted} skipped=${stats.skipped} filtered=${stats.filtered} errored=${stats.errored}; ` +
      `venues matched=${stats.venuesMatched} created=${stats.venuesCreated}` +
      (key === 'pga' ? `; hand-seed updated=${stats.handUpdated} deleted=${stats.handDeleted} left=${stats.handLeft}` : ''));
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
for (const [key, s] of Object.entries(summary)) {
  console.log(
    `${key.padEnd(8)} rows inserted=${s.inserted} skipped=${s.skipped} filtered=${s.filtered} errored=${s.errored} | ` +
    `venues matched=${s.venuesMatched} created=${s.venuesCreated}` +
    (key === 'pga' ? ` | hand-seed updated=${s.handUpdated} deleted=${s.handDeleted} left=${s.handLeft}` : ''),
  );
}
if (pgaCleanupReport.updated.length || pgaCleanupReport.deleted.length || pgaCleanupReport.left.length) {
  console.log('\n--- PGA hand-seed cleanup ---');
  for (const m of pgaCleanupReport.updated) console.log(`  UPDATED ${m}`);
  for (const m of pgaCleanupReport.deleted) console.log(`  DELETED ${m}`);
  for (const m of pgaCleanupReport.left) console.log(`  LEFT    ${m}`);
}
if (warnings.length) {
  console.log(`\n--- warnings (${warnings.length}) ---`);
  for (const w of warnings.slice(0, 50)) console.log(`  ${w}`);
  if (warnings.length > 50) console.log(`  ... and ${warnings.length - 50} more`);
}
process.exit(failed ? 1 : 0);
