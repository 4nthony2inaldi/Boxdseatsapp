#!/usr/bin/env node
/**
 * fix-venue-country.mjs — repair venues whose `country` is inconsistent with a
 * known US state. A cross-sport ESPN venue-id collision (e.g. an AFL ground
 * sharing an id with a US venue) clobbered `country` to a foreign code while
 * leaving the US city/state/coords intact, which trips the "Multiple Countries"
 * badge for anyone who logged a game there (Comerica Park read as AU).
 *
 * Scope is deliberately tight: only rows whose `state` is a valid US state /
 * territory code AND whose `country` is set to something other than 'US'. That
 * is an unambiguous data error (a venue in Michigan is in the US), so it's safe
 * to assert country = 'US'. Coordinates and every other field are left alone.
 *
 * Dry-run by default (DRY_RUN!="false") — wraps the UPDATE in a rolled-back
 * transaction and prints what it WOULD change. Set DRY_RUN=false to commit.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/data/fix-venue-country.mjs            # dry-run
 *   DATABASE_URL=... DRY_RUN=false node scripts/data/fix-venue-country.mjs
 */
import pg from "pg";
const { Client } = pg;
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL required.");
  process.exit(2);
}
const dryRun = process.env.DRY_RUN !== "false";
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;

// US states + DC + the territories ESPN uses in addresses.
const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC","PR","GU","VI","AS","MP",
];

console.log("STATS_START");
console.log(`mode: ${dryRun ? "DRY RUN (no writes)" : "APPLY (committing)"}`);

const offenders = await q(
  `select v.id, v.name, v.city, v.state, v.country,
          (select count(*) from events e where e.venue_id = v.id)::int as events
     from venues v
    where v.state = any($1)
      and coalesce(v.country, '') <> 'US'
    order by events desc`,
  [US_STATES]
);
console.log(`found ${offenders.length} US-state venues with a non-US country:`);
console.log(JSON.stringify(offenders, null, 2));

if (offenders.length > 0) {
  await db.query("BEGIN");
  const ids = offenders.map((o) => o.id);
  const res = await db.query(
    `update venues set country = 'US' where id = any($1)`,
    [ids]
  );
  console.log(`${dryRun ? "would update" : "updated"} ${res.rowCount} rows`);
  if (dryRun) await db.query("ROLLBACK");
  else await db.query("COMMIT");
}

console.log("STATS_END");
await db.end();
