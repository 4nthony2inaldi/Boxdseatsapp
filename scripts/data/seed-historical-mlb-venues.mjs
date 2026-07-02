#!/usr/bin/env node
/**
 * seed-historical-mlb-venues.mjs — add former MLB ballparks so fans can mark
 * them visited and log historical games (paired with the manual-log calendar's
 * opened_year floor).
 *
 * Why reconciliation-first: our event data starts in 2002, so any park that
 * hosted a pro/college event after ~2002 (Shea, Veterans, Qualcomm, Metrodome,
 * Turner Field, Candlestick via the 49ers, RFK via D.C. United, the Oakland
 * Coliseum, etc.) ALREADY EXISTS as a venue. Blindly inserting the curated list
 * would duplicate those. And several genuinely-new parks sit a block from an
 * active one (Original Yankee Stadium vs the 2009 park, old Comiskey vs Rate
 * Field, Busch II vs III) — a coordinate-only match would wrongly merge them.
 *
 * So each curated park is matched against existing venues by NAME/ALIAS plus
 * location/city, and:
 *   - EXISTING  -> insert nothing; only backfill opened_year when it's null
 *                  (never touch name/status/closed_year, so active multi-sport
 *                  venues like the Coliseum are left alone).
 *   - NEW       -> insert the venue (status/opened_year/closed_year/location/
 *                  capacity), its historical-name aliases, and a venue_teams
 *                  link to the current franchise (is_primary, season-bounded).
 *                  Because fetchTeamVenues filters to status='active', a NEW
 *                  retired/demolished venue shows the team on its own page but
 *                  never appears as the team's current home.
 * A NEW park sitting within 200m of a different-named venue is flagged
 * ADJACENT in the report (the old/new rebuild pairs) so it can be eyeballed;
 * it is still inserted as its own row (correct — different building).
 *
 * Idempotent: re-running re-classifies inserted parks as EXISTING and skips
 * them. Runs in a transaction; --dry-run rolls back and prints the full plan.
 *
 * Usage:  node scripts/data/seed-historical-mlb-venues.mjs [--dry-run]
 * Env:    DATABASE_URL  (direct Postgres)
 */

import fs from 'node:fs';
import pg from 'pg';
const { Client } = pg;

const DRY = process.argv.includes('--dry-run');

const PARKS = JSON.parse(
  fs.readFileSync(new URL('./historical-mlb-venues.json', import.meta.url), 'utf8')
);

const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Haversine distance in meters between two lat/lng points.
function distM(aLat, aLng, bLat, bLng) {
  if (aLat == null || bLat == null) return Infinity;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
await db.query('begin');

try {
  // Current MLB franchises, for the venue_teams link on new inserts.
  const { rows: teams } = await db.query(`
    select t.id, t.short_name, t.name, t.city
    from teams t join leagues l on l.id = t.league_id
    where l.slug = 'mlb'
  `);
  const teamByShort = new Map();
  for (const t of teams) teamByShort.set(normName(t.short_name), t);

  // All venues (with lat/lng) + their aliases, for name/proximity matching.
  const { rows: venues } = await db.query(`
    select v.id, v.name, v.city, v.state, v.status, v.opened_year, v.closed_year,
           extensions.ST_Y(v.location::extensions.geometry) as lat,
           extensions.ST_X(v.location::extensions.geometry) as lng
    from venues v
  `);
  const { rows: aliasRows } = await db.query(
    `select venue_id, alias_name from venue_aliases`
  );
  const aliasesByVenue = new Map();
  for (const a of aliasRows) {
    if (!aliasesByVenue.has(a.venue_id)) aliasesByVenue.set(a.venue_id, []);
    aliasesByVenue.get(a.venue_id).push(a.alias_name);
  }

  // Index venues by every normalized name they're known by (canonical + aliases).
  const venuesByName = new Map();
  for (const v of venues) {
    const names = [v.name, ...(aliasesByVenue.get(v.id) || [])];
    for (const n of names) {
      const k = normName(n);
      if (!venuesByName.has(k)) venuesByName.set(k, []);
      venuesByName.get(k).push(v);
    }
  }

  let toInsert = 0;
  let toBackfill = 0;
  let existingOk = 0;
  const unresolvedFranchise = [];
  const adjacencyFlags = [];

  for (const p of PARKS) {
    const nameKeys = [p.canonical_name, ...(p.aliases || [])].map(normName);
    // Candidate existing venues that share a name/alias.
    const candidates = [];
    const seen = new Set();
    for (const k of nameKeys) {
      for (const v of venuesByName.get(k) || []) {
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        candidates.push(v);
      }
    }
    // A name candidate only counts as the same venue if it's also near the
    // park (<5km) or in the same city — guards against same-named venues
    // elsewhere ("Memorial Stadium", "Municipal Stadium", ...).
    const match = candidates.find((v) => {
      const near = distM(p.lat, p.lng, v.lat, v.lng) < 5000;
      const sameCity = normName(v.city) === normName(p.city);
      return near || sameCity;
    });

    // Nearest venue by pure distance, for adjacency evidence (old/new pairs).
    let nearest = null;
    for (const v of venues) {
      const d = distM(p.lat, p.lng, v.lat, v.lng);
      if (nearest == null || d < nearest.d) nearest = { v, d };
    }

    if (match) {
      const needsYear = match.opened_year == null;
      console.log(
        `  EXISTING  ${p.canonical_name}  ->  "${match.name}" [${match.city}] ` +
          `status=${match.status} opened_year=${match.opened_year ?? 'null'}` +
          (needsYear ? `  => backfill opened_year=${p.opened_year}` : '  (ok)')
      );
      if (needsYear) {
        toBackfill++;
        if (!DRY) {
          await db.query(`update venues set opened_year = $2, updated_at = now() where id = $1`, [
            match.id,
            p.opened_year,
          ]);
        }
      } else {
        existingOk++;
      }
      continue;
    }

    // NEW — insert. Flag if it sits right on top of a different-named venue.
    if (nearest && nearest.d < 200) {
      adjacencyFlags.push(
        `${p.canonical_name} is ${Math.round(nearest.d)}m from existing "${nearest.v.name}" ` +
          `(different name — treated as a separate building)`
      );
    }
    const team = teamByShort.get(normName(p.franchise_short_name)) || null;
    if (!team) unresolvedFranchise.push(`${p.canonical_name} -> ${p.franchise_short_name}`);

    console.log(
      `  NEW       ${p.canonical_name}  [${p.city}, ${p.state}] ${p.status} ` +
        `${p.opened_year}-${p.closed_year}  team=${team ? team.short_name : 'UNRESOLVED'}` +
        (nearest && nearest.d < 200 ? `  (~${Math.round(nearest.d)}m from "${nearest.v.name}")` : '')
    );
    toInsert++;

    if (!DRY) {
      const { rows } = await db.query(
        `insert into venues (name, city, state, country, status, opened_year, closed_year, capacity, location)
         values ($1,$2,$3,$4,$5,$6,$7,$8,
                 extensions.ST_SetSRID(extensions.ST_MakePoint($9,$10),4326)::extensions.geography)
         returning id`,
        [
          p.canonical_name,
          p.city,
          p.state,
          p.country,
          p.status,
          p.opened_year,
          p.closed_year,
          p.capacity,
          p.lng,
          p.lat,
        ]
      );
      const venueId = rows[0].id;
      for (const alias of p.aliases || []) {
        await db.query(
          `insert into venue_aliases (venue_id, alias_name) values ($1, $2)`,
          [venueId, alias]
        );
      }
      if (team) {
        await db.query(
          `insert into venue_teams (venue_id, team_id, is_primary, season_start, season_end)
           values ($1, $2, true, $3, $4)`,
          [venueId, team.id, p.opened_year, p.closed_year]
        );
      }
    }
  }

  console.log(
    `\n${DRY ? '[DRY] would insert' : 'inserted'} ${toInsert} new venue(s); ` +
      `${DRY ? 'would backfill' : 'backfilled'} opened_year on ${toBackfill} existing; ` +
      `${existingOk} existing already complete.`
  );
  if (adjacencyFlags.length) {
    console.log(`\nADJACENCY (review — near an existing venue, kept separate):`);
    for (const f of adjacencyFlags) console.log(`  - ${f}`);
  }
  if (unresolvedFranchise.length) {
    console.log(`\nUNRESOLVED FRANCHISE (venue inserted without a team link):`);
    for (const f of unresolvedFranchise) console.log(`  - ${f}`);
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
