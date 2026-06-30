#!/usr/bin/env node
/**
 * fix-afl-venues.mjs — correct the AFL venues' country + coordinates.
 *
 * Why this exists: ESPN's AFL venue records carry no city/country, so the
 * seeder defaulted them to city='Unknown', country='US'. The geocoder then
 * tried "<venue>, Unknown, USA", failed, and fell back to a coarse
 * "Unknown, USA" query that Nominatim resolved to a single junk point in
 * Washington State — so all 15 AFL venues ended up at the same wrong US
 * location. (The geocoder guard added alongside this stops that recurring.)
 *
 * AFL plays at a small, well-known set of grounds, so the reliable fix is a
 * curated name -> {lat, lng, city, state} map rather than re-geocoding. This
 * script matches each AFL venue to the map by normalized name and writes the
 * correct country ('AU'), city/state, and PostGIS location.
 *
 * Run with --dry-run first: it rolls back all writes and prints every AFL
 * venue with its current coords and whether the curated map covers it, plus
 * any curated entry that matched no venue. That report is how you confirm the
 * map is complete before writing. Idempotent and safe to re-run.
 *
 * Usage:  node scripts/data/fix-afl-venues.mjs [--dry-run]
 * Env:    DATABASE_URL  (direct Postgres)
 */

import pg from 'pg';
const { Client } = pg;

const DRY = process.argv.includes('--dry-run');

const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

// Curated AFL grounds. Keys are matched against normalized venue names; each
// entry may list alias names ESPN/our DB might use. Coordinates are the ground
// centroid (decimal degrees, Southern Hemisphere => negative lat). state is the
// Australian state/territory abbreviation; country is always AU.
const GROUNDS = [
  { names: ['melbourne cricket ground', 'mcg'], city: 'Melbourne', state: 'VIC', lat: -37.82, lng: 144.9834 },
  { names: ['marvel stadium', 'docklands stadium', 'etihad stadium', 'telstra dome'], city: 'Melbourne', state: 'VIC', lat: -37.8164, lng: 144.9475 },
  { names: ['adelaide oval'], city: 'Adelaide', state: 'SA', lat: -34.9156, lng: 138.5961 },
  { names: ['optus stadium', 'perth stadium'], city: 'Perth', state: 'WA', lat: -31.9505, lng: 115.889 },
  { names: ['the gabba', 'gabba', 'brisbane cricket ground'], city: 'Brisbane', state: 'QLD', lat: -27.4858, lng: 153.0381 },
  { names: ['sydney cricket ground', 'scg'], city: 'Sydney', state: 'NSW', lat: -33.8915, lng: 151.2249 },
  { names: ['gmhba stadium', 'kardinia park', 'simonds stadium', 'skilled stadium'], city: 'Geelong', state: 'VIC', lat: -38.158, lng: 144.3545 },
  { names: ['engie stadium', 'giants stadium', 'sydney showground stadium', 'spotless stadium', 'showground stadium'], city: 'Sydney', state: 'NSW', lat: -33.8434, lng: 151.0668 },
  { names: ['manuka oval', 'corroboree group oval manuka'], city: 'Canberra', state: 'ACT', lat: -35.3186, lng: 149.1349 },
  { names: ['tio stadium', 'marrara oval', 'marrara'], city: 'Darwin', state: 'NT', lat: -12.399, lng: 130.8869 },
  { names: ['utas stadium', 'york park', 'aurora stadium', 'university of tasmania stadium', 'ninja stadium'], city: 'Launceston', state: 'TAS', lat: -41.4261, lng: 147.1387 },
  { names: ['blundstone arena', 'bellerive oval'], city: 'Hobart', state: 'TAS', lat: -42.8772, lng: 147.3735 },
  { names: ['people first stadium', 'heritage bank stadium', 'metricon stadium', 'carrara stadium', 'carrara'], city: 'Gold Coast', state: 'QLD', lat: -28.0064, lng: 153.3669 },
  { names: ['mars stadium', 'eureka stadium'], city: 'Ballarat', state: 'VIC', lat: -37.5448, lng: 143.8479 },
  { names: ['norwood oval', 'coopers stadium'], city: 'Adelaide', state: 'SA', lat: -34.9188, lng: 138.6314 },
  { names: ['traeger park', 'tio traeger park'], city: 'Alice Springs', state: 'NT', lat: -23.7012, lng: 133.8746 },
  { names: ['cazalys stadium', 'cazaly s stadium'], city: 'Cairns', state: 'QLD', lat: -16.9358, lng: 145.7486 },
  { names: ['queensland country bank stadium', 'riverway stadium'], city: 'Townsville', state: 'QLD', lat: -19.279, lng: 146.8003 },
  { names: ['jiangwan stadium', 'adelaide arena at jiangwan stadium'], city: 'Shanghai', state: null, lat: 31.305, lng: 121.507 },
  // Community / pre-season grounds seen in the AFL backfill.
  { names: ['arden street oval'], city: 'Melbourne', state: 'VIC', lat: -37.7999, lng: 144.9419 },
  { names: ['henson park'], city: 'Sydney', state: 'NSW', lat: -33.9063, lng: 151.153 },
  { names: ['hands oval'], city: 'Bunbury', state: 'WA', lat: -33.3358, lng: 115.642 },
  { names: ['rushton park'], city: 'Mandurah', state: 'WA', lat: -32.5295, lng: 115.729 },
  { names: ['flinders university stadium', 'flinders university'], city: 'Adelaide', state: 'SA', lat: -35.0277, lng: 138.572 },
  // Additional known AFL/AFLW grounds surfaced by the repair (well-known venues;
  // obscure one-off country reserves are intentionally left uncoordinated).
  { names: ['accor stadium', 'stadium australia', 'anz stadium'], city: 'Sydney', state: 'NSW', lat: -33.847, lng: 151.0634 },
  { names: ['ikon park', 'princes park'], city: 'Melbourne', state: 'VIC', lat: -37.7847, lng: 144.9612 },
  { names: ['domain stadium', 'subiaco oval'], city: 'Perth', state: 'WA', lat: -31.9447, lng: 115.8267 },
  { names: ['fremantle oval'], city: 'Fremantle', state: 'WA', lat: -32.0566, lng: 115.7486 },
  { names: ['leederville oval'], city: 'Perth', state: 'WA', lat: -31.93, lng: 115.842 },
  { names: ['hbf arena', 'arena joondalup'], city: 'Joondalup', state: 'WA', lat: -31.7448, lng: 115.7661 },
  { names: ['mineral resources park'], city: 'Perth', state: 'WA', lat: -31.976, lng: 115.908 },
  { names: ['alberton oval'], city: 'Adelaide', state: 'SA', lat: -34.861, lng: 138.521 },
  { names: ['richmond oval', 'punt road oval'], city: 'Melbourne', state: 'VIC', lat: -37.823, lng: 144.987 },
  { names: ['rsea park', 'moorabbin oval'], city: 'Melbourne', state: 'VIC', lat: -37.937, lng: 145.04 },
  { names: ['mission whitten oval', 'whitten oval'], city: 'Melbourne', state: 'VIC', lat: -37.799, lng: 144.889 },
  { names: ['blacktown international sportspark'], city: 'Sydney', state: 'NSW', lat: -33.769, lng: 150.859 },
  { names: ['great barrier reef arena'], city: 'Mackay', state: 'QLD', lat: -21.144, lng: 149.186 },
  { names: ['brighton homes arena'], city: 'Brisbane', state: 'QLD', lat: -27.668, lng: 152.912 },
];

const byName = new Map();
for (const g of GROUNDS) for (const n of g.names) byName.set(normName(n), g);

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
if (DRY) await db.query('begin');

try {
  const { rows: venues } = await db.query(`
    select distinct v.id, v.name, v.city, v.state, v.country,
           extensions.ST_Y(v.location::extensions.geometry) as lat,
           extensions.ST_X(v.location::extensions.geometry) as lng
    from venues v
    join events e on e.venue_id = v.id
    join leagues l on l.id = e.league_id
    where l.slug = 'afl'
    order by v.name
  `);

  console.log(`AFL venues: ${venues.length}\n`);
  const matchedGrounds = new Set();
  let updated = 0;
  const unmatched = [];

  for (const v of venues) {
    const g = byName.get(normName(v.name));
    const cur = v.lat != null ? `${Number(v.lat).toFixed(3)},${Number(v.lng).toFixed(3)}` : 'none';
    if (g) {
      matchedGrounds.add(g);
      console.log(`  MATCH  ${v.name}  [${v.country}/${v.city}] cur=${cur} -> ${g.lat},${g.lng} (${g.city}, ${g.state ?? '-'}, AU)`);
      if (!DRY) {
        await db.query(
          `update venues set country = 'AU', city = $2, state = $3,
             location = extensions.ST_SetSRID(extensions.ST_MakePoint($4, $5), 4326)::extensions.geography
           where id = $1`,
          [v.id, g.city, g.state, g.lng, g.lat]
        );
      }
      updated++;
    } else {
      unmatched.push(v);
      console.log(`  MISS   ${v.name}  [${v.country}/${v.city}] cur=${cur}  <-- no curated entry`);
    }
  }

  const unusedGrounds = GROUNDS.filter((g) => !matchedGrounds.has(g));
  console.log(`\n${DRY ? '[DRY] would update' : 'updated'} ${updated}/${venues.length} venues.`);
  if (unmatched.length) {
    console.log(`\nUNMATCHED AFL venues (no curated coords — still need attention):`);
    for (const v of unmatched) console.log(`  - "${v.name}" (city=${v.city}, country=${v.country})`);
  }
  if (unusedGrounds.length) {
    console.log(`\nCurated entries that matched no venue (harmless; name mismatch or not seeded):`);
    for (const g of unusedGrounds) console.log(`  - ${g.names[0]}`);
  }

  if (DRY) {
    await db.query('rollback');
    console.log('\nDRY RUN — all writes rolled back.');
  }
} catch (err) {
  if (DRY) await db.query('rollback').catch(() => {});
  throw err;
} finally {
  await db.end();
}
