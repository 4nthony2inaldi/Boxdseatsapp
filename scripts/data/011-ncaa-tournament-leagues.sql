-- College "Big Events": NCAA basketball tournaments (March Madness).
-- Tournament games only — seeded via seed-real-data.mjs with postseasonOnly.
INSERT INTO leagues (name, slug, sport, event_template, country, is_active, display_order) VALUES
  ('NCAA Men''s Basketball', 'ncaam', 'basketball', 'match', 'US', true, 30),
  ('NCAA Women''s Basketball', 'ncaaw', 'basketball', 'match', 'US', true, 31)
ON CONFLICT (slug) DO NOTHING;
