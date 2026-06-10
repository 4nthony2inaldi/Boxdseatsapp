#!/usr/bin/env node
/**
 * seed-athletes.mjs — populates the athletes table (favorite-athlete picker)
 * from ESPN public APIs.
 *
 * Sources:
 *  - Team sports (NFL/NBA/MLB/NHL/MLS): current rosters via
 *    /sports/{sport}/{league}/teams/{espnTeamId}/roster for every team in our
 *    teams table that carries external_ids.espn (~5,000 athletes).
 *  - Tennis: current ATP + WTA top-150 via /tennis/{tour}/rankings.
 *  - Golf: fields of recent marquee tournaments (majors + PLAYERS + TOUR
 *    Championship over the last ~18 months) via the leaderboard endpoint —
 *    ESPN's golf rankings endpoint 500s, so this is the reliable “notable
 *    players” source (~200 athletes incl. LIV players who enter majors).
 *  - Racing (NASCAR Cup / IndyCar / F1): every driver who started a race in
 *    the last ~18 months, from scoreboard competitor lists (~90 drivers).
 *
 * Matching / idempotency:
 *  - A partial unique index on (sport, external_ids->>'espn') is created if
 *    missing (ESPN athlete ids are only unique per sport namespace; racing
 *    shares one namespace across its three leagues).
 *  - Existing athletes (the hand-seeded ones have empty external_ids) are
 *    matched by sport + normalized name and ENRICHED with the ESPN id and a
 *    headshot; everyone else is inserted. Re-runs skip rows whose
 *    (sport, espn id) already exists.
 *  - Headshots: roster/leaderboard payloads carry a headshot href; tennis and
 *    racing don't, so the canonical CDN pattern is used after a HEAD check
 *    (a.espncdn.com/i/headshots/{tennis|rpm}/players/full/{id}.png).
 *
 * Usage:  node scripts/data/seed-athletes.mjs [--sports=teams,golf,tennis,racing] [--dry-run]
 * Env:    DATABASE_URL (defaults to local test DB)
 */

import pg from 'pg';

const { Client } = pg;

const DEFAULT_DB = 'postgres://boxd:boxd@localhost:5432/boxdseats';
const CONCURRENCY = 8;

const TEAM_LEAGUES = [
  { slug: 'nfl', sport: 'football', path: 'football/nfl' },
  { slug: 'nba', sport: 'basketball', path: 'basketball/nba' },
  { slug: 'mlb', sport: 'baseball', path: 'baseball/mlb' },
  { slug: 'nhl', sport: 'hockey', path: 'hockey/nhl' },
  { slug: 'mls', sport: 'soccer', path: 'soccer/usa.1' },
];

const RACING_PATHS = ['racing/nascar-premier', 'racing/irl', 'racing/f1'];

// golf events worth pulling fields from (normalized, year-stripped names)
const GOLF_MARQUEE = new Set([
  'masters tournament', 'pga championship', 'u s open', 'the open',
  'the players championship', 'tour championship',
]);
const LOOKBACK_DAYS = 550;

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { sports: ['teams', 'golf', 'tennis', 'racing'], dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--sports=')) args.sports = a.slice(9).split(',').map((s) => s.trim()).filter(Boolean);
    else { console.error(`Unknown argument: ${a}`); process.exit(2); }
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

/** HEAD-check a CDN headshot URL (tennis/racing have no headshot in payloads) */
const headCache = new Map();
async function checkedHeadshot(url) {
  if (headCache.has(url)) return headCache.get(url);
  let result = null;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) result = url;
  } catch { /* unreachable CDN -> no headshot */ }
  headCache.set(url, result);
  return result;
}

// ---------------------------------------------------------------------------

const args = parseArgs(process.argv);
const limiter = makeLimiter(CONCURRENCY);
const db = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB });
await db.connect();

// uniqueness guard (the external-ids migration added GIN but no unique index
// for athletes). ESPN athlete ids are per-sport-namespace -> scope by sport.
await db.query(
  `create unique index if not exists uq_athletes_espn_id
     on public.athletes (sport, (external_ids->>'espn'))
     where external_ids ? 'espn'`,
);

if (args.dryRun) await db.query('begin');
console.log(`Seeding athletes sources=[${args.sports.join(',')}]${args.dryRun ? ' (DRY RUN — all changes rolled back)' : ''}`);

const byKey = new Map(); // `${sport}|${espnId}` -> row
const byName = new Map(); // `${sport}|${normName}` -> [rows without espn id]
{
  const { rows } = await db.query(
    `select id, name, sport, headshot_url, external_ids->>'espn' as espn from athletes`,
  );
  for (const r of rows) {
    if (r.espn) byKey.set(`${r.sport}|${r.espn}`, r);
    else {
      const k = `${r.sport}|${normName(r.name)}`;
      if (!byName.has(k)) byName.set(k, []);
      byName.get(k).push(r);
    }
  }
}

const stats = {};
function stat(src) {
  return (stats[src] ??= { inserted: 0, enriched: 0, skipped: 0, errored: 0 });
}

async function upsertAthlete(src, sport, espnId, name, headshot, isActive = true) {
  if (!espnId || !name) return;
  const s = stat(src);
  const key = `${sport}|${espnId}`;
  const existing = byKey.get(key);
  if (existing) {
    if (!existing.headshot_url && headshot) {
      await db.query(`update athletes set headshot_url = $1 where id = $2`, [headshot, existing.id]);
      existing.headshot_url = headshot;
    }
    s.skipped++;
    return;
  }
  const nameKey = `${sport}|${normName(name)}`;
  const candidates = byName.get(nameKey) ?? [];
  const hand = candidates.shift(); // enrich at most one espn-less row per name
  if (hand) {
    await db.query(
      `update athletes set
         external_ids = external_ids || jsonb_build_object('espn', $1::text),
         headshot_url = coalesce(headshot_url, $2),
         is_active = $3
       where id = $4`,
      [String(espnId), headshot, isActive, hand.id],
    );
    hand.espn = String(espnId);
    byKey.set(key, hand);
    s.enriched++;
    console.log(`  enriched existing athlete: ${hand.name} (${sport}, espn ${espnId})`);
    return;
  }
  const { rows } = await db.query(
    `insert into athletes (name, sport, headshot_url, is_active, external_ids)
     values ($1, $2, $3, $4, jsonb_build_object('espn', $5::text)) returning id`,
    [name, sport, headshot, isActive, String(espnId)],
  );
  byKey.set(key, { id: rows[0].id, name, sport, headshot_url: headshot, espn: String(espnId) });
  s.inserted++;
}

/** fetch a scoreboard over the lookback window in <=180-day chunks (ESPN
 *  rejects very long dates= ranges) and merge events by id */
async function fetchLookbackEvents(path) {
  const ranges = [];
  let end = Date.now() - 24 * 3600 * 1000;
  const limitTs = Date.now() - LOOKBACK_DAYS * 24 * 3600 * 1000;
  while (end > limitTs) {
    const start = Math.max(limitTs, end - 179 * 24 * 3600 * 1000);
    ranges.push([new Date(start), new Date(end)]);
    end = start - 24 * 3600 * 1000;
  }
  const fmt = (d) => d.toISOString().slice(0, 10).replace(/-/g, '');
  const results = await Promise.all(ranges.map(([a, b]) => limiter(() => fetchJSON(
    `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${fmt(a)}-${fmt(b)}&limit=1000`,
  ))));
  const byId = new Map();
  for (const r of results) {
    for (const e of r.events ?? []) if (!byId.has(String(e.id))) byId.set(String(e.id), e);
  }
  return [...byId.values()];
}

// --- team sports ---------------------------------------------------------------

async function seedTeamSports() {
  for (const lg of TEAM_LEAGUES) {
    const { rows: teams } = await db.query(
      `select t.name, t.external_ids->>'espn' as espn
         from teams t join leagues l on l.id = t.league_id
        where l.slug = $1 and t.external_ids ? 'espn'`,
      [lg.slug],
    );
    const src = lg.slug;
    const results = await Promise.allSettled(teams.map((t) => limiter(async () => {
      const data = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/${lg.path}/teams/${t.espn}/roster`);
      const groups = data.athletes ?? [];
      // NFL/NHL/MLB group by position ({position, items}); NBA/MLS are flat
      const players = groups.flatMap((g) => (g && typeof g === 'object' && Array.isArray(g.items) ? g.items : [g]));
      return players;
    })));
    let players = [];
    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'fulfilled') players.push(...results[i].value);
      else {
        stat(src).errored++;
        console.error(`  [${src}] roster fetch failed for ${teams[i].name}: ${results[i].reason?.message}`);
      }
    }
    for (const p of players) {
      if (!p?.id) continue;
      const name = p.displayName ?? p.fullName;
      const headshot = p.headshot?.href ?? null;
      const isActive = p.status?.type ? p.status.type === 'active' : true;
      await upsertAthlete(src, lg.sport, String(p.id), name, headshot, isActive);
    }
    const s = stat(src);
    console.log(`  [${src}] inserted=${s.inserted} enriched=${s.enriched} skipped=${s.skipped} errored=${s.errored}`);
  }
}

// --- tennis ----------------------------------------------------------------------

async function seedTennis() {
  for (const tour of ['atp', 'wta']) {
    const src = `tennis-${tour}`;
    let data;
    try {
      data = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/tennis/${tour}/rankings`);
    } catch (err) {
      stat(src).errored++;
      console.error(`  [${src}] rankings fetch failed: ${err.message}`);
      continue;
    }
    const ranks = data.rankings?.[0]?.ranks ?? [];
    await Promise.all(ranks.map((r) => limiter(async () => {
      const a = r.athlete;
      if (!a?.id) return;
      const headshot = await checkedHeadshot(`https://a.espncdn.com/i/headshots/tennis/players/full/${a.id}.png`);
      await upsertAthlete(src, 'tennis', String(a.id), a.displayName, headshot, true);
    })));
    const s = stat(src);
    console.log(`  [${src}] top-${ranks.length}: inserted=${s.inserted} enriched=${s.enriched} skipped=${s.skipped}`);
  }
}

// --- golf -------------------------------------------------------------------------

async function seedGolf() {
  const src = 'golf';
  const events = await fetchLookbackEvents('golf/pga');
  const targets = events.filter((e) => e.status?.type?.completed === true
    && GOLF_MARQUEE.has(stripYears(normName(e.name))));
  console.log(`  [golf] pulling fields from ${targets.length} marquee tournaments`);
  const fields = await Promise.allSettled(targets.map((e) => limiter(() => fetchJSON(
    `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${e.id}`,
  ))));
  const seen = new Map(); // espn id -> {name, headshot}
  for (const f of fields) {
    if (f.status !== 'fulfilled') { stat(src).errored++; continue; }
    for (const c of f.value.events?.[0]?.competitions?.[0]?.competitors ?? []) {
      const a = c.athlete;
      if (!a?.id || seen.has(String(a.id))) continue;
      seen.set(String(a.id), {
        name: a.displayName,
        headshot: a.headshot?.href ?? null,
      });
    }
  }
  for (const [id, a] of seen) await upsertAthlete(src, 'golf', id, a.name, a.headshot, true);
  const s = stat(src);
  console.log(`  [golf] ${seen.size} players: inserted=${s.inserted} enriched=${s.enriched} skipped=${s.skipped}`);
}

// --- racing ----------------------------------------------------------------------

async function seedRacing() {
  const src = 'racing';
  const seen = new Map(); // espn id -> name
  for (const path of RACING_PATHS) {
    try {
      const events = await fetchLookbackEvents(path);
      for (const ev of events) {
        for (const comp of ev.competitions ?? []) {
          for (const c of comp.competitors ?? []) {
            const a = c.athlete;
            // racing athlete objects carry no id; the competitor id IS the
            // athlete id (uid "s:2000~a:<id>")
            const id = c.id ?? a?.id;
            if (a && id != null && !seen.has(String(id))) seen.set(String(id), a.displayName ?? a.fullName);
          }
        }
      }
    } catch (err) {
      stat(src).errored++;
      console.error(`  [racing] scoreboard fetch failed for ${path}: ${err.message}`);
    }
  }
  await Promise.all([...seen].map(([id, name]) => limiter(async () => {
    const headshot = await checkedHeadshot(`https://a.espncdn.com/i/headshots/rpm/players/full/${id}.png`);
    await upsertAthlete(src, 'motorsports', id, name, headshot, true);
  })));
  const s = stat(src);
  console.log(`  [racing] ${seen.size} drivers: inserted=${s.inserted} enriched=${s.enriched} skipped=${s.skipped}`);
}

// ---------------------------------------------------------------------------

let failed = false;
try {
  if (args.sports.includes('teams')) await seedTeamSports();
  if (args.sports.includes('tennis')) await seedTennis();
  if (args.sports.includes('golf')) await seedGolf();
  if (args.sports.includes('racing')) await seedRacing();
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
let totals = { inserted: 0, enriched: 0, skipped: 0, errored: 0 };
for (const [src, s] of Object.entries(stats)) {
  console.log(`${src.padEnd(12)} inserted=${s.inserted} enriched=${s.enriched} skipped=${s.skipped} errored=${s.errored}`);
  for (const k of Object.keys(totals)) totals[k] += s[k];
}
console.log(`${'TOTAL'.padEnd(12)} inserted=${totals.inserted} enriched=${totals.enriched} skipped=${totals.skipped} errored=${totals.errored}`);
process.exit(failed ? 1 : 0);
