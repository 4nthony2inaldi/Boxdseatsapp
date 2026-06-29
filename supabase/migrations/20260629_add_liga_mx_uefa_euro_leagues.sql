-- Add Liga MX (Mexican top flight) and the UEFA European Championship as
-- loggable leagues, bringing soccer coverage closer to parity with the existing
-- domestic leagues and the FIFA World Cup.
--
-- Teams/venues/events are seeded separately via seed-real-data.mjs (the proven
-- soccer model). mex.1 is a standard domestic league; uefa.euro is an
-- international tournament whose national teams are created lazily from match
-- data. Both are also wired into /api/sync-events so scores/new events stay
-- fresh going forward.
INSERT INTO leagues (name, slug, sport, event_template, country, is_active, display_order) VALUES
  ('Liga MX', 'mex.1', 'soccer', 'match', 'MX', true, 25),
  ('UEFA Euros', 'uefa.euro', 'soccer', 'match', 'World', true, 26)
ON CONFLICT (slug) DO NOTHING;
