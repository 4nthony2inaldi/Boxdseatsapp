#!/usr/bin/env node
/**
 * seed-mlb-history.mjs — backfill pre-2002 MLB games so fans can log historical
 * games as real, pre-populated events (matchup + score + venue), not just
 * manual entries. Source: the official MLB Stats API (statsapi.mlb.com), which
 * has complete schedules + scores + venues back over a century.
 *
 * Design notes:
 *  - Teams: MLB franchise ids are stable across relocations/renames, so a fixed
 *    id -> current-franchise map handles Brooklyn Dodgers, the two Washington
 *    Senators (142=Twins-origin, 140=Rangers-origin), Seattle Pilots (158=
 *    Brewers), St. Louis Browns (110=Orioles), Expos (120=Nationals), etc.
 *  - Venues: resolved by name/alias, then disambiguated by YEAR — a "Yankee
 *    Stadium" game in 1969 maps to Original Yankee Stadium (1923-2008), not the
 *    2009 park, using the opened/closed years. Unmatched venues are reported so
 *    we can seed the gaps (no venue_id => not loggable-at-venue, so skipped).
 *  - Dedup: external_ids.mlb = gamePk (unique per game, so doubleheaders stay
 *    two rows and re-runs are idempotent). Existing data starts at 2002 and this
 *    stops at 2001, so there's no overlap with the ESPN-sourced events.
 *
 * Usage:  node scripts/data/seed-mlb-history.mjs --from=1969 --to=1969 [--dry-run]
 * Env:    DATABASE_URL  (direct Postgres)
 */

import pg from 'pg';
const { Client } = pg;

const DRY = process.argv.includes('--dry-run');
const arg = (k, d) => {
  const m = process.argv.find((a) => a.startsWith(`--${k}=`));
  return m ? m.split('=')[1] : d;
};
const FROM = parseInt(arg('from', '1969'), 10);
const TO = parseInt(arg('to', String(FROM)), 10);
// Optional single-venue mode: only ingest games at this MLB venue id, and pin
// every match to a specific one of our venues by name (skips venue matching).
const MLB_VENUE = arg('mlb-venue', '');
const OUR_VENUE = arg('our-venue', '');

const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// MLB Stats API franchise id -> our team short_name (franchise lineage).
const MLB_TEAM = {
  108: 'Angels', 109: 'Diamondbacks', 110: 'Orioles', 111: 'Red Sox', 112: 'Cubs',
  113: 'Reds', 114: 'Guardians', 115: 'Rockies', 116: 'Tigers', 117: 'Astros',
  118: 'Royals', 119: 'Dodgers', 120: 'Nationals', 121: 'Mets', 133: 'Athletics',
  134: 'Pirates', 135: 'Padres', 136: 'Mariners', 137: 'Giants', 138: 'Cardinals',
  139: 'Rays', 140: 'Rangers', 141: 'Blue Jays', 142: 'Twins', 143: 'Phillies',
  144: 'Braves', 145: 'White Sox', 146: 'Marlins', 147: 'Yankees', 158: 'Brewers',
};

const POSTSEASON_ROUND = { F: 'Wild Card', D: 'Division Series', L: 'League Championship Series', W: 'World Series' };

async function fetchSeason(year) {
  const url =
    `https://statsapi.mlb.com/api/v1/schedule?sportId=1` +
    `&startDate=${year}-01-01&endDate=${year}-12-31` +
    `&gameTypes=R,F,D,L,W&hydrate=linescore`;
  const res = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error(`MLB API ${res.status} for ${year}`);
  const json = await res.json();
  const games = [];
  for (const d of json.dates || []) for (const g of d.games || []) games.push(g);
  return games;
}

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query('begin');

try {
  const { rows: leagueRows } = await db.query(`select id from public.leagues where slug = 'mlb'`);
  if (!leagueRows.length) throw new Error('no mlb league row');
  const mlbLeagueId = leagueRows[0].id;

  const { rows: teams } = await db.query(`
    select t.id, t.short_name from teams t
    join leagues l on l.id = t.league_id where l.slug = 'mlb'
  `);
  const teamByShort = new Map();
  for (const t of teams) teamByShort.set(normName(t.short_name), t.id);

  // Preload every gamePk we've already ingested once (there's no index on
  // external_ids->>'mlb', so a per-game lookup would full-scan events). Checking
  // an in-memory set keeps the run fast across tens of thousands of games.
  const { rows: seenRows } = await db.query(
    `select external_ids->>'mlb' as mlb from events where external_ids ? 'mlb'`
  );
  const seenGamePks = new Set(seenRows.map((r) => r.mlb));

  // Single-venue mode: resolve the target venue once, by exact name.
  let forcedVenueId = null;
  if (OUR_VENUE) {
    const cands = venuesByName.get(normName(OUR_VENUE)) || [];
    const exact = cands.filter((v) => normName(v.name) === normName(OUR_VENUE));
    if (exact.length !== 1) throw new Error(`--our-venue "${OUR_VENUE}" matched ${exact.length} venues (need exactly 1)`);
    forcedVenueId = exact[0].id;
    console.log(`Single-venue mode: MLB venue ${MLB_VENUE || '(any)'} -> "${OUR_VENUE}" (${forcedVenueId})\n`);
  }

  // Venues + aliases, with years for date-aware disambiguation.
  const { rows: venues } = await db.query(
    `select id, name, city, opened_year, closed_year from venues`
  );
  const { rows: aliasRows } = await db.query(`select venue_id, alias_name from venue_aliases`);
  const venuesByName = new Map();
  const index = (key, v) => {
    if (!venuesByName.has(key)) venuesByName.set(key, []);
    venuesByName.get(key).push(v);
  };
  const vById = new Map(venues.map((v) => [v.id, v]));
  for (const v of venues) index(normName(v.name), v);
  for (const a of aliasRows) {
    const v = vById.get(a.venue_id);
    if (v) index(normName(a.alias_name), v);
  }

  function resolveVenue(name, year) {
    const cands = venuesByName.get(normName(name)) || [];
    if (!cands.length) return null;
    // Prefer the venue whose opened/closed range contains the game year.
    const inRange = cands.filter(
      (v) => (v.opened_year == null || v.opened_year <= year) && (v.closed_year == null || year <= v.closed_year)
    );
    return (inRange[0] || cands[0]).id;
  }

  let totalGames = 0, finalGames = 0, wouldInsert = 0, already = 0;
  const teamMiss = new Map();
  const venueMiss = new Map();
  const samples = [];

  for (let year = FROM; year <= TO; year++) {
    const games = await fetchSeason(year);
    let seasonInsert = 0;
    for (const g of games) {
      if (MLB_VENUE && String(g.venue?.id) !== MLB_VENUE) continue;
      totalGames++;
      if ((g.status?.abstractGameState || g.status?.detailedState) !== 'Final') continue;
      finalGames++;

      const gamePk = String(g.gamePk);
      const date = g.officialDate || (g.gameDate || '').slice(0, 10);
      const homeMlb = g.teams?.home?.team?.id;
      const awayMlb = g.teams?.away?.team?.id;
      const homeShort = MLB_TEAM[homeMlb];
      const awayShort = MLB_TEAM[awayMlb];
      const homeId = homeShort ? teamByShort.get(normName(homeShort)) : null;
      const awayId = awayShort ? teamByShort.get(normName(awayShort)) : null;
      if (!homeId || !awayId) {
        // Non-MLB-franchise teams (All-Star sides, Negro Leagues) -> skip.
        const label = `${g.teams?.away?.team?.name} @ ${g.teams?.home?.team?.name}`;
        teamMiss.set(label, (teamMiss.get(label) || 0) + 1);
        continue;
      }

      const vname = g.venue?.name || '';
      const venueId = forcedVenueId || resolveVenue(vname, year);
      if (!venueId) {
        venueMiss.set(vname, (venueMiss.get(vname) || 0) + 1);
        continue;
      }

      const gt = g.gameType;
      const isPost = gt !== 'R';
      const row = {
        league_id: mlbLeagueId,
        venue_id: venueId,
        event_date: date,
        event_template: 'match',
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: g.teams?.home?.score ?? null,
        away_score: g.teams?.away?.score ?? null,
        season: year,
        is_postseason: isPost,
        round_or_stage: isPost ? POSTSEASON_ROUND[gt] || 'Postseason' : 'Regular Season',
        venue_name_at_time: vname,
        external_ids: { mlb: gamePk },
      };

      if (seenGamePks.has(gamePk)) { already++; continue; }
      seenGamePks.add(gamePk);

      wouldInsert++;
      seasonInsert++;
      if (samples.length < 6) {
        samples.push(`${date} ${awayShort} ${row.away_score}-${row.home_score} ${homeShort} @ ${vname}${isPost ? ` [${row.round_or_stage}]` : ''}`);
      }
      if (!DRY) {
        await db.query(
          `insert into events (league_id, venue_id, event_date, event_template, home_team_id, away_team_id,
             home_score, away_score, season, is_postseason, round_or_stage, venue_name_at_time, external_ids)
           values ($1,$2,$3,'match',$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
          [row.league_id, row.venue_id, row.event_date, row.home_team_id, row.away_team_id,
           row.home_score, row.away_score, row.season, row.is_postseason, row.round_or_stage,
           row.venue_name_at_time, row.external_ids]
        );
      }
    }
    console.log(`  ${year}: ${games.length} games, ${seasonInsert} ${DRY ? 'would insert' : 'inserted'}`);
  }

  console.log(
    `\n${FROM}-${TO}: ${totalGames} games, ${finalGames} final; ` +
      `${DRY ? 'would insert' : 'inserted'} ${wouldInsert}; ${already} already present.`
  );
  if (venueMiss.size) {
    console.log(`\nUNMATCHED VENUES (games skipped — seed these to include them):`);
    for (const [v, n] of [...venueMiss.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${n.toString().padStart(5)}  ${v}`);
    }
  }
  if (teamMiss.size) {
    console.log(`\nSKIPPED (non-franchise teams — All-Star / Negro Leagues / other):`);
    for (const [t, n] of [...teamMiss.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
      console.log(`  ${n.toString().padStart(4)}  ${t}`);
    }
  }
  if (samples.length) {
    console.log(`\nSAMPLE events:`);
    for (const s of samples) console.log(`  ${s}`);
  }

  if (DRY) {
    await db.query('rollback');
    console.log('\n[DRY] rolled back — no changes written.');
  } else {
    await db.query('commit');
    console.log('\nCommitted.');
  }
} catch (err) {
  await db.query('rollback');
  console.error('Error, rolled back:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
