#!/usr/bin/env node
/**
 * seed-imsa.mjs — seeds the IMSA WeatherTech SportsCar Championship (and its
 * Tudor/United predecessor naming, 2014+) into the events table so endurance
 * races like the Rolex 24 At Daytona become loggable. ESPN's racing API does
 * not cover IMSA, so this sources season schedules from Wikipedia.
 *
 * Motorsports events use event_template 'field': the race name lives in
 * tournament_name, with a venue and no teams (mirrors f1/nascar/indycar).
 *
 * Idempotent: dedup by synthetic external id imsa:<year>:r<round> + a natural
 * key (date | normalized race name). Venues are matched by name, created with
 * NULL location when missing (geocoded separately).
 *
 * Usage:  node scripts/data/seed-imsa.mjs [--from-year=2014] [--to-year=2026] [--dry-run]
 * Env:    SUPABASE_PAT, SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FROM_Y = Number(arg("from-year", "2014"));
const TO_Y = Number(arg("to-year", "2026"));

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function sqlLit(s) { return s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`; }
function normName(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

async function runSQL(query, attempt = 0) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST", headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" }, body: JSON.stringify({ query }),
  });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 8) throw new Error(`Management API ${res.status} after retries: ${await res.text()}`);
    await sleep(1000 * 2 ** attempt);
    return runSQL(query, attempt + 1);
  }
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-imsa/1.0" } });
    if (res.status === 429 || res.status >= 500) { if (attempt >= 6) throw new Error(`HTTP ${res.status}`); await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) { if (attempt >= 6) throw err; await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
}

// IMSA's top series was renamed several times; try each title (Wikipedia
// redirects are followed) until one resolves.
function titlesFor(y) {
  return [
    `${y}_IMSA_SportsCar_Championship`,
    `${y}_WeatherTech_SportsCar_Championship`,
    `${y}_IMSA_WeatherTech_SportsCar_Championship`,
    `${y}_United_SportsCar_Championship`,
    `${y}_Tudor_United_SportsCar_Championship`,
  ];
}

async function fetchSeasonHTML(y) {
  for (const title of titlesFor(y)) {
    const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=text&format=json&formatversion=2&redirects=1`;
    const j = await fetchJSON(url);
    if (j?.parse?.text) return j.parse.text;
  }
  return null;
}

function decodeEntities(s) {
  return s
    .replace(/&#160;|&nbsp;/g, " ").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
    .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function cellText(html) {
  return decodeEntities(
    html
      .replace(/<sup[\s\S]*?<\/sup>/gi, "")        // reference markers
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")                        // strip tags
      .replace(/\[edit\]/gi, "")
  ).replace(/\s+/g, " ").trim();
}

function parseDate(s, year) {
  const m = s.toLowerCase().match(/([a-z]+)\s+(\d{1,2})/);
  if (!m) return null;
  const mo = MONTHS[m[1]];
  if (!mo) return null;
  const day = parseInt(m[2], 10);
  if (!(day >= 1 && day <= 31)) return null;
  return `${year}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Pull the schedule table out of the page HTML and return parsed rounds.
function parseSchedule(html, year) {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  for (const table of tables) {
    const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    if (rows.length < 3) continue;
    // Header row = first row with >=3 cells.
    let headerCells = null, headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || [];
      if (cells.length >= 3) { headerCells = cells.map(cellText); headerIdx = i; break; }
    }
    if (!headerCells) continue;
    const find = (...names) => headerCells.findIndex((h) => names.some((n) => h.toLowerCase().includes(n)));
    const ci = {
      race: find("race", "event", "grand prix"),
      circuit: find("circuit", "track", "venue"),
      location: find("location"),
      date: find("date"),
    };
    if (ci.race < 0 || ci.circuit < 0 || ci.date < 0) continue; // not the schedule table

    const out = [];
    let round = 0;
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const cells = (rows[i].match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []).map(cellText);
      if (cells.length <= Math.max(ci.race, ci.circuit, ci.date)) continue;
      const race = cells[ci.race];
      const circuit = cells[ci.circuit];
      const dateStr = cells[ci.date];
      const eventDate = parseDate(dateStr, year);
      if (!race || !circuit || !eventDate) continue;
      round++;
      out.push({
        round, race: race.replace(/\s*\(.*?\)\s*$/, "").trim(),
        circuit,
        location: ci.location >= 0 ? cells[ci.location] || "" : "",
        eventDate,
      });
    }
    if (out.length) return out;
  }
  return [];
}

if (!DRY && !PAT) { console.error("SUPABASE_PAT required (or --dry-run)."); process.exit(2); }

// ── League ──
let leagueId = null;
if (!DRY) {
  const [{ id } = {}] = await runSQL(`select id from leagues where slug='imsa'`);
  if (id) { leagueId = id; }
  else {
    await runSQL(`insert into leagues (name, slug, sport, event_template, country, display_order) values ('IMSA SportsCar Championship', 'imsa', 'motorsports', 'field', 'US', 55) on conflict do nothing`);
    const [{ id: nid } = {}] = await runSQL(`select id from leagues where slug='imsa'`);
    leagueId = nid;
    console.log(`created league imsa (${leagueId})`);
  }
}

// ── Preload venues + existing imsa events ──
const venueByName = new Map();
const haveExt = new Set();
const haveNatural = new Set();
if (!DRY) {
  const venueRows = await runSQL(`select id, name from venues`);
  for (const v of venueRows) { const n = normName(v.name); if (!venueByName.has(n)) venueByName.set(n, v.id); }
  const evRows = await runSQL(`select external_ids->>'imsa' as ext, event_date::text d, tournament_name tn from events where league_id=${sqlLit(leagueId)}`);
  for (const e of evRows) { if (e.ext) haveExt.add(e.ext); if (e.tn) haveNatural.add(`${e.d}|${normName(e.tn)}`); }
}

const newVenues = new Map();       // normName -> {name, city, state, country}
const pending = [];
let totalRaces = 0, skipDup = 0;

for (let y = FROM_Y; y <= TO_Y; y++) {
  const html = await fetchSeasonHTML(y);
  if (!html) { console.log(`  ${y}: no Wikipedia page found`); continue; }
  const rounds = parseSchedule(html, y);
  console.log(`  ${y}: ${rounds.length} races`);
  for (const r of rounds) {
    totalRaces++;
    const ext = `${y}:r${r.round}`;
    const natural = `${r.eventDate}|${normName(r.race)}`;
    if (haveExt.has(ext) || haveNatural.has(natural)) { skipDup++; continue; }
    haveExt.add(ext); haveNatural.add(natural);

    const vnorm = normName(r.circuit);
    let venueId = venueByName.get(vnorm) || null;
    if (!venueId && !newVenues.has(vnorm)) {
      const [city, region] = (r.location || "").split(",").map((s) => s.trim());
      const country = /canada|ontario|quebec/i.test(r.location) ? "CA" : "US";
      newVenues.set(vnorm, { name: r.circuit, city: city || "", state: region || null, country });
    }
    pending.push({ ext, race: r.race, eventDate: r.eventDate, season: y, round: r.round, vnorm });
  }
}

console.log(`\n${totalRaces} races parsed, ${pending.length} new, ${skipDup} existing, ${newVenues.size} new venues`);
if (DRY) {
  for (const p of pending.slice(0, 12)) console.log(`  ${p.eventDate}  R${p.round}  ${p.race}  @ ${p.vnorm}`);
  console.log("DRY RUN — nothing written.");
  process.exit(0);
}

// ── Create new venues ──
const venueList = [...newVenues.entries()];
for (const [vnorm, v] of venueList) {
  const [row] = await runSQL(`insert into venues (name, city, state, country, status, external_ids) values (${sqlLit(v.name)}, ${sqlLit(v.city)}, ${sqlLit(v.state)}, ${sqlLit(v.country)}, 'active', '{}'::jsonb) returning id`);
  venueByName.set(vnorm, row.id);
}
console.log(`created ${venueList.length} venues`);

// ── Insert events ──
const ready = pending.map((p) => ({ ...p, venueId: venueByName.get(p.vnorm) })).filter((p) => p.venueId);
let inserted = 0;
for (let i = 0; i < ready.length; i += 200) {
  const batch = ready.slice(i, i + 200);
  const values = batch.map((p) =>
    `(${sqlLit(leagueId)}, ${sqlLit(p.venueId)}, ${sqlLit(p.eventDate)}, 'field', null, null, null, null, false, ${p.season}, false, false, ${sqlLit(p.race)}, ${sqlLit(String(p.round))}, jsonb_build_object('imsa', ${sqlLit(p.ext)}))`
  ).join(",\n");
  await runSQL(`insert into events (league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, is_postseason, is_preseason, tournament_name, round_or_stage, external_ids) values\n${values};`);
  inserted += batch.length;
}
console.log(`\n[imsa] inserted ${inserted} events, ${venueList.length} venues`);
console.log("Done.");
