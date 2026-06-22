-- event_athletes performance index + duplicate guard.
--
-- 1) Index on event_id. event_athletes is the largest table (grows with every
--    synced game across all leagues) and the passport's hottest join filters it
--    by event_id (and the compare page pays that cost twice). There was no
--    index on event_id, so each lookup forced a sequential scan. This is the
--    single biggest query-cost win in the app audit.
--
-- 2) UNIQUE(event_id, athlete_id). Box-score ingest is read-then-write
--    (ingestEventBoxScore checks count==0, then inserts), so two concurrent
--    triggers for the same just-finalized game could both insert and produce
--    duplicate athlete rows that double-count in passport players/leaderboards.
--    A rigorous check found ZERO existing duplicates (14,687 rows, all unique
--    (event_id, athlete_id)), so this applies cleanly today. With the
--    constraint in place the existing chunked insert stays safe: a racing
--    second writer's insert simply fails on conflict (one writer wins, the
--    other no-ops) instead of duplicating — no ingest code change required.
--
-- 3) Index on event_rosters(event_id) for the same join pattern (table is empty
--    today; index is future-proofing for roster features).
--
-- DDL — cannot be applied via the PostgREST/service-role path the data scripts
-- use; apply via the Supabase SQL editor / CLI. In production prefer the
-- CONCURRENTLY forms (which cannot run inside a transaction block):
--
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_athletes_event
--     ON event_athletes (event_id);
--   CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS event_athletes_event_athlete_unique
--     ON event_athletes (event_id, athlete_id);
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_rosters_event
--     ON event_rosters (event_id);

CREATE INDEX IF NOT EXISTS idx_event_athletes_event
  ON event_athletes (event_id);

CREATE UNIQUE INDEX IF NOT EXISTS event_athletes_event_athlete_unique
  ON event_athletes (event_id, athlete_id);

CREATE INDEX IF NOT EXISTS idx_event_rosters_event
  ON event_rosters (event_id);
