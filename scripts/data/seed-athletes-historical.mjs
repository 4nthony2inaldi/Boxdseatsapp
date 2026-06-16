#!/usr/bin/env node
/**
 * seed-athletes-historical.mjs — bulk-imports the full historical athlete index
 * for the major North American leagues so the favorite-athlete picker isn't
 * limited to current rosters (seed-athletes.mjs) or a hand-curated legend list
 * (seed-legends.mjs).
 *
 * Source: ESPN's core v3 athlete index, which returns athletes *inline* with
 * names + an active flag, paginated 1000/page — so the entire all-time list for
 * a league costs only ~pageCount requests (no per-athlete detail fetch):
 *   https://sports.core.api.espn.com/v3/sports/{sport}/{league}/athletes?limit=1000&page=N
 *
 * Coverage (counts as of writing):
 *   NFL  ~20,260 · MLB ~13,215 · NHL ~2,602 · NBA ~845 (ESPN caps the NBA
 *   index and its season endpoints are unreliable, so NBA depth is limited here
 *   and leans on seed-legends.mjs for the icons).
 *
 * Notes:
 *  - Junk rows (bracketed placeholders like "[Touchback]", empty/alpha-less
 *    names) are dropped.
 *  - Headshots aren't in the v3 payload and HEAD-checking tens of thousands is
 *    impractical, so imported rows carry no headshot (the UI falls back to
 *    initials); current players and curated legends already have headshots.
 *  - is_active comes straight from ESPN's flag.
 *  - Idempotent: dedups against existing athletes by (sport, espn id) and by
 *    (sport, normalized name); writes via the Supabase Management API.
 *
 * Usage:  node scripts/data/seed-athletes-historical.mjs [--dry-run] [--leagues=nfl,mlb,nhl,nba]
 * Env:    SUPABASE_PAT, SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const leaguesArg = process.argv.find((a) => a.startsWith("--leagues="));

const LEAGUES = [
  { key: "nfl", sport: "football", path: "football/nfl" },
  { key: "mlb", sport: "baseball", path: "baseball/mlb" },
  { key: "nhl", sport: "hockey", path: "hockey/nhl" },
  { key: "nba", sport: "basketball", path: "basketball/nba" },
];
const wanted = leaguesArg ? new Set(leaguesArg.slice(10).split(",").map((s) => s.trim())) : null;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function normName(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function sqlLit(s) {
  if (s === null || s === undefined) return "null";
  return `'${String(s).replace(/'/g, "''")}'`;
}
const hasAlpha = (s) => /[a-zA-Z]/.test(s || "");

async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-import/1.0" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 6) throw new Error(`HTTP ${res.status}: ${url}`);
      await sleep(1000 * 2 ** attempt); return fetchJSON(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 6) throw err;
    await sleep(1000 * 2 ** attempt); return fetchJSON(url, attempt + 1);
  }
}

async function runSQL(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAT}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Management API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ---------------------------------------------------------------------------

if (!DRY && !PAT) { console.error("SUPABASE_PAT is required (or pass --dry-run)."); process.exit(2); }

// Existing athletes for dedup.
const haveEspn = new Set();
const haveName = new Set();
if (!DRY) {
  const rows = await runSQL(`select sport, external_ids->>'espn' as espn, name from athletes`);
  for (const r of rows) {
    if (r.espn) haveEspn.add(`${r.sport}|${r.espn}`);
    haveName.add(`${r.sport}|${normName(r.name)}`);
  }
  console.log(`Loaded ${rows.length} existing athletes for dedup.`);
}

const seen = new Set();
const toInsert = [];
const perLeague = {};

for (const lg of LEAGUES) {
  if (wanted && !wanted.has(lg.key)) continue;
  const first = await fetchJSON(`https://sports.core.api.espn.com/v3/sports/${lg.path}/athletes?limit=1000&page=1`);
  const pageCount = first.pageCount || 1;
  const stat = (perLeague[lg.key] = { total: first.count || 0, kept: 0, junk: 0, dupRun: 0, dupExisting: 0 });
  for (let page = 1; page <= pageCount; page++) {
    const data = page === 1 ? first : await fetchJSON(`https://sports.core.api.espn.com/v3/sports/${lg.path}/athletes?limit=1000&page=${page}`);
    for (const a of data.items || []) {
      const name = a.displayName || a.fullName;
      if (!name || name.startsWith("[") || !hasAlpha(name)) { stat.junk++; continue; }
      const espnId = String(a.id);
      const ek = `${lg.sport}|${espnId}`;
      const nk = `${lg.sport}|${normName(name)}`;
      if (seen.has(ek) || seen.has(nk)) { stat.dupRun++; continue; }
      seen.add(ek); seen.add(nk);
      if (haveEspn.has(ek) || haveName.has(nk)) { stat.dupExisting++; continue; }
      toInsert.push({ name, sport: lg.sport, espnId, active: !!a.active });
      stat.kept++;
    }
  }
  console.log(`  [${lg.key}] index=${stat.total} new=${stat.kept} junk=${stat.junk} dup-existing=${stat.dupExisting} dup-run=${stat.dupRun}`);
}

console.log(`\nTotal new athletes to insert: ${toInsert.length}`);
if (DRY) { console.log("DRY RUN — nothing written."); process.exit(0); }

let inserted = 0;
for (let i = 0; i < toInsert.length; i += 500) {
  const batch = toInsert.slice(i, i + 500);
  const values = batch.map((r) =>
    `(${sqlLit(r.name)}, ${sqlLit(r.sport)}::sport_type, null, ${r.active}, jsonb_build_object('espn', ${sqlLit(r.espnId)}))`
  ).join(",\n");
  await runSQL(`insert into athletes (name, sport, headshot_url, is_active, external_ids) values\n${values};`);
  inserted += batch.length;
  if (inserted % 2000 < 500) console.log(`  inserted ${inserted}/${toInsert.length}`);
}
console.log(`\nDone. Inserted ${inserted} athletes.`);
