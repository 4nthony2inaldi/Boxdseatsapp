#!/usr/bin/env node
/**
 * milestone-stats.mjs — read-only aggregate stats for marketing / milestones.
 *
 * Prints one JSON blob (between STATS_START / STATS_END markers) with overall
 * totals, a by-sport breakdown, most-logged venues, most-seen athletes, and the
 * per-venue coordinates + log counts used to render a map. No writes.
 *
 * Usage:  DATABASE_URL=... node scripts/data/milestone-stats.mjs
 */
import pg from "pg";
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(2);
}

const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q = async (sql) => (await db.query(sql)).rows;

const [[totals], [cities], bySport, topVenues, topAthletes, [range], mapPoints] = await Promise.all([
  q(`select
       count(*)::int as logs,
       count(distinct user_id)::int as fans,
       count(distinct venue_id)::int as venues,
       count(distinct event_id) filter (where event_id is not null)::int as events
     from event_logs`),
  q(`select count(distinct v.city)::int as cities
       from event_logs el join venues v on v.id = el.venue_id where v.city is not null`),
  q(`select sport, count(*)::int as c from event_logs where sport is not null group by sport order by c desc`),
  q(`select v.name, v.city, count(*)::int as c
       from event_logs el join venues v on v.id = el.venue_id
      group by v.id, v.name, v.city order by c desc limit 12`),
  q(`select a.name, a.sport::text as sport, count(*)::int as c
       from event_logs el
       join event_athletes ea on ea.event_id = el.event_id
       join athletes a on a.id = ea.athlete_id
      group by a.id, a.name, a.sport order by c desc limit 12`),
  q(`select min(created_at)::date as first_log, max(created_at)::date as last_log from event_logs`),
  q(`select count(*)::int as c,
            round(extensions.ST_Y(v.location::extensions.geometry)::numeric, 4) as lat,
            round(extensions.ST_X(v.location::extensions.geometry)::numeric, 4) as lng
       from event_logs el join venues v on v.id = el.venue_id
      where v.location is not null
      group by v.location order by c desc`),
]);
await db.end();

const out = {
  totals: { ...totals, cities: cities.cities },
  range,
  bySport,
  topVenues,
  topAthletes,
  mapPoints: mapPoints.map((p) => ({ c: p.c, lat: Number(p.lat), lng: Number(p.lng) })),
};

console.log("STATS_START");
console.log(JSON.stringify(out));
console.log("STATS_END");
