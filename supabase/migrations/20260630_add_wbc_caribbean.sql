-- Add two ESPN-backed international baseball tournaments as loggable leagues:
-- the World Baseball Classic (wbc) and the Caribbean Series (caribbean-series).
--
-- Baseball already exists as a sport_type, so no enum change is needed (unlike
-- the AFL addition). Both are international tournaments of national/invitee
-- teams with no single host country, so `country` is NULL.
--
-- Teams/venues/events are seeded separately via seed-real-data.mjs (standard
-- ESPN scoreboard path: baseball/world-baseball-classic and
-- baseball/caribbean-series, with lazyTeams for the national/invitee sides).
-- Kept fresh going forward by /api/sync-events. Box scores ingest through the
-- existing team box-score path.
insert into leagues (name, slug, sport, event_template, country, is_active, display_order) values
  ('World Baseball Classic', 'wbc', 'baseball', 'match', null, true, 48),
  ('Caribbean Series', 'caribbean-series', 'baseball', 'match', null, true, 49)
on conflict (slug) do nothing;
