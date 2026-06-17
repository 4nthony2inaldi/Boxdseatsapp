#!/usr/bin/env node
/**
 * seed-espn-league.mjs — generic seeder for an ESPN-covered, match-based pro
 * league (teams + completed games) over the Supabase Management API. Built to
 * add WNBA (basketball) and NWSL (soccer), but works for any single-calendar-
 * year match league on ESPN's site API.
 *
 * Ensures the leagues row exists (is_active so it shows in the Big Four picker),
 * seeds teams (idempotent on uq_teams_espn_id), then day-by-day scoreboard
 * games (idempotent on espn id + a natural key). Venues are matched by name
 * first (to reuse existing arenas) and created when missing.
 *
 * Usage:
 *   node scripts/data/seed-espn-league.mjs --slug=wnba --name=WNBA \
 *     --sport=basketball --espn-sport=basketball --espn-league=wnba \
 *     --sibling=nba --start-md=05-01 --end-md=11-15 \
 *     --from-year=2002 --to-year=2026 [--phase=teams|games|all] [--dry-run]
 * Env: SUPABASE_PAT, SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };

const SLUG = arg("slug");
const NAME = arg("name");
const SPORT = arg("sport");                 // DB sport enum (basketball|soccer|…)
const ESPN_SPORT = arg("espn-sport", SPORT);
const ESPN_LEAGUE = arg("espn-league", SLUG);
const SIBLING = arg("sibling", "");          // league slug to sort next to
const START_MD = arg("start-md", "01-01");
const END_MD = arg("end-md", "12-31");
const FROM_Y = Number(arg("from-year", "2002"));
const TO_Y = Number(arg("to-year", "2026"));
const PHASE = arg("phase", "all");
const CONCURRENCY = 10;
const BASE = `https://site.api.espn.com/apis/site/v2/sports/${ESPN_SPORT}/${ESPN_LEAGUE}`;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function sqlLit(s) { return s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`; }
function normName(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function localEventDate(isoUtc) { return new Date(new Date(isoUtc).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10); }

function makeLimiter(max) {
  let active = 0; const queue = [];
  const next = () => { if (active >= max || !queue.length) return; active++; const { fn, resolve, reject } = queue.shift(); fn().then(resolve, reject).finally(() => { active--; next(); }); };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}
async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-espn/1.0" } });
    if (res.status === 429 || res.status >= 500) { if (attempt >= 6) throw new Error(`HTTP ${res.status}`); await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
    if (res.status === 404) return {};
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) { if (attempt >= 6) throw err; await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
}
async function runSQL(query, attempt = 0) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  if (res.status === 429 || res.status >= 500) { if (attempt >= 8) throw new Error(`Management API ${res.status} after retries: ${await res.text()}`); await sleep(1000 * 2 ** attempt); return runSQL(query, attempt + 1); }
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

if (!SLUG || !NAME || !SPORT) { console.error("--slug, --name, --sport required"); process.exit(2); }
if (!DRY && !PAT) { console.error("SUPABASE_PAT required (or --dry-run)."); process.exit(2); }
const limiter = makeLimiter(CONCURRENCY);

// ── League (resolve id always; only create when not a dry run) ──
let leagueId = null;
{
  const [{ id } = {}] = await runSQL(`select id from leagues where slug=${sqlLit(SLUG)}`);
  if (id) leagueId = id;
  else if (!DRY) {
    const ord = SIBLING ? `(select coalesce((select display_order from leagues where slug=${sqlLit(SIBLING)}), 50))` : "50";
    await runSQL(`insert into leagues (name, slug, sport, event_template, country, is_active, display_order) values (${sqlLit(NAME)}, ${sqlLit(SLUG)}, ${sqlLit(SPORT)}, 'match', 'US', true, ${ord}) on conflict (slug) do nothing`);
    const [{ id: nid } = {}] = await runSQL(`select id from leagues where slug=${sqlLit(SLUG)}`);
    leagueId = nid;
    console.log(`created league ${SLUG} (${leagueId})`);
  }
}

// ── Teams ──
function pickLogo(team) { const l = (team.logos || []).find((x) => (x.rel || []).includes("default")) || (team.logos || [])[0]; return l?.href || null; }
if (PHASE === "teams" || PHASE === "all") {
  const data = await fetchJSON(`${BASE}/teams?limit=100`);
  const teams = data?.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) || [];
  console.log(`teams: ${teams.length} from ESPN`);
  if (!DRY && teams.length) {
    const values = teams.map((t) => {
      const name = t.displayName || `${t.location || ""} ${t.name || ""}`.trim();
      const short = t.shortDisplayName || t.name || name;
      const abbr = (t.abbreviation || name.slice(0, 3)).toUpperCase();
      const city = t.location || name;
      return `(${sqlLit(leagueId)}, ${sqlLit(name)}, ${sqlLit(short)}, ${sqlLit(abbr)}, ${sqlLit(city)}, ${sqlLit(pickLogo(t))}, jsonb_build_object('espn', ${sqlLit(String(t.id))}))`;
    }).join(",\n");
    await runSQL(`insert into teams (league_id, name, short_name, abbreviation, city, logo_url, external_ids) values\n${values}\n on conflict (league_id, ((external_ids->>'espn'))) where (external_ids ? 'espn') do update set name=excluded.name, short_name=excluded.short_name, abbreviation=excluded.abbreviation, city=excluded.city, logo_url=excluded.logo_url;`);
    console.log(`  upserted ${teams.length} teams`);
  } else if (DRY) {
    for (const t of teams.slice(0, 8)) console.log(`  ${t.displayName} (${t.abbreviation})`);
  }
  if (PHASE === "teams") { console.log("Done (teams)."); process.exit(0); }
}

// ── Games ──
const teamRows = await runSQL(`select id, external_ids->>'espn' as espn from teams where league_id=${sqlLit(leagueId)} and external_ids ? 'espn'`);
const teamByEspn = new Map(teamRows.map((t) => [t.espn, t.id]));

const venueRows = await runSQL(`select id, name, external_ids->>'espn' as espn from venues`);
const venueByEspn = new Map(); const venueByName = new Map();
for (const v of venueRows) { if (v.espn) venueByEspn.set(v.espn, v.id); const n = normName(v.name); if (!venueByName.has(n)) venueByName.set(n, v.id); }

const evRows = await runSQL(`select external_ids->>'espn' as espn, event_date::text d, home_team_id h, away_team_id a from events where league_id=${sqlLit(leagueId)}`);
const haveEspn = new Set(); const haveNatural = new Set();
for (const e of evRows) { if (e.espn) haveEspn.add(e.espn); if (e.h && e.a) haveNatural.add(`${e.d}|${e.h}|${e.a}`); }

function seasonDays(fromY, toY) {
  const [sm, sd] = START_MD.split("-").map(Number);
  const [em, ed] = END_MD.split("-").map(Number);
  const days = [];
  for (let y = fromY; y <= toY; y++) {
    const start = new Date(Date.UTC(y, sm - 1, sd));
    const end = new Date(Date.UTC(y, em - 1, ed));
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return days;
}

const days = seasonDays(FROM_Y, TO_Y);
let fetched = 0;
const dayResults = await Promise.all(days.map((ymd) => limiter(async () => {
  const data = await fetchJSON(`${BASE}/scoreboard?dates=${ymd}&limit=400`);
  if (++fetched % 100 === 0) console.log(`  fetched ${fetched}/${days.length} days`);
  return data.events || [];
})));
const allEvents = dayResults.flat();
console.log(`  ${allEvents.length} games across ${days.length} days`);

const newVenues = new Map(); const pending = []; const seen = new Set();
let skipTeam = 0, skipIncomplete = 0, dup = 0;
for (const e of allEvents) {
  if (seen.has(String(e.id))) continue; seen.add(String(e.id));
  const comp = e.competitions?.[0]; if (!comp) continue;
  if (e.status?.type?.completed !== true) { skipIncomplete++; continue; }
  const home = comp.competitors?.find((c) => c.homeAway === "home");
  const away = comp.competitors?.find((c) => c.homeAway === "away");
  if (!home?.team?.id || !away?.team?.id) { skipTeam++; continue; }
  const homeId = teamByEspn.get(String(home.team.id));
  const awayId = teamByEspn.get(String(away.team.id));
  if (!homeId || !awayId) { skipTeam++; continue; }

  const eventDate = localEventDate(e.date);
  const natural = `${eventDate}|${homeId}|${awayId}`;
  if (haveEspn.has(String(e.id)) || haveNatural.has(natural)) { dup++; continue; }
  haveEspn.add(String(e.id)); haveNatural.add(natural);

  const v = comp.venue;
  let venueId = null, venueEspnKey = null;
  if (v?.id || v?.fullName) {
    venueEspnKey = v.id ? `espn:${v.id}` : null;
    venueId = venueByName.get(normName(v.fullName)) || (venueEspnKey && venueByEspn.get(venueEspnKey)) || null;
    if (!venueId && venueEspnKey && !newVenues.has(venueEspnKey)) {
      newVenues.set(venueEspnKey, { name: v.fullName || "Unknown Venue", city: v.address?.city || "", state: v.address?.state || null });
    }
  }
  if (!venueId && !venueEspnKey) { skipTeam++; continue; }

  const hs = parseInt(home.score, 10); const as = parseInt(away.score, 10);
  pending.push({ espn: String(e.id), eventDate, homeId, awayId, homeScore: hs, awayScore: as, season: e.season?.year ?? FROM_Y, isPost: e.season?.type === 3, isPre: e.season?.type === 1, isDraw: Number.isFinite(hs) && hs === as, venueId, venueEspnKey });
}
console.log(`  new=${pending.length} newVenues=${newVenues.size} dup=${dup} skipTeam/venue=${skipTeam} incomplete=${skipIncomplete}`);
if (DRY) { for (const p of pending.slice(0, 8)) console.log(`  ${p.eventDate} ${p.homeId.slice(0,4)} ${p.homeScore}-${p.awayScore} ${p.awayId.slice(0,4)}`); console.log("DRY RUN — nothing written."); process.exit(0); }

const venueList = [...newVenues.entries()];
for (let i = 0; i < venueList.length; i += 200) {
  const batch = venueList.slice(i, i + 200);
  const values = batch.map(([espn, vv]) => `(${sqlLit(vv.name)}, ${sqlLit(vv.city)}, ${sqlLit(vv.state)}, 'US', 'active', jsonb_build_object('espn', ${sqlLit(espn)}))`).join(",\n");
  const rows = await runSQL(`insert into venues (name, city, state, country, status, external_ids) values\n${values} on conflict ((external_ids->>'espn')) where (external_ids ? 'espn') do update set external_ids = venues.external_ids returning id, external_ids->>'espn' as espn;`);
  for (const r of rows) venueByEspn.set(r.espn, r.id);
}
console.log(`  created ${venueList.length} venues`);

const ready = pending.map((p) => ({ ...p, venueId: p.venueId || venueByEspn.get(p.venueEspnKey) })).filter((p) => p.venueId);
let inserted = 0;
for (let i = 0; i < ready.length; i += 300) {
  const batch = ready.slice(i, i + 300);
  const values = batch.map((p) =>
    `(${sqlLit(leagueId)}, ${sqlLit(p.venueId)}, ${sqlLit(p.eventDate)}, 'match', ${sqlLit(p.homeId)}, ${sqlLit(p.awayId)}, ${Number.isFinite(p.homeScore) ? p.homeScore : "null"}, ${Number.isFinite(p.awayScore) ? p.awayScore : "null"}, ${p.isDraw}, ${p.season}, ${p.isPost}, ${p.isPre}, jsonb_build_object('espn', ${sqlLit(p.espn)}))`
  ).join(",\n");
  await runSQL(`insert into events (league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, is_postseason, is_preseason, external_ids) values\n${values};`);
  inserted += batch.length;
  if (inserted % 1500 < 300) console.log(`  inserted ${inserted}/${ready.length}`);
}
console.log(`[${SLUG}] inserted ${inserted} events, ${venueList.length} venues`);
console.log("Done.");
