#!/usr/bin/env node
/**
 * backfill-walkoffs.mjs — one-time pass to tag 'walkoff' on baseball games that
 * were ALREADY logged before walk-off detection shipped in the box-score
 * ingest. Going forward the ingest tags them at log time; this catches the
 * existing logged population.
 *
 * Walk-offs aren't derivable from stored data (we keep final scores + player
 * lines, not innings), so we re-read each game's linescore: ESPN's summary for
 * ESPN-sourced events, the MLB Stats API for MLB-sourced ones (the historical
 * seed). Same rule as ingest's isWalkoff: home won, final inning >= 9, and the
 * home team was tied or trailing entering the bottom of that inning.
 *
 * Only LOGGED games are considered (that's the population that shows badges),
 * and games already tagged are skipped, so it's idempotent and re-runnable.
 *
 * Usage:  node scripts/data/backfill-walkoffs.mjs [--dry-run]
 * Env:    DATABASE_URL  (direct Postgres)
 */

import pg from 'pg';
const { Client } = pg;

const DRY = process.argv.includes('--dry-run');

// ESPN summary path per baseball league slug.
const ESPN_PATH = {
  mlb: 'baseball/mlb',
  wbc: 'baseball/world-baseball-classic',
  'caribbean-series': 'baseball/caribbean-series',
};

const numOf = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

// Shared rule: home total/away total + per-inning run arrays.
function isWalkoff(homeTotal, awayTotal, homeInn, awayInn) {
  if (homeTotal <= awayTotal) return false;
  const innings = Math.max(homeInn.length, awayInn.length);
  if (innings < 9) return false;
  const lastHome = numOf(homeInn[innings - 1]);
  return homeTotal - lastHome <= awayTotal;
}

async function fetchJson(url, headers) {
  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Returns true/false walkoff, or null if the linescore couldn't be read.
async function evalEspn(slug, espnId) {
  const path = ESPN_PATH[slug];
  if (!path) return null;
  const d = await fetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${espnId}`,
    { 'User-Agent': 'BoxdSeats/1.0 (arinaldi@yext.com)' }
  );
  const cs = d?.header?.competitions?.[0]?.competitors;
  if (!Array.isArray(cs)) return null;
  const home = cs.find((c) => c?.homeAway === 'home');
  const away = cs.find((c) => c?.homeAway === 'away');
  if (!home || !away) return null;
  const line = (c) => (Array.isArray(c.linescores) ? c.linescores.map((x) => numOf(x?.value ?? x)) : []);
  return isWalkoff(numOf(home.score), numOf(away.score), line(home), line(away));
}

async function evalMlb(gamePk) {
  const d = await fetchJson(`https://statsapi.mlb.com/api/v1/game/${gamePk}/linescore`);
  const innings = d?.innings;
  if (!Array.isArray(innings) || !innings.length) return null;
  const homeInn = innings.map((i) => numOf(i?.home?.runs));
  const awayInn = innings.map((i) => numOf(i?.away?.runs));
  const homeTotal = numOf(d?.teams?.home?.runs);
  const awayTotal = numOf(d?.teams?.away?.runs);
  return isWalkoff(homeTotal, awayTotal, homeInn, awayInn);
}

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

try {
  const { rows } = await db.query(`
    select distinct e.id, e.external_ids, l.slug
    from events e
    join leagues l on l.id = e.league_id
    join event_logs el on el.event_id = e.id
    where l.sport = 'baseball'
      and not (coalesce(e.event_tags, '{}'::text[]) @> array['walkoff'])
  `);
  console.log(`Logged baseball games to check: ${rows.length}\n`);

  const walkoffIds = [];
  let checked = 0, unresolved = 0;
  const CONCURRENCY = 10; // parallel fetches — polite for a one-time pass, ~10x faster
  const evalOne = async (e) => {
    const ext = e.external_ids || {};
    if (ext.espn) return evalEspn(e.slug, String(ext.espn));
    if (ext.mlb) return evalMlb(String(ext.mlb));
    return null;
  };
  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(evalOne));
    results.forEach((res, j) => {
      checked++;
      if (res === null) unresolved++;
      else if (res) walkoffIds.push(batch[j].id);
    });
    if (i % 500 === 0 || i + CONCURRENCY >= rows.length) {
      console.log(`  ...${Math.min(checked, rows.length)}/${rows.length} (${walkoffIds.length} walk-offs so far)`);
    }
  }

  console.log(
    `\nChecked ${checked}; found ${walkoffIds.length} walk-off(s); ${unresolved} could not be evaluated (no linescore).`
  );

  if (DRY) {
    console.log('\n[DRY] no changes written.');
  } else if (walkoffIds.length) {
    const CHUNK = 500;
    let tagged = 0;
    for (let i = 0; i < walkoffIds.length; i += CHUNK) {
      const batch = walkoffIds.slice(i, i + CHUNK);
      const { rowCount } = await db.query(
        `update events
         set event_tags = array_append(coalesce(event_tags, '{}'::text[]), 'walkoff')
         where id = any($1::uuid[])
           and not (coalesce(event_tags, '{}'::text[]) @> array['walkoff'])`,
        [batch]
      );
      tagged += rowCount ?? 0;
    }
    console.log(`\nTagged ${tagged} event(s) with 'walkoff'.`);
  } else {
    console.log('\nNothing to tag.');
  }
} catch (err) {
  console.error('Error:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
