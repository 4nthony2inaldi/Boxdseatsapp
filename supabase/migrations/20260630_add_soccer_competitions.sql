-- Broaden soccer coverage to the competitions a club actually plays across a
-- season, plus more domestic leagues and the major international tournaments.
-- The gap this closes: we only carried each country's top domestic league, so a
-- fan who attended (say) a Champions League or FA Cup night at a stadium we
-- already know had no event to log or match a photo against, because that game
-- lives in a different competition than the Premier League.
--
-- Teams/venues/events are seeded separately via seed-real-data.mjs. These all
-- reuse the clubs and national teams that already exist from the domestic
-- leagues and prior tournaments (sharedTeams in the seeder; the cross-league
-- soccer team map in /api/sync-events), so adding the Champions League does not
-- duplicate Arsenal — it attaches the new fixtures to the existing club row.
-- All are also wired into /api/sync-events to stay fresh going forward.
INSERT INTO leagues (name, slug, sport, event_template, country, is_active, display_order) VALUES
  -- UEFA club + nations competitions
  ('UEFA Champions League', 'uefa.champions',   'soccer', 'match', 'World', true, 27),
  ('UEFA Europa League',    'uefa.europa',       'soccer', 'match', 'World', true, 28),
  ('UEFA Conference League','uefa.europa.conf',  'soccer', 'match', 'World', true, 29),
  ('UEFA Nations League',   'uefa.nations',      'soccer', 'match', 'World', true, 30),
  -- Domestic cups
  ('FA Cup',                'eng.fa',            'soccer', 'match', 'GB',    true, 31),
  ('EFL Cup',               'eng.league_cup',    'soccer', 'match', 'GB',    true, 32),
  ('Copa del Rey',          'esp.copa_del_rey',  'soccer', 'match', 'ES',    true, 33),
  ('Coppa Italia',          'ita.coppa_italia',  'soccer', 'match', 'IT',    true, 34),
  ('DFB-Pokal',             'ger.dfb_pokal',     'soccer', 'match', 'DE',    true, 35),
  ('Coupe de France',       'fra.coupe_de_france','soccer','match', 'FR',    true, 36),
  -- More domestic leagues with stable home grounds
  ('EFL Championship',      'eng.2',             'soccer', 'match', 'GB',    true, 37),
  ('Primeira Liga',         'por.1',             'soccer', 'match', 'PT',    true, 38),
  ('Eredivisie',            'ned.1',             'soccer', 'match', 'NL',    true, 39),
  ('Scottish Premiership',  'sco.1',             'soccer', 'match', 'GB',    true, 40),
  -- North America (alongside MLS + Liga MX)
  ('Leagues Cup',           'concacaf.leagues.cup','soccer','match','World', true, 41),
  ('CONCACAF Champions Cup','concacaf.champions','soccer', 'match', 'World', true, 42),
  -- International + South American tournaments
  ('Copa America',          'conmebol.america',  'soccer', 'match', 'World', true, 43),
  ('CONCACAF Gold Cup',     'concacaf.gold',     'soccer', 'match', 'World', true, 44),
  ('Copa Libertadores',     'conmebol.libertadores','soccer','match','World',true, 45),
  ('FIFA Club World Cup',   'fifa.cwc',          'soccer', 'match', 'World', true, 46)
ON CONFLICT (slug) DO NOTHING;
