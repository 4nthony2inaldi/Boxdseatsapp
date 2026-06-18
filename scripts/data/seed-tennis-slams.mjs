#!/usr/bin/env node
/**
 * seed-tennis-slams.mjs — fills GAPS in Grand Slam coverage. Historical tennis
 * was ingested as per-day events ("Day N" at the slam venue, for both atp and
 * wta), but some slam-years are missing entirely (e.g. Wimbledon 2008/11/13/15,
 * US Open 2002-04). This adds only the missing (slam, year) combos, matching
 * the existing structure, from ESPN's tennis scoreboard.
 *
 * Safe: skips any (venue, year) that already has events; idempotent on the
 * existing external id scheme "<espnId>-<year>-d<N>". Additive only.
 *
 * Usage:  SUPABASE_PAT=... node scripts/data/seed-tennis-slams.mjs [--from-year=2002] [--to-year=2025] [--dry-run]
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const FROM_Y = Number(arg("from-year", "2002"));
const TO_Y = Number(arg("to-year", "2025"));

const SLAMS = [
  { key: "ao", name: "Australian Open", venueId: "472f7bba-1fd2-4d7d-ac48-1a7581efd5fc", probes: ["0118", "0122", "0125"] },
  { key: "rg", name: "Roland Garros", venueId: "8019616f-6552-498c-87a7-43e1dff70e6e", probes: ["0528", "0601", "0605"] },
  { key: "wimbledon", name: "Wimbledon", venueId: "33152e34-1b62-4bd6-a818-0626e9c916c5", probes: ["0630", "0703", "0707"] },
  { key: "usopen", name: "US Open", venueId: "8150a029-4f45-4177-8e6a-6b253a14f304", probes: ["0830", "0902", "0906"] },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ql = (s) => (s == null ? "null" : "'" + String(s).replace(/'/g, "''") + "'");
const ymd = (d) => d.toISOString().slice(0, 10);

async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-tennis/1.0" } });
    if (res.status === 429 || res.status >= 500) { if (attempt >= 6) throw new Error(`HTTP ${res.status}`); await sleep(800 * 2 ** attempt); return fetchJSON(url, attempt + 1); }
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

// Resolve a slam tournament (id + date range) for a given year via probe dates.
async function findSlam(slam, year) {
  for (const md of slam.probes) {
    const data = await fetchJSON(`https://site.api.espn.com/apis/site/v2/sports/tennis/atp/scoreboard?dates=${year}${md}`);
    const ev = (data.events || []).find((e) => e.major || (e.name || "").toLowerCase().includes(slam.key === "usopen" ? "us open" : slam.name.toLowerCase()));
    if (ev?.date && ev?.endDate) return { id: String(ev.id), start: ev.date.slice(0, 10), end: ev.endDate.slice(0, 10) };
  }
  return null;
}

// Load league ids + which (venue, year) combos already exist (read-only, so
// dry-run reflects real gaps too — requires SUPABASE_PAT).
const leagueIds = {};
const existing = new Set();   // "<venueId>:<year>" combos that already have events
if (PAT) {
  for (const slug of ["atp", "wta"]) { const [{ id } = {}] = await runSQL(`select id from leagues where slug=${ql(slug)}`); leagueIds[slug] = id; }
  const venueList = SLAMS.map((s) => `'${s.venueId}'`).join(",");
  for (const r of await runSQL(`select distinct venue_id, season from events where venue_id in (${venueList})`)) existing.add(`${r.venue_id}:${r.season}`);
}

const rows = [];
for (const slam of SLAMS) {
  for (let y = FROM_Y; y <= TO_Y; y++) {
    if (existing.has(`${slam.venueId}:${y}`)) continue; // already have this slam-year
    const t = await findSlam(slam, y);
    if (!t) { console.log(`  ${slam.name} ${y}: not found on ESPN`); continue; }
    // ESPN's start..end includes qualifying week (~20d); existing slam-years are
    // the ~15-day main draw ending on the final, so cap to the last 15 days.
    const end = new Date(t.end + "T00:00:00Z");
    const startCandidate = new Date(t.start + "T00:00:00Z");
    const earliest = new Date(end); earliest.setUTCDate(earliest.getUTCDate() - 14);
    const start = startCandidate > earliest ? startCandidate : earliest;
    let day = 0; const days = [];
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) { day++; days.push({ date: ymd(d), n: day }); }
    if (!days.length) continue;
    console.log(`  ${slam.name} ${y}: +${days.length} days (${t.start}..${t.end})`);
    for (const slug of ["atp", "wta"]) for (const d of days) {
      rows.push({ slug, venueId: slam.venueId, name: slam.name, season: y, date: d.date, n: d.n, ext: `${t.id}-${y}-d${d.n}` });
    }
  }
}
console.log(`${rows.length} day-rows to add`);
if (DRY) { console.log("DRY RUN — nothing written."); process.exit(0); }
if (!rows.length) { console.log("Nothing to fill."); process.exit(0); }

let inserted = 0;
for (let i = 0; i < rows.length; i += 300) {
  const batch = rows.slice(i, i + 300);
  const values = batch.map((r) => `(${ql(leagueIds[r.slug])},${ql(r.venueId)},${ql(r.date)},'field',null,null,null,null,false,${r.season},false,false,${ql(r.name)},${ql("Day " + r.n)},jsonb_build_object('espn',${ql(r.ext)}))`).join(",\n");
  await runSQL(`insert into events (league_id,venue_id,event_date,event_template,home_team_id,away_team_id,home_score,away_score,is_draw,season,is_postseason,is_preseason,tournament_name,round_or_stage,external_ids) values\n${values};`);
  inserted += batch.length;
}
console.log(`[tennis-slams] inserted ${inserted} day-rows`);
console.log("Done.");
