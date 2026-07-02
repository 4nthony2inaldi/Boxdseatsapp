#!/usr/bin/env node
/**
 * merge_venues.mjs — merge curated duplicate venues into a canonical row.
 *
 * A rename (Estadio Azteca -> Estadio Banorte) or a re-seed under a new ESPN id
 * splits one physical building into two venue rows, scattering its event
 * history and check-ins. This repoints the duplicate's events, logs, visits,
 * list items, league favorites, team links and aliases onto the canonical row,
 * keeps the old name as a search alias, optionally renames the canonical row to
 * the current name, then deletes the duplicate.
 *
 * The MERGES list below is hand-curated: only same-physical-building pairs
 * (renames / seed dups), never relocations to a different building.
 *
 * Repointing is conflict-safe: for any table with a unique constraint that
 * includes venue_id (e.g. venue_visits (user_id, venue_id)), a duplicate row
 * that would collide with an existing canonical row is dropped; every other row
 * is moved. It never blanket-deletes a table's rows on a single conflict.
 *
 * Dry-run by default: prints each venue's detail and the planned repoint, then
 * ROLLS BACK. Pass --apply to commit.
 *
 * Usage:  node scripts/data/merge_venues.mjs [--apply]
 * Env:    DATABASE_URL  (direct Postgres)
 */

import pg from 'pg';
const { Client } = pg;

const APPLY = process.argv.includes('--apply');

// Curated merges. Each: the canonical (kept) venue, the duplicate(s) folded in,
// the city they share (to disambiguate names), and an optional rename to apply
// to the canonical row (its old name is auto-kept as an alias).
const MERGES = [
  {
    city: 'Mexico City',
    canon: 'Arena CDMX',
    dups: ['Mexico City Arena'],
  },
  {
    city: 'Mexico City',
    canon: 'Estadio Banorte',
    dups: ['Estadio Azteca'],
  },
];

// Tables whose venue_id (or fav_venue_id) points at a venue and must be moved.
const REPOINT = [
  { table: 'events', col: 'venue_id' },
  { table: 'event_logs', col: 'venue_id' },
  { table: 'venue_visits', col: 'venue_id' },
  { table: 'list_items', col: 'venue_id' },
  { table: 'user_league_favorites', col: 'venue_id' },
  { table: 'venue_teams', col: 'venue_id' },
  { table: 'venue_aliases', col: 'venue_id' },
  { table: 'profiles', col: 'fav_venue_id' },
];

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();

// For a table + venue column, return the "other" columns of any unique/primary
// constraint that includes that column — those are what a moved row would
// collide on. Empty if the column isn't part of a uniqueness constraint.
async function conflictKeys(table, col) {
  const { rows } = await db.query(
    `select array_agg(att.attname::text order by k.ord) as cols
       from pg_constraint con
       join lateral unnest(con.conkey) with ordinality k(attnum, ord) on true
       join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
      where con.conrelid = $1::regclass and con.contype in ('u','p')
      group by con.conname`,
    [table]
  );
  const keySets = [];
  for (const r of rows) {
    if (r.cols.includes(col)) keySets.push(r.cols.filter((c) => c !== col));
  }
  // Use the constraint with the most discriminating (longest) other-key set.
  keySets.sort((a, b) => b.length - a.length);
  return keySets[0] || null;
}

async function venueDetail(id) {
  const { rows } = await db.query(
    `select v.id, v.name, v.city,
            extensions.ST_Y(v.location::extensions.geometry) as lat,
            extensions.ST_X(v.location::extensions.geometry) as lng,
            v.photo_url,
            (select count(*) from events e where e.venue_id = v.id) as events,
            (select count(*) from event_logs el where el.venue_id = v.id) as logs,
            (select count(*) from venue_visits vv where vv.venue_id = v.id) as visits,
            (select count(*) from list_items li where li.venue_id = v.id) as list_items,
            (select count(*) from user_league_favorites f where f.venue_id = v.id) as favorites,
            (select count(*) from venue_teams vt where vt.venue_id = v.id) as teams
       from venues v where v.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function resolve(name, city) {
  const { rows } = await db.query(
    `select id from venues where name = $1 and coalesce(city,'') = $2`,
    [name, city]
  );
  if (rows.length === 0) throw new Error(`no venue "${name}" in "${city}"`);
  if (rows.length > 1) throw new Error(`ambiguous: ${rows.length} rows for "${name}" in "${city}"`);
  return rows[0].id;
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;

try {
  await db.query('begin');

  for (const m of MERGES) {
    const canonId = await resolve(m.canon, m.city);
    console.log(`\n==================================================`);
    console.log(`CANONICAL: ${m.canon} [${m.city}]`);
    const cd = await venueDetail(canonId);
    console.log(
      `  ${cd.name}  id=${cd.id}  coords=${cd.lat ?? '—'},${cd.lng ?? '—'}  ` +
        `events=${cd.events} logs=${cd.logs} visits=${cd.visits} lists=${cd.list_items} favs=${cd.favorites} teams=${cd.teams}`
    );

    for (const dupName of m.dups) {
      const dupId = await resolve(dupName, m.city);
      const dd = await venueDetail(dupId);
      console.log(
        `  <= ${dd.name}  id=${dd.id}  coords=${dd.lat ?? '—'},${dd.lng ?? '—'}  ` +
          `events=${dd.events} logs=${dd.logs} visits=${dd.visits} lists=${dd.list_items} favs=${dd.favorites} teams=${dd.teams}`
      );

      // keep the dup's name searchable on the canonical row
      await db.query(
        `insert into venue_aliases (venue_id, alias_name) values ($1, $2)
         on conflict do nothing`,
        [canonId, dd.name]
      );

      // canonical inherits coords/photo if it's missing them
      await db.query(
        `update venues c set
           location = coalesce(c.location, d.location),
           photo_url = coalesce(nullif(c.photo_url,''), d.photo_url)
         from venues d where c.id = $1 and d.id = $2`,
        [canonId, dupId]
      );

      for (const { table, col } of REPOINT) {
        const keys = await conflictKeys(table, col);
        if (keys && keys.length) {
          // drop dup rows that would collide with an existing canonical row
          const on = keys.map((k) => `c.${k} = d.${k}`).join(' and ');
          const del = await db.query(
            `delete from ${table} d
              where d.${col} = $1
                and exists (select 1 from ${table} c where c.${col} = $2 and ${on})`,
            [dupId, canonId]
          );
          if (del.rowCount) console.log(`     ${table}: dropped ${del.rowCount} colliding row(s)`);
        }
        const upd = await db.query(
          `update ${table} set ${col} = $1 where ${col} = $2`,
          [canonId, dupId]
        );
        if (upd.rowCount) console.log(`     ${table}: moved ${upd.rowCount} row(s)`);
      }

      await db.query(`delete from venues where id = $1`, [dupId]);
      console.log(`     deleted duplicate venue ${dd.name}`);
    }
  }

  if (APPLY) {
    await db.query('commit');
    console.log('\nCOMMITTED.');
  } else {
    await db.query('rollback');
    console.log('\n[DRY RUN] rolled back — no changes written. Re-run with --apply to commit.');
  }
} catch (err) {
  await db.query('rollback').catch(() => {});
  console.error('Error:', err.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
