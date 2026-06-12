-- International soccer: top-5 European domestic leagues.
-- APPLIED TO PROD + STAGING. Teams/venues/events seeded via seed-real-data.mjs
-- (soccer model already proven by MLS). Promotion/relegation handled by the
-- seeder's lazy team creation from event data.
INSERT INTO leagues (name, slug, sport, event_template, country, is_active, display_order) VALUES
  ('Premier League', 'eng.1', 'soccer', 'match', 'GB', true, 20),
  ('La Liga', 'esp.1', 'soccer', 'match', 'ES', true, 21),
  ('Bundesliga', 'ger.1', 'soccer', 'match', 'DE', true, 22),
  ('Serie A', 'ita.1', 'soccer', 'match', 'IT', true, 23),
  ('Ligue 1', 'fra.1', 'soccer', 'match', 'FR', true, 24)
ON CONFLICT (slug) DO NOTHING;
