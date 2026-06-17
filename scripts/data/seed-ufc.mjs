#!/usr/bin/env node
/**
 * seed-ufc.mjs — seeds UFC fight cards (sport 'mma') from ESPN's mma/ufc
 * scoreboard. The loggable unit is the *card* ("UFC 300: Pereira vs. Hill"),
 * not individual bouts — so each card is one event_template 'field' event with
 * the card name in tournament_name, a venue, and no teams.
 *
 * Requires sport_type to include 'mma' (see migration 20260617). Idempotent:
 * dedup by ESPN card id + natural key (date | card name). Venues matched by
 * name first (UFC arenas largely already exist), created when missing.
 *
 * Usage:  SUPABASE_PAT=... node scripts/data/seed-ufc.mjs [--from-year=2002] [--to-year=2026] [--dry-run]
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FROM_Y = Number(arg("from-year", "2002"));
const TO_Y = Number(arg("to-year", "2026"));
const CONCURRENCY = 10;
const BASE = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const normName = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
const localDate = (iso) => new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);

function makeLimiter(max) { let a = 0; const queue = []; const next = () => { if (a >= max || !queue.length) return; a++; const { fn, resolve, reject } = queue.shift(); fn().then(resolve, reject).finally(() => { a--; next(); }); }; return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); }); }
async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-ufc/1.0" } });
    if (res.status === 429 || res.status >= 500) { if (attempt >= 6) throw new Error(`HTTP ${res.status}`); await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
    if (res.status === 404) return { events: [] };
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (e) { if (attempt >= 6) throw e; await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
}
async function runSQL(query, attempt = 0) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  if (res.status === 429 || res.status >= 500) { if (attempt >= 8) throw new Error(`Management API ${res.status} after retries`); await sleep(1000 * 2 ** attempt); return runSQL(query, attempt + 1); }
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

if (!DRY && !PAT) { console.error("SUPABASE_PAT required (or --dry-run)."); process.exit(2); }
const limiter = makeLimiter(CONCURRENCY);

// League (skip DB entirely in dry mode — cards print without a token)
let leagueId = null;
if (!DRY) {
  const [{ id } = {}] = await runSQL(`select id from leagues where slug='ufc'`);
  if (id) leagueId = id;
  else {
    await runSQL(`insert into leagues (name, slug, sport, event_template, country, is_active, display_order) values ('UFC','ufc','mma','field','US',true,60) on conflict (slug) do nothing`);
    [{ id: leagueId } = {}] = await runSQL(`select id from leagues where slug='ufc'`);
    console.log(`created league ufc (${leagueId})`);
  }
}

// Preload venues + existing cards
const venueByName = new Map(); const venueByEspn = new Map();
const haveEspn = new Set(); const haveNatural = new Set();
if (!DRY) {
  for (const v of await runSQL(`select id, name, external_ids->>'espn' as espn from venues`)) { if (v.espn) venueByEspn.set(v.espn, v.id); const n = normName(v.name); if (!venueByName.has(n)) venueByName.set(n, v.id); }
  for (const e of await runSQL(`select external_ids->>'espn' as espn, event_date::text d, tournament_name tn from events where league_id=${q(leagueId)}`)) { if (e.espn) haveEspn.add(e.espn); if (e.tn) haveNatural.add(`${e.d}|${normName(e.tn)}`); }
}

// Fetch all days across the range (UFC runs year-round)
const days = [];
for (let y = FROM_Y; y <= TO_Y; y++) for (let m = 0; m < 12; m++) { const dim = new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); for (let d = 1; d <= dim; d++) days.push(`${y}${String(m + 1).padStart(2, "0")}${String(d).padStart(2, "0")}`); }
let fetched = 0;
const results = await Promise.all(days.map((ymd) => limiter(async () => { const data = await fetchJSON(`${BASE}/scoreboard?dates=${ymd}`); if (++fetched % 400 === 0) console.log(`  fetched ${fetched}/${days.length} days`); return data.events || []; })));
const cards = results.flat();

const seen = new Set(); const newVenues = new Map(); const pending = []; let dup = 0, noVenue = 0;
for (const e of cards) {
  if (seen.has(String(e.id))) continue; seen.add(String(e.id));
  const comp = e.competitions?.[0];
  const name = e.name || comp?.notes?.[0]?.headline; if (!name) continue;
  const date = localDate(e.date);
  const natural = `${date}|${normName(name)}`;
  if (haveEspn.has(String(e.id)) || haveNatural.has(natural)) { dup++; continue; }
  haveEspn.add(String(e.id)); haveNatural.add(natural);
  const v = comp?.venue;
  let venueId = null, vEspn = null;
  if (v?.fullName) {
    vEspn = v.id ? `espn:${v.id}` : null;
    venueId = venueByName.get(normName(v.fullName)) || (vEspn && venueByEspn.get(vEspn)) || null;
    if (!venueId && vEspn && !newVenues.has(vEspn)) newVenues.set(vEspn, { name: v.fullName, city: v.address?.city || "", state: v.address?.state || null, country: v.address?.country || "US" });
  }
  if (!venueId && !vEspn) { noVenue++; continue; }
  pending.push({ espn: String(e.id), name, date, season: new Date(e.date).getUTCFullYear(), venueId, vEspn });
}
console.log(`${cards.length} cards fetched, ${pending.length} new, ${dup} existing, ${newVenues.size} new venues, ${noVenue} no-venue`);
if (DRY) { for (const p of pending.slice(0, 10)) console.log(`  ${p.date}  ${p.name}`); console.log("DRY RUN — nothing written."); process.exit(0); }

for (const [espn, v] of newVenues) {
  const [row] = await runSQL(`insert into venues (name,city,state,country,status,external_ids) values (${q(v.name)},${q(v.city)},${q(v.state)},${q(v.country || "US")},'active',jsonb_build_object('espn',${q(espn)})) on conflict ((external_ids->>'espn')) where (external_ids ? 'espn') do update set external_ids=venues.external_ids returning id`);
  venueByEspn.set(espn, row.id);
}
console.log(`created ${newVenues.size} venues`);

const ready = pending.map((p) => ({ ...p, venueId: p.venueId || venueByEspn.get(p.vEspn) })).filter((p) => p.venueId);
let inserted = 0;
for (let i = 0; i < ready.length; i += 300) {
  const batch = ready.slice(i, i + 300);
  const values = batch.map((p) => `(${q(leagueId)},${q(p.venueId)},${q(p.date)},'field',null,null,null,null,false,${p.season},false,false,${q(p.name)},jsonb_build_object('espn',${q(p.espn)}))`).join(",\n");
  await runSQL(`insert into events (league_id,venue_id,event_date,event_template,home_team_id,away_team_id,home_score,away_score,is_draw,season,is_postseason,is_preseason,tournament_name,external_ids) values\n${values};`);
  inserted += batch.length;
}
console.log(`[ufc] inserted ${inserted} cards`);
console.log("Done.");
