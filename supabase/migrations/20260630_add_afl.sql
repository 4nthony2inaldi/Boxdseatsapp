-- Add the Australian Football League (AFL) as a loggable league.
--
-- AFL is a new sport for us, so it needs a sport_type enum value first (same
-- pattern as the mma/horse_racing addition). NOTE: `alter type ... add value`
-- cannot run inside a transaction block and the new value cannot be used until
-- it's committed — so this file must be applied with psql in autocommit mode
-- (no BEGIN/COMMIT wrapper, no --single-transaction): statement 1 commits the
-- enum value, then statement 2 can reference it.
alter type sport_type add value if not exists 'australian_football';

-- Teams/venues/events are seeded separately via seed-real-data.mjs (standard
-- ESPN team-sport path: australian-football/afl). Kept fresh going forward by
-- /api/sync-events. Box scores ingest through the existing team box-score path
-- (the AFL summary's boxscore.players shape matches the other team sports).
insert into leagues (name, slug, sport, event_template, country, is_active, display_order) values
  ('Australian Football League', 'afl', 'australian_football', 'match', 'AU', true, 47)
on conflict (slug) do nothing;
