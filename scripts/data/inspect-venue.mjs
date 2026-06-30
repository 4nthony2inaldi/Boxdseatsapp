#!/usr/bin/env node
/**
 * inspect-venue.mjs — read-only venue diagnostics. Prints every venue row
 * matching a name pattern (id, name, city, country, coords, ESPN id, event
 * count). Optionally also prints a user's distinct venue-countries and the
 * venues behind each non-primary country, to debug a wrong "Multiple Countries"
 * badge. No writes.
 *
 * Usage:
 *   DATABASE_URL=... VENUE_LIKE=Comerica node scripts/data/inspect-venue.mjs
 *   DATABASE_URL=... VENUE_LIKE=Comerica INSPECT_USER=keith node scripts/data/inspect-venue.mjs
 */
import pg from "pg";
const { Client } = pg;
const like = process.env.VENUE_LIKE;
const user = process.env.INSPECT_USER || null;
if (!process.env.DATABASE_URL || !like) {
  console.error("DATABASE_URL and VENUE_LIKE required.");
  process.exit(2);
}
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;

console.log("STATS_START");

const venues = await q(
  `select v.id, v.name, v.city, v.country, v.latitude, v.longitude,
          v.external_ids->>'espn' as espn,
          (select count(*) from events e where e.venue_id = v.id)::int as events
     from venues v
    where v.name ilike '%' || $1 || '%'
    order by events desc`,
  [like]
);
console.log("VENUES " + JSON.stringify(venues, null, 2));

if (user) {
  const prof = await q(
    `select id, username from profiles where lower(username) = lower($1)`,
    [user]
  );
  if (!prof.length) {
    console.log(`USER none: ${user}`);
  } else {
    const uid = prof[0].id;
    const countries = await q(
      `select coalesce(v.country, '(null)') as country, count(*)::int as n
         from event_logs el
         join events e on e.id = el.event_id
         join venues v on v.id = e.venue_id
        where el.user_id = $1
        group by v.country
        order by n desc`,
      [uid]
    );
    console.log("USER_COUNTRIES " + JSON.stringify(countries, null, 2));

    // The venues behind each country, so a wrong-country venue is obvious.
    const byCountryVenue = await q(
      `select coalesce(v.country, '(null)') as country, v.id, v.name, v.city,
              count(*)::int as n
         from event_logs el
         join events e on e.id = el.event_id
         join venues v on v.id = e.venue_id
        where el.user_id = $1
        group by v.country, v.id, v.name, v.city
        order by country, n desc`,
      [uid]
    );
    console.log("USER_COUNTRY_VENUES " + JSON.stringify(byCountryVenue, null, 2));
  }
}

console.log("STATS_END");
await db.end();
