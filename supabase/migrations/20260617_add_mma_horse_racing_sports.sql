-- Add MMA (UFC) and horse racing as sport types.
-- These power new leagues whose loggable unit is the day/card/race itself
-- (event_template 'field'), e.g. "UFC 300" or "Kentucky Derby".
--
-- Note: ALTER TYPE ... ADD VALUE cannot run inside a transaction block and the
-- new value can't be used until committed, so these run as standalone
-- statements (idempotent via IF NOT EXISTS).

alter type sport_type add value if not exists 'horse_racing';
alter type sport_type add value if not exists 'mma';
