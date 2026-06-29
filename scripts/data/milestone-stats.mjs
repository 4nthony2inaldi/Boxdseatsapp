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

const [[totals], [cities], bySport, topVenues, topAthletes, perSport, intl, [range], mapPoints, visitedPoints] = await Promise.all([
  q(`select
       count(*)::int as logs,
       count(distinct user_id)::int as fans,
       count(distinct venue_id)::int as venues,
       count(distinct event_id) filter (where event_id is not null)::int as events
     from event_logs`),
  q(`select count(distinct v.city)::int as cities
       from event_logs el join venues v on v.id = el.venue_id where v.city is not null`),
  q(`select sport, count(*)::int as c from event_logs where sport is not null group by sport order by c desc`),
  q(`select v.name, v.city, v.photo_url, count(*)::int as c
       from event_logs el join venues v on v.id = el.venue_id
      group by v.id, v.name, v.city, v.photo_url order by c desc limit 12`),
  q(`select a.name, a.sport::text as sport, a.headshot_url, count(*)::int as c
       from event_logs el
       join event_athletes ea on ea.event_id = el.event_id
       join athletes a on a.id = ea.athlete_id
      group by a.id, a.name, a.sport, a.headshot_url order by c desc limit 12`),
  // Most-seen athlete per sport (one each), to show range beyond baseball.
  q(`select sport, name, headshot_url, c from (
       select a.sport::text as sport, a.name, a.headshot_url, count(*)::int as c,
              row_number() over (partition by a.sport order by count(*) desc) as rn
         from event_logs el
         join event_athletes ea on ea.event_id = el.event_id
         join athletes a on a.id = ea.athlete_id
        where a.sport is not null
        group by a.id, a.sport, a.name, a.headshot_url
     ) t where rn = 1 order by c desc`),
  // Venues logged outside the US.
  q(`select v.name, v.city, v.country, count(*)::int as c
       from event_logs el join venues v on v.id = el.venue_id
      where v.country is not null and v.country <> 'US'
      group by v.id, v.name, v.city, v.country order by c desc`),
  q(`select min(created_at)::date as first_log, max(created_at)::date as last_log from event_logs`),
  q(`select count(*)::int as c,
            round(extensions.ST_Y(v.location::extensions.geometry)::numeric, 4) as lat,
            round(extensions.ST_X(v.location::extensions.geometry)::numeric, 4) as lng
       from event_logs el join venues v on v.id = el.venue_id
      where v.location is not null
      group by v.location order by c desc`),
  // Every venue marked "visited" (any user), with its total logged-game count
  // (0 = visited but never logged, e.g. a circuit you went to without a game log).
  q(`select round(extensions.ST_Y(v.location::extensions.geometry)::numeric, 4) as lat,
            round(extensions.ST_X(v.location::extensions.geometry)::numeric, 4) as lng,
            count(el.id)::int as c
       from venues v
       join venue_visits vv on vv.venue_id = v.id and vv.relationship = 'visited'
       left join event_logs el on el.venue_id = v.id
      where v.location is not null
      group by v.id, v.location`),
]);
await db.end();

const out = {
  totals: { ...totals, cities: cities.cities },
  range,
  bySport,
  topVenues,
  topAthletes,
  perSport,
  intl,
  mapPoints: mapPoints.map((p) => ({ c: p.c, lat: Number(p.lat), lng: Number(p.lng) })),
  visitedPoints: visitedPoints.map((p) => ({ c: p.c, lat: Number(p.lat), lng: Number(p.lng) })),
};

console.log("STATS_START");
console.log(JSON.stringify(out));
console.log("STATS_END");
