#!/usr/bin/env node
/**
 * validate-data.mjs — post-seed data quality checks for BoxdSeats.
 *
 * Usage:  node scripts/data/validate-data.mjs
 * Env:    DATABASE_URL (defaults to local test DB)
 *
 * Hard failures (exit 1):
 *   - events whose home/away team belongs to a different league than the event
 *   - completed (scored-template) ESPN-sourced events with NULL scores
 *   - duplicate external ESPN ids (teams per league, venues, events per league)
 *   - duplicate natural keys (league + date + home + away + same espn id absent twice)
 *   - event dates outside 2000-01-01 .. today
 * Informational:
 *   - per-league event counts by season
 *   - teams/venues still missing external ids
 */

import pg from 'pg';

const { Client } = pg;
const DEFAULT_DB = 'postgres://boxd:boxd@localhost:5432/boxdseats';

const db = new Client({ connectionString: process.env.DATABASE_URL || DEFAULT_DB });
await db.connect();

let hardFailures = 0;

async function check(title, sql, { hard = true, expectZero = true } = {}) {
  const { rows } = await db.query(sql);
  const n = rows.length;
  const ok = !expectZero || n === 0;
  const tag = ok ? 'PASS' : hard ? 'FAIL' : 'WARN';
  console.log(`[${tag}] ${title}${expectZero ? ` (${n} offending rows)` : ''}`);
  if (!ok) {
    for (const r of rows.slice(0, 10)) console.log('       ', JSON.stringify(r));
    if (n > 10) console.log(`        ... and ${n - 10} more`);
    if (hard) hardFailures++;
  }
  return rows;
}

console.log('=== BoxdSeats data validation ===\n');

// 1. Orphan / cross-league team references on events
await check(
  'events reference home teams in the same league',
  `select e.id, e.event_date, l.slug as event_league, tl.slug as team_league
     from events e
     join leagues l on l.id = e.league_id
     join teams t on t.id = e.home_team_id
     join leagues tl on tl.id = t.league_id
    where t.league_id <> e.league_id`,
);
await check(
  'events reference away teams in the same league',
  `select e.id, e.event_date, l.slug as event_league, tl.slug as team_league
     from events e
     join leagues l on l.id = e.league_id
     join teams t on t.id = e.away_team_id
     join leagues tl on tl.id = t.league_id
    where t.league_id <> e.league_id`,
);
await check(
  'match-template events have both teams set',
  `select e.id, e.event_date, l.slug
     from events e join leagues l on l.id = e.league_id
    where e.event_template = 'match'
      and (e.home_team_id is null or e.away_team_id is null)
      and e.external_ids ? 'espn'`,
);

// 2. Completed events (all ESPN-sourced events are completed) must have scores
await check(
  'ESPN-sourced match events have scores',
  `select e.id, e.event_date, l.slug, e.external_ids->>'espn' as espn
     from events e join leagues l on l.id = e.league_id
    where e.external_ids ? 'espn'
      and e.event_template = 'match'
      and (e.home_score is null or e.away_score is null)`,
);

// 3. Duplicate external ids
await check(
  'no duplicate ESPN event ids within a league',
  `select league_id, external_ids->>'espn' as espn, count(*)
     from events where external_ids ? 'espn'
    group by 1, 2 having count(*) > 1`,
);
await check(
  'no duplicate ESPN team ids within a league',
  `select league_id, external_ids->>'espn' as espn, count(*)
     from teams where external_ids ? 'espn'
    group by 1, 2 having count(*) > 1`,
);
await check(
  'no duplicate ESPN venue ids',
  `select external_ids->>'espn' as espn, count(*)
     from venues where external_ids ? 'espn'
    group by 1 having count(*) > 1`,
);

// 4. Natural-key duplicates: same league/date/home/away appearing twice where
//    at least one row lacks an external id (true doubleheaders all carry
//    distinct ESPN ids, so rows that BOTH have espn ids are legitimate).
await check(
  'no un-deduped natural-key duplicates (league+date+home+away)',
  `select l.slug, e.event_date, e.home_team_id, e.away_team_id, count(*) as n,
          count(*) filter (where e.external_ids ? 'espn') as with_espn
     from events e join leagues l on l.id = e.league_id
    where e.home_team_id is not null and e.away_team_id is not null
    group by 1, 2, 3, 4
   having count(*) > 1 and count(*) filter (where not e.external_ids ? 'espn') > 0`,
);

// 5. Date sanity
await check(
  'event dates within 2000-01-01 .. today',
  `select e.id, e.event_date, l.slug
     from events e join leagues l on l.id = e.league_id
    where e.event_date < '2000-01-01' or e.event_date > current_date`,
);

// 6. Venue sanity (informational)
await check(
  'venues missing external ESPN id (info)',
  `select v.id, v.name from venues v
    where not v.external_ids ? 'espn'
      and exists (select 1 from events e where e.venue_id = v.id and e.external_ids ? 'espn')`,
  { hard: false },
);
await check(
  'teams missing external ESPN id (info)',
  `select l.slug, t.name from teams t join leagues l on l.id = t.league_id
    where not t.external_ids ? 'espn'`,
  { hard: false },
);

// 7. Per-league counts by season (informational report)
console.log('\n--- events per league/season ---');
{
  const { rows } = await db.query(
    `select l.slug, e.season, count(*)::int as events,
            count(*) filter (where e.is_postseason)::int as postseason,
            count(*) filter (where e.external_ids ? 'espn')::int as espn_sourced
       from events e join leagues l on l.id = e.league_id
      group by 1, 2 order by 1, 2`,
  );
  console.log('league  season  events  postseason  espn');
  for (const r of rows) {
    console.log(
      `${r.slug.padEnd(8)}${String(r.season).padEnd(8)}${String(r.events).padEnd(8)}` +
      `${String(r.postseason).padEnd(12)}${r.espn_sourced}`,
    );
  }
}

console.log('\n--- totals ---');
{
  const { rows } = await db.query(
    `select
       (select count(*) from events) as events,
       (select count(*) from teams) as teams,
       (select count(*) from venues) as venues,
       (select count(*) from venue_teams) as venue_teams`,
  );
  console.log(JSON.stringify(rows[0]));
}

await db.end();

if (hardFailures > 0) {
  console.error(`\n${hardFailures} hard validation failure(s).`);
  process.exit(1);
}
console.log('\nAll hard checks passed.');
