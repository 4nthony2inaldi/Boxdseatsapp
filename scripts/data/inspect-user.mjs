#!/usr/bin/env node
/**
 * inspect-user.mjs — read-only ingest diagnostics for one user. Prints each of
 * their logged events (sport, league, has-ESPN-id, athletes ingested) plus the
 * global un-ingested candidate pool and ingest heartbeats, to debug why box
 * scores aren't filling. No writes.
 *
 * Usage:  DATABASE_URL=... INSPECT_USER=<username> node scripts/data/inspect-user.mjs
 */
import pg from "pg";
const { Client } = pg;
const user = process.env.INSPECT_USER;
if (!process.env.DATABASE_URL || !user) { console.error("DATABASE_URL and INSPECT_USER required."); process.exit(2); }
const db = new Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const q = async (sql, p = []) => (await db.query(sql, p)).rows;

const prof = await q(`select id, username, display_name from profiles where lower(username) = lower($1)`, [user]);
if (!prof.length) { console.log("STATS_START"); console.log(JSON.stringify({ error: `no user ${user}` })); console.log("STATS_END"); await db.end(); process.exit(0); }
const uid = prof[0].id;

const events = await q(
  `select e.external_ids->>'espn' as espn, l.sport::text as sport, l.slug,
          e.event_date::text as date,
          (select count(*) from event_athletes ea where ea.event_id = el.event_id)::int as ath,
          (el.event_id is null) as manual
     from event_logs el
     left join events e on e.id = el.event_id
     left join leagues l on l.id = e.league_id
    where el.user_id = $1
    order by e.event_date desc nulls last`,
  [uid]
);

const bySport = {};
let haveEspn = 0, ingested = 0, manual = 0, noEspn = 0;
for (const e of events) {
  if (e.manual) { manual++; continue; }
  bySport[e.sport || "?"] = (bySport[e.sport || "?"] || 0) + 1;
  if (e.espn) haveEspn++; else noEspn++;
  if (e.ath > 0) ingested++;
}
// sample: soccer/international events with espn ids (to test ESPN directly)
const soccerSample = events.filter((e) => e.sport === "soccer" && e.espn).slice(0, 6)
  .map((e) => ({ slug: e.slug, espn: e.espn, date: e.date, ath: e.ath }));

const [{ logged }] = await q(`select count(*)::int as logged from (select distinct event_id from event_logs where event_id is not null) t`);
const [{ ing }] = await q(`select count(distinct ea.event_id)::int as ing from event_athletes ea where ea.event_id in (select event_id from event_logs where event_id is not null)`);
const heartbeats = await q(`select job, last_run_at, last_success_at, last_status, now() as server_now from ingest_heartbeats order by job`);

await db.end();
console.log("STATS_START");
console.log(JSON.stringify({
  user: prof[0].username, total_logs: events.length, manual, haveEspn, noEspn, ingested,
  bySport, soccerSample,
  globalPool: { loggedDistinct: logged, ingestedDistinct: ing, candidates: logged - ing },
  heartbeats,
}));
console.log("STATS_END");
