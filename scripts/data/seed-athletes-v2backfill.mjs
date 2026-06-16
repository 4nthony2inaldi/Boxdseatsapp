#!/usr/bin/env node
/**
 * seed-athletes-v2backfill.mjs — completes athlete coverage for leagues where
 * ESPN's compact v3 index (used by seed-athletes-historical.mjs) is only a
 * partial subset. The v2 "core" index is the complete all-time list, but its
 * pages return bare $refs, so each athlete needs one detail fetch.
 *
 *   v3 vs v2 totals:  NFL 20,260 / 20,260 (v3 complete — skip)
 *                     MLB 13,215 / 37,718 (v3 misses ~24k incl. Bernie Williams)
 *                     NHL  2,602 / 11,707 (v3 misses ~9k incl. Jeremy Roenick)
 *
 * To keep the fetch count down we first page the v2 index for all ids
 * (~pageCount requests), drop ids we already have (dedup against the DB by
 * espn id), and only fetch details for the remainder. Detail payloads carry
 * fullName, an active flag, and a headshot href, so this run also backfills
 * headshots that v3 lacked.
 *
 * Usage:  node scripts/data/seed-athletes-v2backfill.mjs --leagues=nhl,mlb [--dry-run] [--max=N]
 * Env:    SUPABASE_PAT, SUPABASE_PROJECT (default hsntmacdhuprmtsuxhsq)
 */

const PROJECT = process.env.SUPABASE_PROJECT || "hsntmacdhuprmtsuxhsq";
const PAT = process.env.SUPABASE_PAT || "";
const DRY = process.argv.includes("--dry-run");
const leaguesArg = process.argv.find((a) => a.startsWith("--leagues="));
const maxArg = process.argv.find((a) => a.startsWith("--max="));
const MAX = maxArg ? parseInt(maxArg.slice(6), 10) : Infinity;
const CONCURRENCY = 16;

const LEAGUES = [
  { key: "mlb", sport: "baseball", path: "baseball/leagues/mlb" },
  { key: "nhl", sport: "hockey", path: "hockey/leagues/nhl" },
  { key: "nfl", sport: "football", path: "football/leagues/nfl" },
];
const wanted = leaguesArg ? new Set(leaguesArg.slice(10).split(",").map((s) => s.trim())) : new Set(["nhl", "mlb"]);

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
function normName(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}
function sqlLit(s) { return s === null || s === undefined ? "null" : `'${String(s).replace(/'/g, "''")}'`; }
const hasAlpha = (s) => /[a-zA-Z]/.test(s || "");

function makeLimiter(max) {
  let active = 0; const queue = [];
  const next = () => {
    if (active >= max || queue.length === 0) return;
    active++; const { fn, resolve, reject } = queue.shift();
    fn().then(resolve, reject).finally(() => { active--; next(); });
  };
  return (fn) => new Promise((resolve, reject) => { queue.push({ fn, resolve, reject }); next(); });
}

async function fetchJSON(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "BoxdSeats-v2backfill/1.0" } });
    if (res.status === 429 || res.status >= 500) {
      if (attempt >= 6) throw new Error(`HTTP ${res.status}`);
      await sleep(Math.min(20000, 800 * 2 ** attempt) + Math.random() * 400); return fetchJSON(url, attempt + 1);
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (attempt >= 6) throw err;
    await sleep(Math.min(20000, 800 * 2 ** attempt) + Math.random() * 400); return fetchJSON(url, attempt + 1);
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
const limiter = makeLimiter(CONCURRENCY);

const haveEspn = new Set();
const haveName = new Set();
{
  const rows = await runSQL(`select sport, external_ids->>'espn' as espn, name from athletes`);
  for (const r of rows) {
    if (r.espn) haveEspn.add(`${r.sport}|${r.espn}`);
    haveName.add(`${r.sport}|${normName(r.name)}`);
  }
  console.log(`Loaded ${rows.length} existing athletes for dedup.`);
}

const runName = new Set();
const toInsert = [];

for (const lg of LEAGUES) {
  if (!wanted.has(lg.key)) continue;

  // 1) page the v2 index for all athlete ids
  const first = await fetchJSON(`https://sports.core.api.espn.com/v2/sports/${lg.path}/athletes?limit=1000&page=1`);
  const pageCount = first.pageCount || 1;
  const ids = [];
  const collect = (d) => { for (const it of d.items || []) { const m = /athletes\/(\d+)/.exec(it.$ref || ""); if (m) ids.push(m[1]); } };
  collect(first);
  const pageJobs = [];
  for (let p = 2; p <= pageCount; p++) pageJobs.push(limiter(async () => collect(await fetchJSON(`https://sports.core.api.espn.com/v2/sports/${lg.path}/athletes?limit=1000&page=${p}`))));
  await Promise.all(pageJobs);

  // 2) only fetch details for ids we don't already have
  const need = ids.filter((id) => !haveEspn.has(`${lg.sport}|${id}`)).slice(0, MAX);
  console.log(`  [${lg.key}] index=${ids.length} already-have=${ids.length - need.length} to-fetch=${need.length}`);

  // 3) fetch details concurrently
  let done = 0, junk = 0, dup = 0, kept = 0, errored = 0;
  const jobs = need.map((id) => limiter(async () => {
    let a;
    try { a = await fetchJSON(`https://sports.core.api.espn.com/v2/sports/${lg.path}/athletes/${id}?lang=en&region=us`); }
    catch { errored++; return; }
    finally { if (++done % 2000 === 0) console.log(`    [${lg.key}] fetched ${done}/${need.length}`); }
    const name = a.displayName || a.fullName;
    if (!name || name.startsWith("[") || !hasAlpha(name)) { junk++; return; }
    const nk = `${lg.sport}|${normName(name)}`;
    if (runName.has(nk) || haveName.has(nk)) { dup++; return; }
    runName.add(nk);
    const headshot = a.headshot?.href || null;
    toInsert.push({ name, sport: lg.sport, espnId: id, active: !!a.active, headshot });
    kept++;
  }));
  await Promise.all(jobs);
  console.log(`  [${lg.key}] kept=${kept} junk=${junk} dup=${dup} errored=${errored}`);
}

console.log(`\nTotal new athletes to insert: ${toInsert.length}`);
if (DRY) {
  const sample = toInsert.slice(0, 12).map((r) => `${r.name}${r.headshot ? " *" : ""}`).join(", ");
  console.log("sample:", sample);
  console.log("DRY RUN — nothing written."); process.exit(0);
}

let inserted = 0;
for (let i = 0; i < toInsert.length; i += 500) {
  const batch = toInsert.slice(i, i + 500);
  const values = batch.map((r) => `(${sqlLit(r.name)}, ${sqlLit(r.sport)}::sport_type, ${sqlLit(r.headshot)}, ${r.active}, jsonb_build_object('espn', ${sqlLit(r.espnId)}))`).join(",\n");
  await runSQL(`insert into athletes (name, sport, headshot_url, is_active, external_ids) values\n${values};`);
  inserted += batch.length;
  if (inserted % 2000 < 500) console.log(`  inserted ${inserted}/${toInsert.length}`);
}
console.log(`\nDone. Inserted ${inserted} athletes.`);
