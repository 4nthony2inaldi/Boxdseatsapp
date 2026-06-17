#!/usr/bin/env node
/**
 * seed-ncaa-games.mjs — backfills NCAA basketball *regular-season* games (and
 * postseason) into events. The canonical seeder (seed-real-data.mjs) now pulls
 * the full schedule, but it talks to Postgres directly; this companion does the
 * same ingest over the Supabase Management API so it can run where only HTTPS
 * is available. Mirrors seed-real-data.mjs: completed games only, day-by-day
 * ESPN scoreboard with groups=50 (all D1), localEventDate (UTC-5) dating,
 * dedup by espn id + natural key, venues created with NULL location (geocoded
 * separately) and an `ncaab:<id>` external id.
 *
 * Teams are resolved by ESPN id (the full D1 membership was already backfilled
 * by seed-ncaa-teams.mjs); a game whose opponent isn't a known D1 team is
 * skipped.
 *
 * Usage:  node scripts/data/seed-ncaa-games.mjs [--leagues=ncaam,ncaaw] [--from-year=2026] [--to-year=2026] [--dry-run]
 * Env:    SUPABASE_PAT, SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const LEAGUE_SLUGS = (arg("leagues", "ncaam,ncaaw")).split(",").map((s) => s.trim());
const FROM_Y = Number(arg("from-year", "2026"));
const TO_Y = Number(arg("to-year", "2026"));
const CONCURRENCY = 10;

const ESPN_PATH = { ncaam: "mens-college-basketball", ncaaw: "womens-college-basketball" };

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function normName(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function sqlLit(s) { return s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`; }
function localEventDate(isoUtc) { return new Date(new Date(isoUtc).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10); }

function makeLimiter(max) {
  let active = 0; const queue = [];
  const next = () => { if (active >= max || !queue.length) return; active++; const { fn, resolve, reject } = queue.shift(); fn().then(resolve, reject).finally(() => { active--; next(); }); };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}
async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-ncaagames/1.0" } });
    if (res.status === 429 || res.status >= 500) { if (attempt >= 6) throw new Error(`HTTP ${res.status}`); await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
    if (res.status === 404) return { events: [] };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) { if (attempt >= 6) throw err; await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
}
async function runSQL(query, attempt = 0) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  // The Management API throttles (429) under sustained insert load; retry with
  // exponential backoff instead of crashing the whole backfill.
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 8) throw new Error(`Management API ${res.status} after retries: ${await res.text()}`);
    await sleep(1000 * 2 ** attempt);
    return runSQL(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

if (!DRY && !PAT) { console.error("SUPABASE_PAT required (or --dry-run)."); process.exit(2); }
const limiter = makeLimiter(CONCURRENCY);

function seasonDays(fromY, toY) {
  const days = [];
  for (let y = fromY; y <= toY; y++) {
    const start = new Date(Date.UTC(y - 1, 10, 1)); // Nov 1 prev year
    const end = new Date(Date.UTC(y, 3, 15)); // Apr 15
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) days.push(d.toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return days;
}

for (const slug of LEAGUE_SLUGS) {
  const path = ESPN_PATH[slug];
  if (!path) { console.error(`unknown league ${slug}`); continue; }
  console.log(`\n=== ${slug} (seasons ${FROM_Y}-${TO_Y}) ===`);

  const [{ id: leagueId } = {}] = await runSQL(`select id from leagues where slug=${sqlLit(slug)}`);
  if (!leagueId) { console.error(`league ${slug} not found`); continue; }

  // Preload teams (by espn id), venues (by espn id + normalized name), existing events.
  const teamRows = await runSQL(`select id, external_ids->>'espn' as espn from teams where league_id=${sqlLit(leagueId)} and external_ids ? 'espn'`);
  const teamByEspn = new Map(teamRows.map((t) => [t.espn, t.id]));

  const venueRows = await runSQL(`select id, name, external_ids->>'espn' as espn from venues`);
  const venueByEspn = new Map();
  const venueByName = new Map();
  for (const v of venueRows) { if (v.espn) venueByEspn.set(v.espn, v.id); const n = normName(v.name); if (!venueByName.has(n)) venueByName.set(n, v.id); }

  const evRows = await runSQL(`select external_ids->>'espn' as espn, event_date::text as d, home_team_id h, away_team_id a from events where league_id=${sqlLit(leagueId)}`);
  const haveEspn = new Set(); const haveNatural = new Set();
  for (const e of evRows) { if (e.espn) haveEspn.add(e.espn); if (e.h && e.a) haveNatural.add(`${e.d}|${e.h}|${e.a}`); }

  // Fetch all season days.
  const days = seasonDays(FROM_Y, TO_Y);
  let fetched = 0;
  const dayResults = await Promise.all(days.map((ymd) => limiter(async () => {
    const data = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/${path}/scoreboard?dates=${ymd}&limit=1000&groups=50`);
    if (++fetched % 40 === 0) console.log(`  fetched ${fetched}/${days.length} days`);
    return data.events || [];
  })));
  const allEvents = dayResults.flat();
  console.log(`  ${allEvents.length} games across ${days.length} days`);

  const newVenues = new Map(); // espnKey -> {name, city, state}
  const pending = [];
  const seen = new Set();
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

    // Venue
    const v = comp.venue;
    let venueId = null, venueEspnKey = null;
    if (v?.id || v?.fullName) {
      venueEspnKey = v.id ? `ncaab:${v.id}` : null;
      venueId = (venueEspnKey && venueByEspn.get(venueEspnKey)) || venueByName.get(normName(v.fullName)) || null;
      if (!venueId && venueEspnKey && !newVenues.has(venueEspnKey)) {
        newVenues.set(venueEspnKey, { name: v.fullName || "Unknown Venue", city: v.address?.city || "", state: v.address?.state || null });
      }
    }
    if (!venueId && !venueEspnKey) { skipTeam++; continue; } // no venue to attach

    const type = e.season?.type;
    pending.push({
      espn: String(e.id), eventDate, homeId, awayId,
      homeScore: parseInt(home.score, 10), awayScore: parseInt(away.score, 10),
      season: e.season?.year ?? FROM_Y,
      isPost: type === 3, isPre: type === 1,
      round: type === 3 ? (comp.notes?.find((n) => n.headline)?.headline ?? null) : null,
      venueId, venueEspnKey,
    });
  }

  console.log(`  new games=${pending.length} newVenues=${newVenues.size} dup=${dup} skipTeam/venue=${skipTeam} incomplete=${skipIncomplete}`);
  if (DRY) { console.log("  DRY RUN — nothing written."); continue; }

  // Create new venues, RETURNING ids, and fill the map.
  const venueList = [...newVenues.entries()];
  for (let i = 0; i < venueList.length; i += 200) {
    const batch = venueList.slice(i, i + 200);
    const values = batch.map(([espn, vv]) => `(${sqlLit(vv.name)}, ${sqlLit(vv.city)}, ${sqlLit(vv.state)}, 'US', 'active', jsonb_build_object('espn', ${sqlLit(espn)}))`).join(",\n");
    // Idempotent on the partial unique index uq_venues_espn_id: a no-op DO
    // UPDATE still RETURNs the existing row's id, so concurrent/re-runs that
    // hit an already-created venue (college arenas are shared across ncaam/
    // ncaaw) resolve its id instead of erroring on a duplicate key.
    const rows = await runSQL(`insert into venues (name, city, state, country, status, external_ids) values\n${values} on conflict ((external_ids->>'espn')) where (external_ids ? 'espn') do update set external_ids = venues.external_ids returning id, external_ids->>'espn' as espn;`);
    for (const r of rows) venueByEspn.set(r.espn, r.id);
  }
  console.log(`  created ${venueList.length} venues`);

  // Resolve venue ids and insert events.
  const ready = pending.map((p) => ({ ...p, venueId: p.venueId || venueByEspn.get(p.venueEspnKey) })).filter((p) => p.venueId);
  let inserted = 0;
  for (let i = 0; i < ready.length; i += 400) {
    const batch = ready.slice(i, i + 400);
    const values = batch.map((p) =>
      `(${sqlLit(leagueId)}, ${sqlLit(p.venueId)}, ${sqlLit(p.eventDate)}, 'match', ${sqlLit(p.homeId)}, ${sqlLit(p.awayId)}, ${Number.isFinite(p.homeScore) ? p.homeScore : "null"}, ${Number.isFinite(p.awayScore) ? p.awayScore : "null"}, ${p.homeScore === p.awayScore}, ${p.season}, ${p.isPost}, ${p.isPre}, ${sqlLit(p.round)}, jsonb_build_object('espn', ${sqlLit(p.espn)}))`
    ).join(",\n");
    await runSQL(`insert into events (league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, is_postseason, is_preseason, round_or_stage, external_ids) values\n${values};`);
    inserted += batch.length;
    if (inserted % 2000 < 400) console.log(`  inserted ${inserted}/${ready.length}`);
  }
  console.log(`  [${slug}] inserted ${inserted} events, ${venueList.length} venues`);
}
console.log("\nDone.");
