-- Guarantee one event row per ESPN id.
--
-- Events are keyed by (league_id, external_ids->>'espn'): team games use the
-- bare ESPN id, field events use "{tournamentId}-d{N}". The key is per-league,
-- NOT global — a Grand Slam like Wimbledon legitimately exists under both the
-- atp (men's) and wta (women's) leagues sharing the same ESPN tournament id, so
-- a global unique index would wrongly reject those.
--
-- Both the Vercel /api/sync-events cron and the GitHub Actions seeders do
-- non-atomic "select by espn id, then insert if missing", so two overlapping
-- runs in the same league could each insert the same event and split a fan's
-- attendance across duplicate rows. There was no DB-level guard. This partial
-- unique index makes the second writer fail safely instead of duplicating, and
-- lets the inserts move to ON CONFLICT DO NOTHING.
--
-- NOTE: apply AFTER de-duplicating any existing rows (a duplicate-cleanup pass
-- was run via the service-role API). If creation fails on duplicate key, run
-- the dedup again first. Use CONCURRENTLY in production to avoid locking the
-- table:
--
--   CREATE UNIQUE INDEX CONCURRENTLY events_league_espn_unique
--     ON events (league_id, (external_ids->>'espn'))
--     WHERE external_ids ? 'espn';
--
-- (CONCURRENTLY can't run in a transaction block; the plain form below is for
-- environments that wrap migrations in a transaction.)
CREATE UNIQUE INDEX IF NOT EXISTS events_league_espn_unique
  ON events (league_id, (external_ids->>'espn'))
  WHERE external_ids ? 'espn';
