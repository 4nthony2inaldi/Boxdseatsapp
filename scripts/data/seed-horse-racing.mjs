#!/usr/bin/env node
/**
 * seed-horse-racing.mjs — seeds marquee US horse races (sport 'horse_racing')
 * that fans travel for: the Triple Crown (Kentucky Derby, Preakness, Belmont)
 * plus the year-end Breeders' Cup. There's no ESPN/API feed for racing, so this
 * is curated: fixed venues + schedule-rule dates (Derby = first Saturday in
 * May, Preakness +14d, Belmont +35d; Breeders' Cup = first Saturday in Nov),
 * with hardcoded exceptions. Each race is one event_template 'field' event
 * (race name in tournament_name, a venue, no competitors).
 *
 * Requires sport_type to include 'horse_racing' (migration 20260617).
 * Idempotent: dedup by external id hr:<year>-<race>. Additive.
 *
 * Dates/venues are curated and worth a spot-check; easily edited below.
 * Usage:  SUPABASE_PAT=... node scripts/data/seed-horse-racing.mjs [--dry-run]
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const q = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const normName = (s) => (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

async function runSQL(query, attempt = 0) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, { method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
  if (res.status === 429 || res.status >= 500) { if (attempt >= 8) throw new Error(`Management API ${res.status} after retries`); await sleep(1000 * 2 ** attempt); return runSQL(query, attempt + 1); }
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

const VENUES = {
  churchill: { name: "Churchill Downs", city: "Louisville", state: "KY" },
  pimlico: { name: "Pimlico Race Course", city: "Baltimore", state: "MD" },
  belmont: { name: "Belmont Park", city: "Elmont", state: "NY" },
  saratoga: { name: "Saratoga Race Course", city: "Saratoga Springs", state: "NY" },
  santaanita: { name: "Santa Anita Park", city: "Arcadia", state: "CA" },
  delmar: { name: "Del Mar Racetrack", city: "Del Mar", state: "CA" },
  keeneland: { name: "Keeneland", city: "Lexington", state: "KY" },
};

const firstSaturday = (y, m0) => { const d = new Date(Date.UTC(y, m0, 1)); d.setUTCDate(1 + ((6 - d.getUTCDay() + 7) % 7)); return d; };
const addDays = (d, n) => { const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x; };
const ymd = (d) => d.toISOString().slice(0, 10);

// Known schedule exceptions (COVID 2020; Belmont relocated during Belmont Park
// reconstruction in 2024–2025).
const DERBY_OVERRIDE = { 2020: "2020-09-05" };
const PREAKNESS_OVERRIDE = { 2020: "2020-10-03" };
const BELMONT_OVERRIDE = { 2020: { date: "2020-06-20", venue: "belmont" }, 2024: { venue: "saratoga" }, 2025: { venue: "saratoga" } };
// Breeders' Cup rotates; only years with a confidently-known host are included.
const BREEDERS = { 2018: "churchill", 2019: "santaanita", 2020: "keeneland", 2021: "delmar", 2022: "keeneland", 2023: "santaanita", 2024: "delmar" };

const races = [];
for (let y = 2010; y <= 2026; y++) {
  const derby = DERBY_OVERRIDE[y] || ymd(firstSaturday(y, 4));
  const preakness = PREAKNESS_OVERRIDE[y] || ymd(addDays(firstSaturday(y, 4), 14));
  const belO = BELMONT_OVERRIDE[y] || {};
  const belmont = belO.date || ymd(addDays(firstSaturday(y, 4), 35));
  races.push({ key: `${y}-derby`, name: "Kentucky Derby", date: derby, venue: "churchill", season: y });
  races.push({ key: `${y}-preakness`, name: "Preakness Stakes", date: preakness, venue: "pimlico", season: y });
  races.push({ key: `${y}-belmont`, name: "Belmont Stakes", date: belmont, venue: belO.venue || "belmont", season: y });
  if (BREEDERS[y]) races.push({ key: `${y}-breeders`, name: "Breeders' Cup", date: ymd(firstSaturday(y, 10)), venue: BREEDERS[y], season: y });
}
console.log(`${races.length} curated races (2010-2026)`);
if (DRY) { for (const r of races.slice(0, 8)) console.log(`  ${r.date}  ${r.name} @ ${VENUES[r.venue].name}`); console.log("DRY RUN — nothing written."); process.exit(0); }
if (!PAT) { console.error("SUPABASE_PAT required (or --dry-run)."); process.exit(2); }

// League
let [{ id: leagueId } = {}] = await runSQL(`select id from leagues where slug='horse-racing'`);
if (!leagueId) {
  await runSQL(`insert into leagues (name,slug,sport,event_template,country,is_active,display_order) values ('Horse Racing','horse-racing','horse_racing','field','US',true,61) on conflict (slug) do nothing`);
  [{ id: leagueId } = {}] = await runSQL(`select id from leagues where slug='horse-racing'`);
  console.log(`created league horse-racing (${leagueId})`);
}

// Venues (match by name, create missing)
const venueByName = new Map();
for (const v of await runSQL(`select id, name from venues`)) { const n = normName(v.name); if (!venueByName.has(n)) venueByName.set(n, v.id); }
for (const key of Object.keys(VENUES)) {
  const v = VENUES[key];
  let id = venueByName.get(normName(v.name));
  if (!id) { const [row] = await runSQL(`insert into venues (name,city,state,country,status,external_ids) values (${q(v.name)},${q(v.city)},${q(v.state)},'US','active','{}'::jsonb) returning id`); id = row.id; }
  v.id = id;
}

// Existing events (dedup)
const have = new Set((await runSQL(`select external_ids->>'hr' as hr from events where league_id=${q(leagueId)} and external_ids ? 'hr'`)).map((e) => e.hr));
const toInsert = races.filter((r) => !have.has(r.key));
if (toInsert.length) {
  const values = toInsert.map((r) => `(${q(leagueId)},${q(VENUES[r.venue].id)},${q(r.date)},'field',null,null,null,null,false,${r.season},false,false,${q(r.name)},jsonb_build_object('hr',${q(r.key)}))`).join(",\n");
  await runSQL(`insert into events (league_id,venue_id,event_date,event_template,home_team_id,away_team_id,home_score,away_score,is_draw,season,is_postseason,is_preseason,tournament_name,external_ids) values\n${values};`);
}
console.log(`[horse-racing] inserted ${toInsert.length} races (${have.size} already present)`);
console.log("Done.");
