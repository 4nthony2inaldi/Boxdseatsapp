#!/usr/bin/env node
/**
 * seed-ncaaf.mjs — stands up NCAA football (the ncaaf league had no teams or
 * games; only the basketball college leagues were ever seeded). Two phases:
 *
 *  TEAMS: Division I membership = FBS (group 80) + FCS (group 81) from the core
 *  API, hydrated with names/logos/location from the site teams endpoint.
 *
 *  GAMES: the site scoreboard truncates college football badly (~15-25 of ~60+
 *  games a week), so instead we read each D1 team's per-season schedule
 *  endpoint, which returns the full slate inline (venue, scores, opponents).
 *  Games are deduped by ESPN event id (each appears in both teams' schedules)
 *  and natural key. Schedule venue payloads carry no id, so venues are matched
 *  by normalized name (shared pro stadiums like Acrisure are reused) and new
 *  campus stadiums are created with NULL location (geocoded separately).
 *
 * Completed games only; localEventDate (UTC-5) dating; teams resolved by ESPN
 * id (games vs non-D1 opponents are skipped). Writes via the Management API.
 *
 * Usage:  node scripts/data/seed-ncaaf.mjs [--phase=teams|games|all] [--seasons=2023,2024,2025] [--dry-run]
 * Env:    SUPABASE_PAT, SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const PHASE = arg("phase", "all");
const SEASONS = arg("seasons", "2023,2024,2025").split(",").map((s) => parseInt(s, 10));
const CONCURRENCY = 10;
const MEMBERSHIP_SEASON = 2025;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function normName(s) { return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); }
function sqlLit(s) { return s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`; }
function localEventDate(isoUtc) { return new Date(new Date(isoUtc).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10); }
function makeLimiter(max) {
  let active = 0; const queue = [];
  const next = () => { if (active >= max || !queue.length) return; active++; const { fn, resolve, reject } = queue.shift(); fn().then(resolve, reject).finally(() => { active--; next(); }); };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}
async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-ncaaf/1.0" } });
    if (res.status === 429 || res.status >= 500) { if (attempt >= 6) throw new Error(`HTTP ${res.status}`); await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
    if (res.status === 404) return {};
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) { if (attempt >= 6) throw err; await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
}
async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

if (!DRY && !PAT) { console.error("SUPABASE_PAT required (or --dry-run)."); process.exit(2); }
const limiter = makeLimiter(CONCURRENCY);

const [{ id: leagueId } = {}] = await runSQL(`select id from leagues where slug='ncaaf'`);
if (!leagueId) { console.error("ncaaf league not found — create it first."); process.exit(1); }

// ── Phase: teams ──────────────────────────────────────────────────────────
async function seedTeams() {
  // D1 membership = FBS (80) + FCS (81)
  const d1Ids = new Set();
  for (const g of [80, 81]) {
    const d = await fetchJSON(`https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/seasons/${MEMBERSHIP_SEASON}/types/2/groups/${g}/teams?limit=400`);
    for (const it of d.items || []) { const m = /teams\/(\d+)/.exec(it.$ref || ""); if (m) d1Ids.add(m[1]); }
  }
  // Hydrate from the site teams endpoint (full names/logos/location).
  const site = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams?limit=900`);
  const all = (site.sports?.[0]?.leagues?.[0]?.teams ?? []).map((t) => t.team);
  const byId = new Map(all.map((t) => [String(t.id), t]));

  const existing = await runSQL(`select external_ids->>'espn' as espn from teams where league_id=${sqlLit(leagueId)} and external_ids ? 'espn'`);
  const have = new Set(existing.map((r) => r.espn));

  const rows = [];
  for (const id of d1Ids) {
    if (have.has(id)) continue;
    const t = byId.get(id);
    if (!t) continue;
    const name = t.displayName || `${t.location ?? ""} ${t.name ?? ""}`.trim();
    const shortName = t.name || t.nickname || t.shortDisplayName || name;
    const city = t.location || shortName;
    const abbr = t.abbreviation || normName(name).slice(0, 4).toUpperCase();
    const logo = t.logos?.find((l) => l.rel?.includes("default"))?.href ?? t.logos?.[0]?.href ?? null;
    rows.push({ name, shortName, abbr, city, logo, espn: id });
  }
  console.log(`[teams] D1=${d1Ids.size} already-have=${have.size} insert=${rows.length}`);
  if (DRY) { console.log("  sample:", rows.slice(0, 8).map((r) => r.name).join(", ")); return; }
  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    const values = batch.map((t) => `(${sqlLit(leagueId)}, ${sqlLit(t.name)}, ${sqlLit(t.shortName)}, ${sqlLit(t.abbr)}, ${sqlLit(t.city)}, ${sqlLit(t.logo)}, jsonb_build_object('espn', ${sqlLit(t.espn)}))`).join(",\n");
    await runSQL(`insert into teams (league_id, name, short_name, abbreviation, city, logo_url, external_ids) values\n${values};`);
  }
  console.log(`[teams] inserted ${rows.length}`);
}

// ── Phase: games ──────────────────────────────────────────────────────────
async function seedGames() {
  const teamRows = await runSQL(`select id, external_ids->>'espn' as espn from teams where league_id=${sqlLit(leagueId)} and external_ids ? 'espn'`);
  const teamByEspn = new Map(teamRows.map((t) => [t.espn, t.id]));
  if (teamByEspn.size === 0) { console.error("no ncaaf teams — run --phase=teams first."); return; }

  const venueRows = await runSQL(`select id, name from venues`);
  const venueByName = new Map();
  for (const v of venueRows) { const n = normName(v.name); if (!venueByName.has(n)) venueByName.set(n, v.id); }

  const evRows = await runSQL(`select external_ids->>'espn' as espn, event_date::text as d, home_team_id h, away_team_id a from events where league_id=${sqlLit(leagueId)}`);
  const haveEspn = new Set(); const haveNatural = new Set();
  for (const e of evRows) { if (e.espn) haveEspn.add(e.espn); if (e.h && e.a) haveNatural.add(`${e.d}|${e.h}|${e.a}`); }

  const teamIds = [...teamByEspn.keys()];
  const jobs = [];
  for (const tid of teamIds) for (const season of SEASONS) {
    jobs.push(limiter(async () => {
      const d = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/football/college-football/teams/${tid}/schedule?season=${season}`);
      return d.events || [];
    }));
  }
  let done = 0;
  const results = await Promise.all(jobs.map((p) => p.then((r) => { if (++done % 200 === 0) console.log(`  fetched ${done}/${jobs.length} schedules`); return r; }).catch(() => [])));
  const allEvents = results.flat();

  const newVenues = new Map(); // normName -> {name, city, state}
  const pending = [];
  const seen = new Set();
  let skip = 0, dup = 0, incomplete = 0;

  for (const e of allEvents) {
    const id = String(e.id);
    if (seen.has(id)) continue; seen.add(id);
    const comp = e.competitions?.[0]; if (!comp) continue;
    if ((comp.status || e.status || {}).type?.completed !== true) { incomplete++; continue; }
    const home = comp.competitors?.find((c) => c.homeAway === "home");
    const away = comp.competitors?.find((c) => c.homeAway === "away");
    if (!home?.team?.id || !away?.team?.id) { skip++; continue; }
    const homeId = teamByEspn.get(String(home.team.id));
    const awayId = teamByEspn.get(String(away.team.id));
    if (!homeId || !awayId) { skip++; continue; } // non-D1 opponent

    const eventDate = localEventDate(e.date);
    const natural = `${eventDate}|${homeId}|${awayId}`;
    if (haveEspn.has(id) || haveNatural.has(natural)) { dup++; continue; }
    haveEspn.add(id); haveNatural.add(natural);

    const v = comp.venue || {};
    const vname = v.fullName;
    if (!vname) { skip++; continue; }
    const vKey = normName(vname);
    let venueId = venueByName.get(vKey) || null;
    if (!venueId && !newVenues.has(vKey)) newVenues.set(vKey, { name: vname, city: v.address?.city || "", state: v.address?.state || null });

    const score = (c) => { const s = c.score; const n = typeof s === "object" ? parseInt(s.displayValue ?? s.value, 10) : parseInt(s, 10); return Number.isFinite(n) ? n : null; };
    const type = e.seasonType?.type;
    pending.push({ espn: id, eventDate, homeId, awayId, homeScore: score(home), awayScore: score(away), season: e.season?.year ?? SEASONS[0], isPost: type === 3, vKey, venueId });
  }

  console.log(`[games] schedules=${jobs.length} games=${allEvents.length} new=${pending.length} newVenues=${newVenues.size} dup=${dup} skip=${skip} incomplete=${incomplete}`);
  if (DRY) { console.log("  DRY RUN — nothing written."); return; }

  const vlist = [...newVenues.entries()];
  for (let i = 0; i < vlist.length; i += 200) {
    const batch = vlist.slice(i, i + 200);
    const values = batch.map(([, vv]) => `(${sqlLit(vv.name)}, ${sqlLit(vv.city)}, ${sqlLit(vv.state)}, 'US', 'active', '{}'::jsonb)`).join(",\n");
    const rows = await runSQL(`insert into venues (name, city, state, country, status, external_ids) values\n${values} returning id, name;`);
    for (const r of rows) venueByName.set(normName(r.name), r.id);
  }
  console.log(`[games] created ${vlist.length} venues`);

  const ready = pending.map((p) => ({ ...p, venueId: p.venueId || venueByName.get(p.vKey) })).filter((p) => p.venueId);
  let inserted = 0;
  for (let i = 0; i < ready.length; i += 400) {
    const batch = ready.slice(i, i + 400);
    const values = batch.map((p) =>
      `(${sqlLit(leagueId)}, ${sqlLit(p.venueId)}, ${sqlLit(p.eventDate)}, 'match', ${sqlLit(p.homeId)}, ${sqlLit(p.awayId)}, ${p.homeScore ?? "null"}, ${p.awayScore ?? "null"}, ${p.homeScore === p.awayScore && p.homeScore !== null}, ${p.season}, ${p.isPost}, false, null, jsonb_build_object('espn', ${sqlLit(p.espn)}))`
    ).join(",\n");
    await runSQL(`insert into events (league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, is_postseason, is_preseason, round_or_stage, external_ids) values\n${values};`);
    inserted += batch.length;
    if (inserted % 2000 < 400) console.log(`  inserted ${inserted}/${ready.length}`);
  }
  console.log(`[games] inserted ${inserted} events, ${vlist.length} venues`);
}

if (PHASE === "teams" || PHASE === "all") await seedTeams();
if (PHASE === "games" || PHASE === "all") await seedGames();
console.log("Done.");
