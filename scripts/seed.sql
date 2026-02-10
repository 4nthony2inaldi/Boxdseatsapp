-- ═══════════════════════════════════════════════════════════════
-- BOXDSEATS SEED DATA
-- Comprehensive seed for local development
-- Generated February 2026
-- ═══════════════════════════════════════════════════════════════

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- DETERMINISTIC UUID GENERATION
-- We use uuid_generate_v5 with a fixed namespace so all UUIDs
-- are reproducible across seed runs.
-- ═══════════════════════════════════════════════════════════════

-- Namespace UUID for all BoxdSeats seed data
-- Using a fixed v4 UUID as our namespace
DO $$ BEGIN PERFORM set_config('seed.ns', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', false); END $$;

-- Helper: deterministic UUID from a string key
CREATE OR REPLACE FUNCTION seed_uuid(key text)
RETURNS uuid AS $$
  SELECT uuid_generate_v5('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid, key);
$$ LANGUAGE sql IMMUTABLE;

-- ═══════════════════════════════════════════════════════════════
-- 1. LEAGUES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO leagues (id, name, slug, sport, event_template, country, is_active, display_order) VALUES
  (seed_uuid('league-nfl'),  'NFL',      'nfl',      'football',    'match', 'US', true, 1),
  (seed_uuid('league-nba'),  'NBA',      'nba',      'basketball',  'match', 'US', true, 2),
  (seed_uuid('league-mlb'),  'MLB',      'mlb',      'baseball',    'match', 'US', true, 3),
  (seed_uuid('league-nhl'),  'NHL',      'nhl',      'hockey',      'match', 'US', true, 4),
  (seed_uuid('league-mls'),  'MLS',      'mls',      'soccer',      'match', 'US', true, 5),
  (seed_uuid('league-pga'),  'PGA Tour', 'pga-tour', 'golf',        'field', 'US', true, 6)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2. TEAMS
-- ═══════════════════════════════════════════════════════════════

-- ─── NFL (32 teams) ───
INSERT INTO teams (id, league_id, name, short_name, abbreviation, city) VALUES
  -- AFC East
  (seed_uuid('team-buf'), seed_uuid('league-nfl'), 'Buffalo Bills', 'Bills', 'BUF', 'Buffalo'),
  (seed_uuid('team-mia'), seed_uuid('league-nfl'), 'Miami Dolphins', 'Dolphins', 'MIA', 'Miami'),
  (seed_uuid('team-nep'), seed_uuid('league-nfl'), 'New England Patriots', 'Patriots', 'NE', 'Foxborough'),
  (seed_uuid('team-nyj'), seed_uuid('league-nfl'), 'New York Jets', 'Jets', 'NYJ', 'New York'),
  -- AFC North
  (seed_uuid('team-bal'), seed_uuid('league-nfl'), 'Baltimore Ravens', 'Ravens', 'BAL', 'Baltimore'),
  (seed_uuid('team-cin'), seed_uuid('league-nfl'), 'Cincinnati Bengals', 'Bengals', 'CIN', 'Cincinnati'),
  (seed_uuid('team-cle'), seed_uuid('league-nfl'), 'Cleveland Browns', 'Browns', 'CLE', 'Cleveland'),
  (seed_uuid('team-pit'), seed_uuid('league-nfl'), 'Pittsburgh Steelers', 'Steelers', 'PIT', 'Pittsburgh'),
  -- AFC South
  (seed_uuid('team-hou'), seed_uuid('league-nfl'), 'Houston Texans', 'Texans', 'HOU', 'Houston'),
  (seed_uuid('team-ind'), seed_uuid('league-nfl'), 'Indianapolis Colts', 'Colts', 'IND', 'Indianapolis'),
  (seed_uuid('team-jax'), seed_uuid('league-nfl'), 'Jacksonville Jaguars', 'Jaguars', 'JAX', 'Jacksonville'),
  (seed_uuid('team-ten'), seed_uuid('league-nfl'), 'Tennessee Titans', 'Titans', 'TEN', 'Nashville'),
  -- AFC West
  (seed_uuid('team-den'), seed_uuid('league-nfl'), 'Denver Broncos', 'Broncos', 'DEN', 'Denver'),
  (seed_uuid('team-kc'),  seed_uuid('league-nfl'), 'Kansas City Chiefs', 'Chiefs', 'KC', 'Kansas City'),
  (seed_uuid('team-lv'),  seed_uuid('league-nfl'), 'Las Vegas Raiders', 'Raiders', 'LV', 'Las Vegas'),
  (seed_uuid('team-lac'), seed_uuid('league-nfl'), 'Los Angeles Chargers', 'Chargers', 'LAC', 'Los Angeles'),
  -- NFC East
  (seed_uuid('team-dal'), seed_uuid('league-nfl'), 'Dallas Cowboys', 'Cowboys', 'DAL', 'Dallas'),
  (seed_uuid('team-nyg'), seed_uuid('league-nfl'), 'New York Giants', 'Giants', 'NYG', 'New York'),
  (seed_uuid('team-phi'), seed_uuid('league-nfl'), 'Philadelphia Eagles', 'Eagles', 'PHI', 'Philadelphia'),
  (seed_uuid('team-was'), seed_uuid('league-nfl'), 'Washington Commanders', 'Commanders', 'WAS', 'Washington'),
  -- NFC North
  (seed_uuid('team-chi'), seed_uuid('league-nfl'), 'Chicago Bears', 'Bears', 'CHI', 'Chicago'),
  (seed_uuid('team-det'), seed_uuid('league-nfl'), 'Detroit Lions', 'Lions', 'DET', 'Detroit'),
  (seed_uuid('team-gb'),  seed_uuid('league-nfl'), 'Green Bay Packers', 'Packers', 'GB', 'Green Bay'),
  (seed_uuid('team-min'), seed_uuid('league-nfl'), 'Minnesota Vikings', 'Vikings', 'MIN', 'Minneapolis'),
  -- NFC South
  (seed_uuid('team-atl'), seed_uuid('league-nfl'), 'Atlanta Falcons', 'Falcons', 'ATL', 'Atlanta'),
  (seed_uuid('team-car'), seed_uuid('league-nfl'), 'Carolina Panthers', 'Panthers', 'CAR', 'Charlotte'),
  (seed_uuid('team-no'),  seed_uuid('league-nfl'), 'New Orleans Saints', 'Saints', 'NO', 'New Orleans'),
  (seed_uuid('team-tb'),  seed_uuid('league-nfl'), 'Tampa Bay Buccaneers', 'Buccaneers', 'TB', 'Tampa Bay'),
  -- NFC West
  (seed_uuid('team-ari'), seed_uuid('league-nfl'), 'Arizona Cardinals', 'Cardinals', 'ARI', 'Glendale'),
  (seed_uuid('team-lar'), seed_uuid('league-nfl'), 'Los Angeles Rams', 'Rams', 'LAR', 'Los Angeles'),
  (seed_uuid('team-sf'),  seed_uuid('league-nfl'), 'San Francisco 49ers', '49ers', 'SF', 'San Francisco'),
  (seed_uuid('team-sea'), seed_uuid('league-nfl'), 'Seattle Seahawks', 'Seahawks', 'SEA', 'Seattle')
ON CONFLICT DO NOTHING;

-- ─── NBA (30 teams) ───
INSERT INTO teams (id, league_id, name, short_name, abbreviation, city) VALUES
  -- Atlantic
  (seed_uuid('team-bos-nba'), seed_uuid('league-nba'), 'Boston Celtics', 'Celtics', 'BOS', 'Boston'),
  (seed_uuid('team-bkn'),     seed_uuid('league-nba'), 'Brooklyn Nets', 'Nets', 'BKN', 'Brooklyn'),
  (seed_uuid('team-nyk'),     seed_uuid('league-nba'), 'New York Knicks', 'Knicks', 'NYK', 'New York'),
  (seed_uuid('team-phi-nba'), seed_uuid('league-nba'), 'Philadelphia 76ers', '76ers', 'PHI', 'Philadelphia'),
  (seed_uuid('team-tor'),     seed_uuid('league-nba'), 'Toronto Raptors', 'Raptors', 'TOR', 'Toronto'),
  -- Central
  (seed_uuid('team-chi-nba'), seed_uuid('league-nba'), 'Chicago Bulls', 'Bulls', 'CHI', 'Chicago'),
  (seed_uuid('team-cle-nba'), seed_uuid('league-nba'), 'Cleveland Cavaliers', 'Cavaliers', 'CLE', 'Cleveland'),
  (seed_uuid('team-det-nba'), seed_uuid('league-nba'), 'Detroit Pistons', 'Pistons', 'DET', 'Detroit'),
  (seed_uuid('team-ind-nba'), seed_uuid('league-nba'), 'Indiana Pacers', 'Pacers', 'IND', 'Indianapolis'),
  (seed_uuid('team-mil'),     seed_uuid('league-nba'), 'Milwaukee Bucks', 'Bucks', 'MIL', 'Milwaukee'),
  -- Southeast
  (seed_uuid('team-atl-nba'), seed_uuid('league-nba'), 'Atlanta Hawks', 'Hawks', 'ATL', 'Atlanta'),
  (seed_uuid('team-cha'),     seed_uuid('league-nba'), 'Charlotte Hornets', 'Hornets', 'CHA', 'Charlotte'),
  (seed_uuid('team-mia-nba'), seed_uuid('league-nba'), 'Miami Heat', 'Heat', 'MIA', 'Miami'),
  (seed_uuid('team-orl'),     seed_uuid('league-nba'), 'Orlando Magic', 'Magic', 'ORL', 'Orlando'),
  (seed_uuid('team-wsh'),     seed_uuid('league-nba'), 'Washington Wizards', 'Wizards', 'WAS', 'Washington'),
  -- Northwest
  (seed_uuid('team-den-nba'), seed_uuid('league-nba'), 'Denver Nuggets', 'Nuggets', 'DEN', 'Denver'),
  (seed_uuid('team-min-nba'), seed_uuid('league-nba'), 'Minnesota Timberwolves', 'Timberwolves', 'MIN', 'Minneapolis'),
  (seed_uuid('team-okc'),     seed_uuid('league-nba'), 'Oklahoma City Thunder', 'Thunder', 'OKC', 'Oklahoma City'),
  (seed_uuid('team-por'),     seed_uuid('league-nba'), 'Portland Trail Blazers', 'Trail Blazers', 'POR', 'Portland'),
  (seed_uuid('team-uta'),     seed_uuid('league-nba'), 'Utah Jazz', 'Jazz', 'UTA', 'Salt Lake City'),
  -- Pacific
  (seed_uuid('team-gsw'),     seed_uuid('league-nba'), 'Golden State Warriors', 'Warriors', 'GSW', 'San Francisco'),
  (seed_uuid('team-lac-nba'), seed_uuid('league-nba'), 'Los Angeles Clippers', 'Clippers', 'LAC', 'Los Angeles'),
  (seed_uuid('team-lal'),     seed_uuid('league-nba'), 'Los Angeles Lakers', 'Lakers', 'LAL', 'Los Angeles'),
  (seed_uuid('team-phx'),     seed_uuid('league-nba'), 'Phoenix Suns', 'Suns', 'PHX', 'Phoenix'),
  (seed_uuid('team-sac'),     seed_uuid('league-nba'), 'Sacramento Kings', 'Kings', 'SAC', 'Sacramento'),
  -- Southwest
  (seed_uuid('team-dal-nba'), seed_uuid('league-nba'), 'Dallas Mavericks', 'Mavericks', 'DAL', 'Dallas'),
  (seed_uuid('team-hou-nba'), seed_uuid('league-nba'), 'Houston Rockets', 'Rockets', 'HOU', 'Houston'),
  (seed_uuid('team-mem'),     seed_uuid('league-nba'), 'Memphis Grizzlies', 'Grizzlies', 'MEM', 'Memphis'),
  (seed_uuid('team-nop'),     seed_uuid('league-nba'), 'New Orleans Pelicans', 'Pelicans', 'NOP', 'New Orleans'),
  (seed_uuid('team-sas'),     seed_uuid('league-nba'), 'San Antonio Spurs', 'Spurs', 'SAS', 'San Antonio')
ON CONFLICT DO NOTHING;

-- ─── MLB (30 teams) ───
INSERT INTO teams (id, league_id, name, short_name, abbreviation, city) VALUES
  -- AL East
  (seed_uuid('team-nyy'), seed_uuid('league-mlb'), 'New York Yankees', 'Yankees', 'NYY', 'New York'),
  (seed_uuid('team-bos-mlb'), seed_uuid('league-mlb'), 'Boston Red Sox', 'Red Sox', 'BOS', 'Boston'),
  (seed_uuid('team-tor-mlb'), seed_uuid('league-mlb'), 'Toronto Blue Jays', 'Blue Jays', 'TOR', 'Toronto'),
  (seed_uuid('team-bal-mlb'), seed_uuid('league-mlb'), 'Baltimore Orioles', 'Orioles', 'BAL', 'Baltimore'),
  (seed_uuid('team-tb-mlb'),  seed_uuid('league-mlb'), 'Tampa Bay Rays', 'Rays', 'TB', 'St. Petersburg'),
  -- AL Central
  (seed_uuid('team-cle-mlb'), seed_uuid('league-mlb'), 'Cleveland Guardians', 'Guardians', 'CLE', 'Cleveland'),
  (seed_uuid('team-min-mlb'), seed_uuid('league-mlb'), 'Minnesota Twins', 'Twins', 'MIN', 'Minneapolis'),
  (seed_uuid('team-det-mlb'), seed_uuid('league-mlb'), 'Detroit Tigers', 'Tigers', 'DET', 'Detroit'),
  (seed_uuid('team-kc-mlb'),  seed_uuid('league-mlb'), 'Kansas City Royals', 'Royals', 'KC', 'Kansas City'),
  (seed_uuid('team-cws'),     seed_uuid('league-mlb'), 'Chicago White Sox', 'White Sox', 'CWS', 'Chicago'),
  -- AL West
  (seed_uuid('team-hou-mlb'), seed_uuid('league-mlb'), 'Houston Astros', 'Astros', 'HOU', 'Houston'),
  (seed_uuid('team-sea-mlb'), seed_uuid('league-mlb'), 'Seattle Mariners', 'Mariners', 'SEA', 'Seattle'),
  (seed_uuid('team-tex'),     seed_uuid('league-mlb'), 'Texas Rangers', 'Rangers', 'TEX', 'Arlington'),
  (seed_uuid('team-laa'),     seed_uuid('league-mlb'), 'Los Angeles Angels', 'Angels', 'LAA', 'Anaheim'),
  (seed_uuid('team-oak'),     seed_uuid('league-mlb'), 'Oakland Athletics', 'Athletics', 'OAK', 'Sacramento'),
  -- NL East
  (seed_uuid('team-nym'), seed_uuid('league-mlb'), 'New York Mets', 'Mets', 'NYM', 'New York'),
  (seed_uuid('team-atl-mlb'), seed_uuid('league-mlb'), 'Atlanta Braves', 'Braves', 'ATL', 'Atlanta'),
  (seed_uuid('team-phi-mlb'), seed_uuid('league-mlb'), 'Philadelphia Phillies', 'Phillies', 'PHI', 'Philadelphia'),
  (seed_uuid('team-mia-mlb'), seed_uuid('league-mlb'), 'Miami Marlins', 'Marlins', 'MIA', 'Miami'),
  (seed_uuid('team-was-mlb'), seed_uuid('league-mlb'), 'Washington Nationals', 'Nationals', 'WAS', 'Washington'),
  -- NL Central
  (seed_uuid('team-chc'),     seed_uuid('league-mlb'), 'Chicago Cubs', 'Cubs', 'CHC', 'Chicago'),
  (seed_uuid('team-mil-mlb'), seed_uuid('league-mlb'), 'Milwaukee Brewers', 'Brewers', 'MIL', 'Milwaukee'),
  (seed_uuid('team-pit-mlb'), seed_uuid('league-mlb'), 'Pittsburgh Pirates', 'Pirates', 'PIT', 'Pittsburgh'),
  (seed_uuid('team-stl'),     seed_uuid('league-mlb'), 'St. Louis Cardinals', 'Cardinals', 'STL', 'St. Louis'),
  (seed_uuid('team-cin-mlb'), seed_uuid('league-mlb'), 'Cincinnati Reds', 'Reds', 'CIN', 'Cincinnati'),
  -- NL West
  (seed_uuid('team-lad'), seed_uuid('league-mlb'), 'Los Angeles Dodgers', 'Dodgers', 'LAD', 'Los Angeles'),
  (seed_uuid('team-sd'),  seed_uuid('league-mlb'), 'San Diego Padres', 'Padres', 'SD', 'San Diego'),
  (seed_uuid('team-sf-mlb'),  seed_uuid('league-mlb'), 'San Francisco Giants', 'Giants', 'SF', 'San Francisco'),
  (seed_uuid('team-ari-mlb'), seed_uuid('league-mlb'), 'Arizona Diamondbacks', 'D-backs', 'ARI', 'Phoenix'),
  (seed_uuid('team-col'),     seed_uuid('league-mlb'), 'Colorado Rockies', 'Rockies', 'COL', 'Denver')
ON CONFLICT DO NOTHING;

-- ─── NHL (32 teams) ───
INSERT INTO teams (id, league_id, name, short_name, abbreviation, city) VALUES
  -- Atlantic
  (seed_uuid('team-bos-nhl'), seed_uuid('league-nhl'), 'Boston Bruins', 'Bruins', 'BOS', 'Boston'),
  (seed_uuid('team-buf-nhl'), seed_uuid('league-nhl'), 'Buffalo Sabres', 'Sabres', 'BUF', 'Buffalo'),
  (seed_uuid('team-det-nhl'), seed_uuid('league-nhl'), 'Detroit Red Wings', 'Red Wings', 'DET', 'Detroit'),
  (seed_uuid('team-fla-nhl'), seed_uuid('league-nhl'), 'Florida Panthers', 'Panthers', 'FLA', 'Sunrise'),
  (seed_uuid('team-mtl'),     seed_uuid('league-nhl'), 'Montreal Canadiens', 'Canadiens', 'MTL', 'Montreal'),
  (seed_uuid('team-ott'),     seed_uuid('league-nhl'), 'Ottawa Senators', 'Senators', 'OTT', 'Ottawa'),
  (seed_uuid('team-tb-nhl'),  seed_uuid('league-nhl'), 'Tampa Bay Lightning', 'Lightning', 'TBL', 'Tampa'),
  (seed_uuid('team-tor-nhl'), seed_uuid('league-nhl'), 'Toronto Maple Leafs', 'Maple Leafs', 'TOR', 'Toronto'),
  -- Metropolitan
  (seed_uuid('team-car-nhl'), seed_uuid('league-nhl'), 'Carolina Hurricanes', 'Hurricanes', 'CAR', 'Raleigh'),
  (seed_uuid('team-cbj'),     seed_uuid('league-nhl'), 'Columbus Blue Jackets', 'Blue Jackets', 'CBJ', 'Columbus'),
  (seed_uuid('team-njd'),     seed_uuid('league-nhl'), 'New Jersey Devils', 'Devils', 'NJD', 'Newark'),
  (seed_uuid('team-nyi'),     seed_uuid('league-nhl'), 'New York Islanders', 'Islanders', 'NYI', 'Elmont'),
  (seed_uuid('team-nyr'),     seed_uuid('league-nhl'), 'New York Rangers', 'Rangers', 'NYR', 'New York'),
  (seed_uuid('team-phi-nhl'), seed_uuid('league-nhl'), 'Philadelphia Flyers', 'Flyers', 'PHI', 'Philadelphia'),
  (seed_uuid('team-pit-nhl'), seed_uuid('league-nhl'), 'Pittsburgh Penguins', 'Penguins', 'PIT', 'Pittsburgh'),
  (seed_uuid('team-wsh-nhl'), seed_uuid('league-nhl'), 'Washington Capitals', 'Capitals', 'WSH', 'Washington'),
  -- Central
  (seed_uuid('team-ari-nhl'), seed_uuid('league-nhl'), 'Utah Hockey Club', 'Utah HC', 'UTA', 'Salt Lake City'),
  (seed_uuid('team-chi-nhl'), seed_uuid('league-nhl'), 'Chicago Blackhawks', 'Blackhawks', 'CHI', 'Chicago'),
  (seed_uuid('team-col-nhl'), seed_uuid('league-nhl'), 'Colorado Avalanche', 'Avalanche', 'COL', 'Denver'),
  (seed_uuid('team-dal-nhl'), seed_uuid('league-nhl'), 'Dallas Stars', 'Stars', 'DAL', 'Dallas'),
  (seed_uuid('team-min-nhl'), seed_uuid('league-nhl'), 'Minnesota Wild', 'Wild', 'MIN', 'Saint Paul'),
  (seed_uuid('team-nsh'),     seed_uuid('league-nhl'), 'Nashville Predators', 'Predators', 'NSH', 'Nashville'),
  (seed_uuid('team-stl-nhl'), seed_uuid('league-nhl'), 'St. Louis Blues', 'Blues', 'STL', 'St. Louis'),
  (seed_uuid('team-wpg'),     seed_uuid('league-nhl'), 'Winnipeg Jets', 'Jets', 'WPG', 'Winnipeg'),
  -- Pacific
  (seed_uuid('team-ana'),     seed_uuid('league-nhl'), 'Anaheim Ducks', 'Ducks', 'ANA', 'Anaheim'),
  (seed_uuid('team-cgy'),     seed_uuid('league-nhl'), 'Calgary Flames', 'Flames', 'CGY', 'Calgary'),
  (seed_uuid('team-edm'),     seed_uuid('league-nhl'), 'Edmonton Oilers', 'Oilers', 'EDM', 'Edmonton'),
  (seed_uuid('team-la-nhl'),  seed_uuid('league-nhl'), 'Los Angeles Kings', 'Kings', 'LAK', 'Los Angeles'),
  (seed_uuid('team-sj'),      seed_uuid('league-nhl'), 'San Jose Sharks', 'Sharks', 'SJS', 'San Jose'),
  (seed_uuid('team-sea-nhl'), seed_uuid('league-nhl'), 'Seattle Kraken', 'Kraken', 'SEA', 'Seattle'),
  (seed_uuid('team-van'),     seed_uuid('league-nhl'), 'Vancouver Canucks', 'Canucks', 'VAN', 'Vancouver'),
  (seed_uuid('team-vgk'),     seed_uuid('league-nhl'), 'Vegas Golden Knights', 'Golden Knights', 'VGK', 'Las Vegas')
ON CONFLICT DO NOTHING;

-- ─── MLS (29 teams) ───
INSERT INTO teams (id, league_id, name, short_name, abbreviation, city) VALUES
  (seed_uuid('team-atl-mls'), seed_uuid('league-mls'), 'Atlanta United FC', 'Atlanta United', 'ATL', 'Atlanta'),
  (seed_uuid('team-aus-mls'), seed_uuid('league-mls'), 'Austin FC', 'Austin FC', 'ATX', 'Austin'),
  (seed_uuid('team-cha-mls'), seed_uuid('league-mls'), 'Charlotte FC', 'Charlotte FC', 'CLT', 'Charlotte'),
  (seed_uuid('team-chi-mls'), seed_uuid('league-mls'), 'Chicago Fire FC', 'Chicago Fire', 'CHI', 'Chicago'),
  (seed_uuid('team-cin-mls'), seed_uuid('league-mls'), 'FC Cincinnati', 'FC Cincinnati', 'CIN', 'Cincinnati'),
  (seed_uuid('team-col-mls'), seed_uuid('league-mls'), 'Colorado Rapids', 'Rapids', 'COL', 'Commerce City'),
  (seed_uuid('team-clb'),     seed_uuid('league-mls'), 'Columbus Crew', 'Crew', 'CLB', 'Columbus'),
  (seed_uuid('team-dal-mls'), seed_uuid('league-mls'), 'FC Dallas', 'FC Dallas', 'DAL', 'Frisco'),
  (seed_uuid('team-dc'),      seed_uuid('league-mls'), 'D.C. United', 'D.C. United', 'DC', 'Washington'),
  (seed_uuid('team-hou-mls'), seed_uuid('league-mls'), 'Houston Dynamo FC', 'Dynamo', 'HOU', 'Houston'),
  (seed_uuid('team-mia-mls'), seed_uuid('league-mls'), 'Inter Miami CF', 'Inter Miami', 'MIA', 'Fort Lauderdale'),
  (seed_uuid('team-la-mls'),  seed_uuid('league-mls'), 'LA Galaxy', 'Galaxy', 'LA', 'Carson'),
  (seed_uuid('team-lafc'),    seed_uuid('league-mls'), 'Los Angeles FC', 'LAFC', 'LAFC', 'Los Angeles'),
  (seed_uuid('team-min-mls'), seed_uuid('league-mls'), 'Minnesota United FC', 'Minnesota United', 'MIN', 'Saint Paul'),
  (seed_uuid('team-mtl-mls'), seed_uuid('league-mls'), 'CF Montreal', 'CF Montreal', 'MTL', 'Montreal'),
  (seed_uuid('team-nsh-mls'), seed_uuid('league-mls'), 'Nashville SC', 'Nashville SC', 'NSH', 'Nashville'),
  (seed_uuid('team-ne-mls'),  seed_uuid('league-mls'), 'New England Revolution', 'Revolution', 'NE', 'Foxborough'),
  (seed_uuid('team-nyrb'),    seed_uuid('league-mls'), 'New York Red Bulls', 'Red Bulls', 'NYRB', 'Harrison'),
  (seed_uuid('team-nyc-mls'), seed_uuid('league-mls'), 'New York City FC', 'NYCFC', 'NYC', 'New York'),
  (seed_uuid('team-orl-mls'), seed_uuid('league-mls'), 'Orlando City SC', 'Orlando City', 'ORL', 'Orlando'),
  (seed_uuid('team-phi-mls'), seed_uuid('league-mls'), 'Philadelphia Union', 'Union', 'PHI', 'Chester'),
  (seed_uuid('team-por-mls'), seed_uuid('league-mls'), 'Portland Timbers', 'Timbers', 'POR', 'Portland'),
  (seed_uuid('team-rsl'),     seed_uuid('league-mls'), 'Real Salt Lake', 'Real Salt Lake', 'RSL', 'Sandy'),
  (seed_uuid('team-sj-mls'),  seed_uuid('league-mls'), 'San Jose Earthquakes', 'Earthquakes', 'SJ', 'San Jose'),
  (seed_uuid('team-sea-mls'), seed_uuid('league-mls'), 'Seattle Sounders FC', 'Sounders', 'SEA', 'Seattle'),
  (seed_uuid('team-skc'),     seed_uuid('league-mls'), 'Sporting Kansas City', 'Sporting KC', 'SKC', 'Kansas City'),
  (seed_uuid('team-stl-mls'), seed_uuid('league-mls'), 'St. Louis City SC', 'St. Louis City', 'STL', 'St. Louis'),
  (seed_uuid('team-tor-mls'), seed_uuid('league-mls'), 'Toronto FC', 'Toronto FC', 'TOR', 'Toronto'),
  (seed_uuid('team-van-mls'), seed_uuid('league-mls'), 'Vancouver Whitecaps FC', 'Whitecaps', 'VAN', 'Vancouver')
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════
-- 3. VENUES (50+)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO venues (id, name, city, state, country, capacity, status, opened_year) VALUES
  -- NFL Stadiums
  (seed_uuid('venue-metlife'),      'MetLife Stadium',            'East Rutherford', 'NJ', 'US', 82500,  'active', 2010),
  (seed_uuid('venue-arrowhead'),    'GEHA Field at Arrowhead Stadium', 'Kansas City', 'MO', 'US', 76416,  'active', 1972),
  (seed_uuid('venue-sofi'),         'SoFi Stadium',               'Inglewood',       'CA', 'US', 70240,  'active', 2020),
  (seed_uuid('venue-lambeau'),      'Lambeau Field',              'Green Bay',       'WI', 'US', 81441,  'active', 1957),
  (seed_uuid('venue-att'),          'AT&T Stadium',               'Arlington',       'TX', 'US', 80000,  'active', 2009),
  (seed_uuid('venue-lincoln'),      'Lincoln Financial Field',    'Philadelphia',    'PA', 'US', 69796,  'active', 2003),
  (seed_uuid('venue-gillette'),     'Gillette Stadium',           'Foxborough',      'MA', 'US', 65878,  'active', 2002),
  (seed_uuid('venue-highmark'),     'Highmark Stadium',           'Orchard Park',    'NY', 'US', 71608,  'active', 1973),
  (seed_uuid('venue-lumen'),        'Lumen Field',                'Seattle',         'WA', 'US', 68740,  'active', 2002),
  (seed_uuid('venue-allegiant'),    'Allegiant Stadium',          'Las Vegas',       'NV', 'US', 65000,  'active', 2020),
  (seed_uuid('venue-mbstadium'),    'Mercedes-Benz Stadium',      'Atlanta',         'GA', 'US', 71000,  'active', 2017),
  (seed_uuid('venue-raymond'),      'Raymond James Stadium',      'Tampa',           'FL', 'US', 65618,  'active', 1998),
  (seed_uuid('venue-caesars'),      'Caesars Superdome',           'New Orleans',     'LA', 'US', 73208,  'active', 1975),
  (seed_uuid('venue-nrg'),          'NRG Stadium',                'Houston',         'TX', 'US', 72220,  'active', 2002),
  (seed_uuid('venue-acrisure'),     'Acrisure Stadium',           'Pittsburgh',      'PA', 'US', 68400,  'active', 2001),
  (seed_uuid('venue-usbank'),       'U.S. Bank Stadium',          'Minneapolis',     'MN', 'US', 66860,  'active', 2016),
  (seed_uuid('venue-ford'),         'Ford Field',                 'Detroit',         'MI', 'US', 65000,  'active', 2002),
  (seed_uuid('venue-soldier'),      'Soldier Field',              'Chicago',         'IL', 'US', 61500,  'active', 1924),
  (seed_uuid('venue-levis'),        'Levi''s Stadium',            'Santa Clara',     'CA', 'US', 68500,  'active', 2014),
  (seed_uuid('venue-hardrock'),     'Hard Rock Stadium',          'Miami Gardens',   'FL', 'US', 64767,  'active', 1987),
  (seed_uuid('venue-paycor'),       'Paycor Stadium',             'Cincinnati',      'OH', 'US', 65515,  'active', 2000),
  (seed_uuid('venue-northwest'),    'Northwest Stadium',          'Landover',        'MD', 'US', 67617,  'active', 1997),
  (seed_uuid('venue-nissan'),       'Nissan Stadium',             'Nashville',       'TN', 'US', 69143,  'active', 1999),
  (seed_uuid('venue-lucas'),        'Lucas Oil Stadium',          'Indianapolis',    'IN', 'US', 67000,  'active', 2008),
  (seed_uuid('venue-everbank'),     'EverBank Stadium',           'Jacksonville',    'FL', 'US', 67814,  'active', 1995),
  (seed_uuid('venue-boa'),          'Bank of America Stadium',    'Charlotte',       'NC', 'US', 75523,  'active', 1996),
  (seed_uuid('venue-mandt'),        'M&T Bank Stadium',           'Baltimore',       'MD', 'US', 71008,  'active', 1998),
  (seed_uuid('venue-huntington'),   'Huntington Bank Field',      'Cleveland',       'OH', 'US', 67431,  'active', 1999),
  (seed_uuid('venue-empower'),      'Empower Field at Mile High', 'Denver',          'CO', 'US', 76125,  'active', 2001),
  (seed_uuid('venue-stfarm'),       'State Farm Stadium',         'Glendale',        'AZ', 'US', 63400,  'active', 2006),
  -- NBA Arenas
  (seed_uuid('venue-msg'),          'Madison Square Garden',      'New York',        'NY', 'US', 20789,  'active', 1968),
  (seed_uuid('venue-tdgarden'),     'TD Garden',                  'Boston',          'MA', 'US', 19156,  'active', 1995),
  (seed_uuid('venue-chase'),        'Chase Center',               'San Francisco',   'CA', 'US', 18064,  'active', 2019),
  (seed_uuid('venue-crypto'),       'Crypto.com Arena',           'Los Angeles',     'CA', 'US', 19079,  'active', 1999),
  (seed_uuid('venue-united'),       'United Center',              'Chicago',         'IL', 'US', 20917,  'active', 1994),
  (seed_uuid('venue-barclays'),     'Barclays Center',            'Brooklyn',        'NY', 'US', 17732,  'active', 2012),
  (seed_uuid('venue-wells'),        'Wells Fargo Center',         'Philadelphia',    'PA', 'US', 20478,  'active', 1996),
  (seed_uuid('venue-ball'),         'Ball Arena',                 'Denver',          'CO', 'US', 19520,  'active', 1999),
  (seed_uuid('venue-target'),       'Target Center',              'Minneapolis',     'MN', 'US', 18978,  'active', 1990),
  (seed_uuid('venue-paycom'),       'Paycom Center',              'Oklahoma City',   'OK', 'US', 18203,  'active', 2002),
  (seed_uuid('venue-aaa'),          'Kaseya Center',              'Miami',           'FL', 'US', 19600,  'active', 1999),
  (seed_uuid('venue-fiserv'),       'Fiserv Forum',               'Milwaukee',       'WI', 'US', 17341,  'active', 2018),
  (seed_uuid('venue-footprint'),    'Footprint Center',           'Phoenix',         'AZ', 'US', 18422,  'active', 1992),
  (seed_uuid('venue-toyota'),       'Toyota Center',              'Houston',         'TX', 'US', 18055,  'active', 2003),
  (seed_uuid('venue-aac'),          'American Airlines Center',   'Dallas',          'TX', 'US', 19200,  'active', 2001),
  (seed_uuid('venue-scotiabank'),   'Scotiabank Arena',           'Toronto',         'ON', 'CA', 19800,  'active', 1999),
  (seed_uuid('venue-intuit'),       'Intuit Dome',                'Inglewood',       'CA', 'US', 18000,  'active', 2024),
  (seed_uuid('venue-capitol'),      'Capital One Arena',          'Washington',      'DC', 'US', 20356,  'active', 1997),
  (seed_uuid('venue-stfarm-nba'),   'State Farm Arena',           'Atlanta',         'GA', 'US', 18118,  'active', 1999),
  (seed_uuid('venue-fedex'),        'FedExForum',                 'Memphis',         'TN', 'US', 18119,  'active', 2004),
  (seed_uuid('venue-smoothie'),     'Smoothie King Center',       'New Orleans',     'LA', 'US', 16867,  'active', 1999),
  (seed_uuid('venue-gainbridge'),   'Gainbridge Fieldhouse',      'Indianapolis',    'IN', 'US', 18165,  'active', 1999),
  (seed_uuid('venue-frost'),        'Frost Bank Center',          'San Antonio',     'TX', 'US', 18581,  'active', 2002),
  (seed_uuid('venue-rocket'),       'Rocket Mortgage FieldHouse', 'Cleveland',       'OH', 'US', 19432,  'active', 1994),
  (seed_uuid('venue-littlecaesars'),'Little Caesars Arena',       'Detroit',         'MI', 'US', 20332,  'active', 2017),
  (seed_uuid('venue-golden1'),      'Golden 1 Center',            'Sacramento',      'CA', 'US', 17608,  'active', 2016),
  (seed_uuid('venue-moda'),         'Moda Center',                'Portland',        'OR', 'US', 19441,  'active', 1995),
  (seed_uuid('venue-delta'),        'Delta Center',               'Salt Lake City',  'UT', 'US', 18206,  'active', 1991),
  (seed_uuid('venue-spectrum'),     'Spectrum Center',            'Charlotte',       'NC', 'US', 19077,  'active', 2005),
  (seed_uuid('venue-amway'),        'Amway Center',               'Orlando',         'FL', 'US', 18846,  'active', 2010),
  -- MLB Stadiums
  (seed_uuid('venue-yankee'),       'Yankee Stadium',             'Bronx',           'NY', 'US', 46537,  'active', 2009),
  (seed_uuid('venue-citi'),         'Citi Field',                 'Queens',          'NY', 'US', 41922,  'active', 2009),
  (seed_uuid('venue-fenway'),       'Fenway Park',                'Boston',          'MA', 'US', 37755,  'active', 1912),
  (seed_uuid('venue-wrigley'),      'Wrigley Field',              'Chicago',         'IL', 'US', 41649,  'active', 1914),
  (seed_uuid('venue-dodger'),       'Dodger Stadium',             'Los Angeles',     'CA', 'US', 56000,  'active', 1962),
  (seed_uuid('venue-pnc'),          'PNC Park',                   'Pittsburgh',      'PA', 'US', 38362,  'active', 2001),
  (seed_uuid('venue-oracle'),       'Oracle Park',                'San Francisco',   'CA', 'US', 41265,  'active', 2000),
  (seed_uuid('venue-camden'),       'Camden Yards',               'Baltimore',       'MD', 'US', 45971,  'active', 1992),
  (seed_uuid('venue-minute'),       'Minute Maid Park',           'Houston',         'TX', 'US', 41168,  'active', 2000),
  (seed_uuid('venue-truist'),       'Truist Park',                'Atlanta',         'GA', 'US', 41084,  'active', 2017),
  (seed_uuid('venue-citizens'),     'Citizens Bank Park',         'Philadelphia',    'PA', 'US', 42792,  'active', 2004),
  (seed_uuid('venue-petco'),        'Petco Park',                 'San Diego',       'CA', 'US', 42445,  'active', 2004),
  (seed_uuid('venue-trop'),         'Tropicana Field',            'St. Petersburg',  'FL', 'US', 25000,  'active', 1990),
  (seed_uuid('venue-guaranteed'),   'Guaranteed Rate Field',      'Chicago',         'IL', 'US', 40615,  'active', 1991),
  (seed_uuid('venue-progressive'),  'Progressive Field',          'Cleveland',       'OH', 'US', 34830,  'active', 1994),
  (seed_uuid('venue-target-mlb'),   'Target Field',               'Minneapolis',     'MN', 'US', 38544,  'active', 2010),
  (seed_uuid('venue-comerica'),     'Comerica Park',              'Detroit',         'MI', 'US', 41083,  'active', 2000),
  (seed_uuid('venue-kauffman'),     'Kauffman Stadium',           'Kansas City',     'MO', 'US', 37903,  'active', 1973),
  (seed_uuid('venue-globe'),        'Globe Life Field',           'Arlington',       'TX', 'US', 40300,  'active', 2020),
  (seed_uuid('venue-tmobile-mlb'),  'T-Mobile Park',              'Seattle',         'WA', 'US', 47929,  'active', 1999),
  (seed_uuid('venue-angel'),        'Angel Stadium',              'Anaheim',         'CA', 'US', 45517,  'active', 1966),
  (seed_uuid('venue-rogers'),       'Rogers Centre',              'Toronto',         'ON', 'CA', 49282,  'active', 1989),
  (seed_uuid('venue-busch'),        'Busch Stadium',              'St. Louis',       'MO', 'US', 45494,  'active', 2006),
  (seed_uuid('venue-chase-mlb'),    'Chase Field',                'Phoenix',         'AZ', 'US', 48519,  'active', 1998),
  (seed_uuid('venue-coors'),        'Coors Field',                'Denver',          'CO', 'US', 50144,  'active', 1995),
  (seed_uuid('venue-amfam'),        'American Family Field',      'Milwaukee',       'WI', 'US', 41900,  'active', 2001),
  (seed_uuid('venue-gabp'),         'Great American Ball Park',   'Cincinnati',      'OH', 'US', 42319,  'active', 2003),
  (seed_uuid('venue-nationals'),    'Nationals Park',             'Washington',      'DC', 'US', 41339,  'active', 2008),
  (seed_uuid('venue-loandepot'),    'loanDepot Park',             'Miami',           'FL', 'US', 36742,  'active', 2012),
  (seed_uuid('venue-sutter'),       'Sutter Health Park',         'Sacramento',      'CA', 'US', 14014,  'active', 2000),
  -- NHL-only Arenas (not shared with NBA)
  (seed_uuid('venue-ubs'),          'UBS Arena',                  'Elmont',          'NY', 'US', 17255,  'active', 2021),
  (seed_uuid('venue-pru'),          'Prudential Center',          'Newark',          'NJ', 'US', 16514,  'active', 2007),
  (seed_uuid('venue-ppg'),          'PPG Paints Arena',           'Pittsburgh',      'PA', 'US', 18387,  'active', 2010),
  (seed_uuid('venue-pnc-nhl'),      'PNC Arena',                  'Raleigh',         'NC', 'US', 18680,  'active', 1999),
  (seed_uuid('venue-nationwide'),   'Nationwide Arena',           'Columbus',        'OH', 'US', 18144,  'active', 2000),
  (seed_uuid('venue-amalie'),       'Amalie Arena',               'Tampa',           'FL', 'US', 19092,  'active', 1996),
  (seed_uuid('venue-bell'),         'Bell Centre',                'Montreal',        'QC', 'CA', 21302,  'active', 1996),
  (seed_uuid('venue-ctd'),          'Canadian Tire Centre',       'Ottawa',          'ON', 'CA', 18652,  'active', 1996),
  (seed_uuid('venue-amerant'),      'Amerant Bank Arena',         'Sunrise',         'FL', 'US', 19250,  'active', 1998),
  (seed_uuid('venue-keybank'),      'KeyBank Center',             'Buffalo',         'NY', 'US', 19070,  'active', 1996),
  (seed_uuid('venue-enterprise'),   'Enterprise Center',          'St. Louis',       'MO', 'US', 18096,  'active', 1994),
  (seed_uuid('venue-bridgestone'),  'Bridgestone Arena',          'Nashville',       'TN', 'US', 17159,  'active', 1996),
  (seed_uuid('venue-xcel'),         'Xcel Energy Center',         'Saint Paul',      'MN', 'US', 17954,  'active', 2000),
  (seed_uuid('venue-tmobile'),      'T-Mobile Arena',             'Las Vegas',       'NV', 'US', 17500,  'active', 2016),
  (seed_uuid('venue-honda'),        'Honda Center',               'Anaheim',         'CA', 'US', 17174,  'active', 1993),
  (seed_uuid('venue-rogers-nhl'),   'Rogers Place',               'Edmonton',        'AB', 'CA', 18347,  'active', 2016),
  (seed_uuid('venue-saddledome'),   'Scotiabank Saddledome',      'Calgary',         'AB', 'CA', 19289,  'active', 1983),
  (seed_uuid('venue-climate'),      'Climate Pledge Arena',       'Seattle',         'WA', 'US', 17100,  'active', 2021),
  (seed_uuid('venue-rogers-van'),   'Rogers Arena',               'Vancouver',       'BC', 'CA', 18910,  'active', 1995),
  (seed_uuid('venue-sap'),          'SAP Center',                 'San Jose',        'CA', 'US', 17562,  'active', 1993),
  (seed_uuid('venue-canada'),       'Canada Life Centre',         'Winnipeg',        'MB', 'CA', 15321,  'active', 2004),
  -- MLS Stadiums (unique ones not already listed)
  (seed_uuid('venue-dignity'),      'Dignity Health Sports Park', 'Carson',          'CA', 'US', 27000,  'active', 2003),
  (seed_uuid('venue-bmostadium'),   'BMO Stadium',                'Los Angeles',     'CA', 'US', 22000,  'active', 2018),
  (seed_uuid('venue-drivehuron'),   'Chase Stadium',              'Fort Lauderdale', 'FL', 'US', 21550,  'active', 2020),
  (seed_uuid('venue-redbull'),      'Red Bull Arena',             'Harrison',        'NJ', 'US', 25000,  'active', 2010),
  (seed_uuid('venue-q2'),           'Q2 Stadium',                 'Austin',          'TX', 'US', 20738,  'active', 2021),
  (seed_uuid('venue-tql'),          'TQL Stadium',                'Cincinnati',      'OH', 'US', 26000,  'active', 2021),
  (seed_uuid('venue-lowerfld'),     'Lower.com Field',            'Columbus',        'OH', 'US', 20371,  'active', 2021),
  (seed_uuid('venue-citypark'),     'CityPark',                   'St. Louis',       'MO', 'US', 22500,  'active', 2023),
  (seed_uuid('venue-audi'),         'Audi Field',                 'Washington',      'DC', 'US', 20000,  'active', 2018),
  (seed_uuid('venue-shellhous'),    'Shell Energy Stadium',       'Houston',         'TX', 'US', 22039,  'active', 2012),
  (seed_uuid('venue-subaru'),       'Subaru Park',                'Chester',         'PA', 'US', 18500,  'active', 2010),
  (seed_uuid('venue-providence'),   'Providence Park',            'Portland',        'OR', 'US', 25218,  'active', 1926),
  (seed_uuid('venue-rio'),          'America First Credit Union Field', 'Sandy',     'UT', 'US', 20213,  'active', 2008),
  (seed_uuid('venue-paypal'),       'PayPal Park',                'San Jose',        'CA', 'US', 18000,  'active', 2015),
  (seed_uuid('venue-allianz'),      'Allianz Field',              'Saint Paul',      'MN', 'US', 19400,  'active', 2019),
  (seed_uuid('venue-geodis'),       'GEODIS Park',                'Nashville',       'TN', 'US', 30000,  'active', 2022),
  (seed_uuid('venue-saputo'),       'Stade Saputo',               'Montreal',        'QC', 'CA', 19619,  'active', 2008),
  (seed_uuid('venue-bmofield'),     'BMO Field',                  'Toronto',         'ON', 'CA', 30000,  'active', 2007),
  (seed_uuid('venue-bcplace'),      'BC Place',                   'Vancouver',       'BC', 'CA', 22120,  'active', 1983),
  (seed_uuid('venue-exploria'),     'Exploria Stadium',           'Orlando',         'FL', 'US', 25500,  'active', 2017),
  (seed_uuid('venue-dicks'),        'Dick''s Sporting Goods Park','Commerce City',   'CO', 'US', 18086,  'active', 2007),
  (seed_uuid('venue-toyota-mls'),   'Toyota Stadium',             'Frisco',          'TX', 'US', 20500,  'active', 2005),
  (seed_uuid('venue-children'),     'Children''s Mercy Park',     'Kansas City',     'KS', 'US', 18467,  'active', 2011),
  -- Golf Courses
  (seed_uuid('venue-augusta'),      'Augusta National Golf Club', 'Augusta',         'GA', 'US', 35000,  'active', 1933),
  (seed_uuid('venue-tpc'),          'TPC Sawgrass',               'Ponte Vedra Beach','FL','US', 40000,  'active', 1980),
  (seed_uuid('venue-pebble'),       'Pebble Beach Golf Links',    'Pebble Beach',    'CA', 'US', 10000,  'active', 1919),
  (seed_uuid('venue-pinehurst'),    'Pinehurst No. 2',            'Pinehurst',       'NC', 'US', 30000,  'active', 1907),
  (seed_uuid('venue-valhalla'),     'Valhalla Golf Club',         'Louisville',      'KY', 'US', 40000,  'active', 1986),
  (seed_uuid('venue-torrey'),       'Torrey Pines Golf Course',   'La Jolla',        'CA', 'US', 25000,  'active', 1957),
  (seed_uuid('venue-riviera'),      'Riviera Country Club',       'Pacific Palisades','CA','US', 25000,  'active', 1927)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. VENUE-TEAM ASSOCIATIONS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO venue_teams (id, venue_id, team_id, is_primary, season_start) VALUES
  -- NFL
  (seed_uuid('vt-metlife-giants'),   seed_uuid('venue-metlife'),    seed_uuid('team-nyg'),  true,  2010),
  (seed_uuid('vt-metlife-jets'),     seed_uuid('venue-metlife'),    seed_uuid('team-nyj'),  true,  2010),
  (seed_uuid('vt-arrowhead-kc'),     seed_uuid('venue-arrowhead'),  seed_uuid('team-kc'),   true,  1972),
  (seed_uuid('vt-sofi-rams'),        seed_uuid('venue-sofi'),       seed_uuid('team-lar'),  true,  2020),
  (seed_uuid('vt-sofi-chargers'),    seed_uuid('venue-sofi'),       seed_uuid('team-lac'),  true,  2020),
  (seed_uuid('vt-lambeau-gb'),       seed_uuid('venue-lambeau'),    seed_uuid('team-gb'),   true,  1957),
  (seed_uuid('vt-att-dal'),          seed_uuid('venue-att'),        seed_uuid('team-dal'),  true,  2009),
  (seed_uuid('vt-lincoln-phi'),      seed_uuid('venue-lincoln'),    seed_uuid('team-phi'),  true,  2003),
  (seed_uuid('vt-gillette-ne'),      seed_uuid('venue-gillette'),   seed_uuid('team-nep'),  true,  2002),
  (seed_uuid('vt-highmark-buf'),     seed_uuid('venue-highmark'),   seed_uuid('team-buf'),  true,  1973),
  (seed_uuid('vt-lumen-sea'),        seed_uuid('venue-lumen'),      seed_uuid('team-sea'),  true,  2002),
  (seed_uuid('vt-allegiant-lv'),     seed_uuid('venue-allegiant'),  seed_uuid('team-lv'),   true,  2020),
  (seed_uuid('vt-mbs-atl'),          seed_uuid('venue-mbstadium'),  seed_uuid('team-atl'),  true,  2017),
  (seed_uuid('vt-raymond-tb'),       seed_uuid('venue-raymond'),    seed_uuid('team-tb'),   true,  1998),
  (seed_uuid('vt-caesars-no'),       seed_uuid('venue-caesars'),     seed_uuid('team-no'),   true,  1975),
  (seed_uuid('vt-nrg-hou'),          seed_uuid('venue-nrg'),        seed_uuid('team-hou'),  true,  2002),
  (seed_uuid('vt-acrisure-pit'),     seed_uuid('venue-acrisure'),   seed_uuid('team-pit'),  true,  2001),
  (seed_uuid('vt-usbank-min'),       seed_uuid('venue-usbank'),     seed_uuid('team-min'),  true,  2016),
  (seed_uuid('vt-ford-det'),         seed_uuid('venue-ford'),       seed_uuid('team-det'),  true,  2002),
  (seed_uuid('vt-soldier-chi'),      seed_uuid('venue-soldier'),    seed_uuid('team-chi'),  true,  1971),
  (seed_uuid('vt-levis-sf'),         seed_uuid('venue-levis'),      seed_uuid('team-sf'),   true,  2014),
  (seed_uuid('vt-hardrock-mia'),     seed_uuid('venue-hardrock'),   seed_uuid('team-mia'),  true,  1987),
  (seed_uuid('vt-paycor-cin'),       seed_uuid('venue-paycor'),     seed_uuid('team-cin'),  true,  2000),
  (seed_uuid('vt-northwest-was'),    seed_uuid('venue-northwest'),  seed_uuid('team-was'),  true,  1997),
  (seed_uuid('vt-nissan-ten'),       seed_uuid('venue-nissan'),     seed_uuid('team-ten'),  true,  1999),
  (seed_uuid('vt-lucas-ind'),        seed_uuid('venue-lucas'),      seed_uuid('team-ind'),  true,  2008),
  (seed_uuid('vt-everbank-jax'),     seed_uuid('venue-everbank'),   seed_uuid('team-jax'),  true,  1995),
  (seed_uuid('vt-boa-car'),          seed_uuid('venue-boa'),        seed_uuid('team-car'),  true,  1996),
  (seed_uuid('vt-mandt-bal'),        seed_uuid('venue-mandt'),      seed_uuid('team-bal'),  true,  1998),
  (seed_uuid('vt-hunt-cle'),         seed_uuid('venue-huntington'), seed_uuid('team-cle'),  true,  1999),
  (seed_uuid('vt-empower-den'),      seed_uuid('venue-empower'),    seed_uuid('team-den'),  true,  2001),
  (seed_uuid('vt-stfarm-ari'),       seed_uuid('venue-stfarm'),     seed_uuid('team-ari'),  true,  2006),
  -- NBA
  (seed_uuid('vt-msg-nyk'),          seed_uuid('venue-msg'),        seed_uuid('team-nyk'),   true,  1968),
  (seed_uuid('vt-td-bos'),           seed_uuid('venue-tdgarden'),   seed_uuid('team-bos-nba'), true, 1995),
  (seed_uuid('vt-chase-gsw'),        seed_uuid('venue-chase'),      seed_uuid('team-gsw'),   true,  2019),
  (seed_uuid('vt-crypto-lal'),       seed_uuid('venue-crypto'),     seed_uuid('team-lal'),   true,  1999),
  (seed_uuid('vt-intuit-lac'),       seed_uuid('venue-intuit'),     seed_uuid('team-lac-nba'), true, 2024),
  (seed_uuid('vt-united-chi'),       seed_uuid('venue-united'),     seed_uuid('team-chi-nba'), true, 1994),
  (seed_uuid('vt-barclays-bkn'),     seed_uuid('venue-barclays'),   seed_uuid('team-bkn'),   true,  2012),
  (seed_uuid('vt-wells-phi'),        seed_uuid('venue-wells'),      seed_uuid('team-phi-nba'), true, 1996),
  (seed_uuid('vt-ball-den'),         seed_uuid('venue-ball'),       seed_uuid('team-den-nba'), true, 1999),
  (seed_uuid('vt-target-min'),       seed_uuid('venue-target'),     seed_uuid('team-min-nba'), true, 1990),
  (seed_uuid('vt-paycom-okc'),       seed_uuid('venue-paycom'),     seed_uuid('team-okc'),   true,  2008),
  (seed_uuid('vt-kaseya-mia'),       seed_uuid('venue-aaa'),        seed_uuid('team-mia-nba'), true, 1999),
  (seed_uuid('vt-fiserv-mil'),       seed_uuid('venue-fiserv'),     seed_uuid('team-mil'),   true,  2018),
  (seed_uuid('vt-footprint-phx'),    seed_uuid('venue-footprint'),  seed_uuid('team-phx'),   true,  1992),
  (seed_uuid('vt-toyota-hou'),       seed_uuid('venue-toyota'),     seed_uuid('team-hou-nba'), true, 2003),
  (seed_uuid('vt-aac-dal'),          seed_uuid('venue-aac'),        seed_uuid('team-dal-nba'), true, 2001),
  (seed_uuid('vt-scotia-tor'),       seed_uuid('venue-scotiabank'), seed_uuid('team-tor'),   true,  1999),
  (seed_uuid('vt-capitol-wsh'),      seed_uuid('venue-capitol'),    seed_uuid('team-wsh'),   true,  1997),
  (seed_uuid('vt-stfarm-atl'),       seed_uuid('venue-stfarm-nba'), seed_uuid('team-atl-nba'), true, 1999),
  (seed_uuid('vt-fedex-mem'),        seed_uuid('venue-fedex'),      seed_uuid('team-mem'),   true,  2004),
  (seed_uuid('vt-smooth-nop'),       seed_uuid('venue-smoothie'),   seed_uuid('team-nop'),   true,  2002),
  (seed_uuid('vt-gain-ind'),         seed_uuid('venue-gainbridge'), seed_uuid('team-ind-nba'), true, 1999),
  (seed_uuid('vt-frost-sas'),        seed_uuid('venue-frost'),      seed_uuid('team-sas'),   true,  2002),
  (seed_uuid('vt-rocket-cle'),       seed_uuid('venue-rocket'),     seed_uuid('team-cle-nba'), true, 1994),
  (seed_uuid('vt-lca-det'),          seed_uuid('venue-littlecaesars'), seed_uuid('team-det-nba'), true, 2017),
  (seed_uuid('vt-golden1-sac'),      seed_uuid('venue-golden1'),    seed_uuid('team-sac'),   true,  2016),
  (seed_uuid('vt-moda-por'),         seed_uuid('venue-moda'),       seed_uuid('team-por'),   true,  1995),
  (seed_uuid('vt-delta-uta'),        seed_uuid('venue-delta'),      seed_uuid('team-uta'),   true,  1991),
  (seed_uuid('vt-spectrum-cha'),     seed_uuid('venue-spectrum'),   seed_uuid('team-cha'),   true,  2005),
  (seed_uuid('vt-amway-orl'),        seed_uuid('venue-amway'),      seed_uuid('team-orl'),   true,  2010),
  -- MLB
  (seed_uuid('vt-yankee-nyy'),       seed_uuid('venue-yankee'),     seed_uuid('team-nyy'),   true,  2009),
  (seed_uuid('vt-citi-nym'),         seed_uuid('venue-citi'),       seed_uuid('team-nym'),   true,  2009),
  (seed_uuid('vt-fenway-bos'),       seed_uuid('venue-fenway'),     seed_uuid('team-bos-mlb'), true, 1912),
  (seed_uuid('vt-wrigley-chc'),      seed_uuid('venue-wrigley'),    seed_uuid('team-chc'),   true,  1916),
  (seed_uuid('vt-dodger-lad'),       seed_uuid('venue-dodger'),     seed_uuid('team-lad'),   true,  1962),
  (seed_uuid('vt-pnc-pit'),          seed_uuid('venue-pnc'),        seed_uuid('team-pit-mlb'), true, 2001),
  (seed_uuid('vt-oracle-sf'),        seed_uuid('venue-oracle'),     seed_uuid('team-sf-mlb'), true, 2000),
  (seed_uuid('vt-camden-bal'),       seed_uuid('venue-camden'),     seed_uuid('team-bal-mlb'), true, 1992),
  (seed_uuid('vt-minute-hou'),       seed_uuid('venue-minute'),     seed_uuid('team-hou-mlb'), true, 2000),
  (seed_uuid('vt-truist-atl'),       seed_uuid('venue-truist'),     seed_uuid('team-atl-mlb'), true, 2017),
  (seed_uuid('vt-citizens-phi'),     seed_uuid('venue-citizens'),   seed_uuid('team-phi-mlb'), true, 2004),
  (seed_uuid('vt-petco-sd'),         seed_uuid('venue-petco'),      seed_uuid('team-sd'),    true,  2004),
  (seed_uuid('vt-trop-tb'),          seed_uuid('venue-trop'),       seed_uuid('team-tb-mlb'), true, 1998),
  (seed_uuid('vt-guar-cws'),         seed_uuid('venue-guaranteed'), seed_uuid('team-cws'),   true,  1991),
  (seed_uuid('vt-prog-cle'),         seed_uuid('venue-progressive'),seed_uuid('team-cle-mlb'), true, 1994),
  (seed_uuid('vt-target-min-mlb'),   seed_uuid('venue-target-mlb'), seed_uuid('team-min-mlb'), true, 2010),
  (seed_uuid('vt-comerica-det'),     seed_uuid('venue-comerica'),   seed_uuid('team-det-mlb'), true, 2000),
  (seed_uuid('vt-kauffman-kc'),      seed_uuid('venue-kauffman'),   seed_uuid('team-kc-mlb'), true, 1973),
  (seed_uuid('vt-globe-tex'),        seed_uuid('venue-globe'),      seed_uuid('team-tex'),   true,  2020),
  (seed_uuid('vt-tmobile-sea'),      seed_uuid('venue-tmobile-mlb'),seed_uuid('team-sea-mlb'), true, 1999),
  (seed_uuid('vt-angel-laa'),        seed_uuid('venue-angel'),      seed_uuid('team-laa'),   true,  1966),
  (seed_uuid('vt-rogers-tor'),       seed_uuid('venue-rogers'),     seed_uuid('team-tor-mlb'), true, 1989),
  (seed_uuid('vt-busch-stl'),        seed_uuid('venue-busch'),      seed_uuid('team-stl'),   true,  2006),
  (seed_uuid('vt-chase-ari'),        seed_uuid('venue-chase-mlb'),  seed_uuid('team-ari-mlb'), true, 1998),
  (seed_uuid('vt-coors-col'),        seed_uuid('venue-coors'),      seed_uuid('team-col'),   true,  1995),
  (seed_uuid('vt-amfam-mil'),        seed_uuid('venue-amfam'),      seed_uuid('team-mil-mlb'), true, 2001),
  (seed_uuid('vt-gabp-cin'),         seed_uuid('venue-gabp'),       seed_uuid('team-cin-mlb'), true, 2003),
  (seed_uuid('vt-nationals-was'),    seed_uuid('venue-nationals'),  seed_uuid('team-was-mlb'), true, 2008),
  (seed_uuid('vt-loandepot-mia'),    seed_uuid('venue-loandepot'),  seed_uuid('team-mia-mlb'), true, 2012),
  (seed_uuid('vt-sutter-oak'),       seed_uuid('venue-sutter'),     seed_uuid('team-oak'),   true,  2025),
  -- NHL
  (seed_uuid('vt-msg-nyr'),          seed_uuid('venue-msg'),        seed_uuid('team-nyr'),   true,  1968),
  (seed_uuid('vt-td-bru'),           seed_uuid('venue-tdgarden'),   seed_uuid('team-bos-nhl'), true, 1995),
  (seed_uuid('vt-crypto-lak'),       seed_uuid('venue-crypto'),     seed_uuid('team-la-nhl'), true, 1999),
  (seed_uuid('vt-united-chi-nhl'),   seed_uuid('venue-united'),     seed_uuid('team-chi-nhl'), true, 1994),
  (seed_uuid('vt-wells-phi-nhl'),    seed_uuid('venue-wells'),      seed_uuid('team-phi-nhl'), true, 1996),
  (seed_uuid('vt-ball-col'),         seed_uuid('venue-ball'),       seed_uuid('team-col-nhl'), true, 1999),
  (seed_uuid('vt-aac-dal-nhl'),      seed_uuid('venue-aac'),        seed_uuid('team-dal-nhl'), true, 2001),
  (seed_uuid('vt-scotia-tor-nhl'),   seed_uuid('venue-scotiabank'), seed_uuid('team-tor-nhl'), true, 1999),
  (seed_uuid('vt-capitol-wsh-nhl'),  seed_uuid('venue-capitol'),    seed_uuid('team-wsh-nhl'), true, 1997),
  (seed_uuid('vt-ubs-nyi'),          seed_uuid('venue-ubs'),        seed_uuid('team-nyi'),   true,  2021),
  (seed_uuid('vt-pru-njd'),          seed_uuid('venue-pru'),        seed_uuid('team-njd'),   true,  2007),
  (seed_uuid('vt-ppg-pit'),          seed_uuid('venue-ppg'),        seed_uuid('team-pit-nhl'), true, 2010),
  (seed_uuid('vt-pnc-car'),          seed_uuid('venue-pnc-nhl'),   seed_uuid('team-car-nhl'), true, 1999),
  (seed_uuid('vt-nwa-cbj'),          seed_uuid('venue-nationwide'), seed_uuid('team-cbj'),   true,  2000),
  (seed_uuid('vt-amalie-tb'),        seed_uuid('venue-amalie'),     seed_uuid('team-tb-nhl'), true, 1996),
  (seed_uuid('vt-bell-mtl'),         seed_uuid('venue-bell'),       seed_uuid('team-mtl'),   true,  1996),
  (seed_uuid('vt-ctd-ott'),          seed_uuid('venue-ctd'),        seed_uuid('team-ott'),   true,  1996),
  (seed_uuid('vt-amerant-fla'),      seed_uuid('venue-amerant'),    seed_uuid('team-fla-nhl'), true, 1998),
  (seed_uuid('vt-keybank-buf'),      seed_uuid('venue-keybank'),    seed_uuid('team-buf-nhl'), true, 1996),
  (seed_uuid('vt-lca-det-nhl'),      seed_uuid('venue-littlecaesars'), seed_uuid('team-det-nhl'), true, 2017),
  (seed_uuid('vt-enterprise-stl'),   seed_uuid('venue-enterprise'), seed_uuid('team-stl-nhl'), true, 1994),
  (seed_uuid('vt-bridge-nsh'),       seed_uuid('venue-bridgestone'),seed_uuid('team-nsh'),   true,  1996),
  (seed_uuid('vt-xcel-min'),         seed_uuid('venue-xcel'),       seed_uuid('team-min-nhl'), true, 2000),
  (seed_uuid('vt-tmobile-vgk'),      seed_uuid('venue-tmobile'),    seed_uuid('team-vgk'),   true,  2017),
  (seed_uuid('vt-honda-ana'),        seed_uuid('venue-honda'),      seed_uuid('team-ana'),   true,  1993),
  (seed_uuid('vt-rogers-edm'),       seed_uuid('venue-rogers-nhl'), seed_uuid('team-edm'),   true,  2016),
  (seed_uuid('vt-saddle-cgy'),       seed_uuid('venue-saddledome'), seed_uuid('team-cgy'),   true,  1983),
  (seed_uuid('vt-climate-sea'),      seed_uuid('venue-climate'),    seed_uuid('team-sea-nhl'), true, 2021),
  (seed_uuid('vt-rogers-van'),       seed_uuid('venue-rogers-van'), seed_uuid('team-van'),   true,  1995),
  (seed_uuid('vt-sap-sj'),           seed_uuid('venue-sap'),        seed_uuid('team-sj'),    true,  1993),
  (seed_uuid('vt-canada-wpg'),       seed_uuid('venue-canada'),     seed_uuid('team-wpg'),   true,  2011),
  (seed_uuid('vt-delta-uta-nhl'),    seed_uuid('venue-delta'),      seed_uuid('team-ari-nhl'), true, 2024),
  -- MLS
  (seed_uuid('vt-mbs-atl-mls'),      seed_uuid('venue-mbstadium'),  seed_uuid('team-atl-mls'), true, 2017),
  (seed_uuid('vt-q2-aus'),            seed_uuid('venue-q2'),         seed_uuid('team-aus-mls'), true, 2021),
  (seed_uuid('vt-boa-cha-mls'),       seed_uuid('venue-boa'),        seed_uuid('team-cha-mls'), true, 2022),
  (seed_uuid('vt-soldier-chi-mls'),   seed_uuid('venue-soldier'),    seed_uuid('team-chi-mls'), true, 1998),
  (seed_uuid('vt-tql-cin'),           seed_uuid('venue-tql'),        seed_uuid('team-cin-mls'), true, 2021),
  (seed_uuid('vt-dicks-col'),         seed_uuid('venue-dicks'),      seed_uuid('team-col-mls'), true, 2007),
  (seed_uuid('vt-lower-clb'),         seed_uuid('venue-lowerfld'),   seed_uuid('team-clb'),    true,  2021),
  (seed_uuid('vt-toyota-dal-mls'),    seed_uuid('venue-toyota-mls'), seed_uuid('team-dal-mls'), true, 2005),
  (seed_uuid('vt-audi-dc'),           seed_uuid('venue-audi'),       seed_uuid('team-dc'),     true,  2018),
  (seed_uuid('vt-shell-hou'),         seed_uuid('venue-shellhous'),  seed_uuid('team-hou-mls'), true, 2012),
  (seed_uuid('vt-chase-mia'),         seed_uuid('venue-drivehuron'), seed_uuid('team-mia-mls'), true, 2020),
  (seed_uuid('vt-dignity-la'),        seed_uuid('venue-dignity'),    seed_uuid('team-la-mls'),  true,  2003),
  (seed_uuid('vt-bmo-lafc'),          seed_uuid('venue-bmostadium'), seed_uuid('team-lafc'),   true,  2018),
  (seed_uuid('vt-allianz-min'),       seed_uuid('venue-allianz'),    seed_uuid('team-min-mls'), true, 2019),
  (seed_uuid('vt-saputo-mtl'),        seed_uuid('venue-saputo'),     seed_uuid('team-mtl-mls'), true, 2008),
  (seed_uuid('vt-geodis-nsh'),        seed_uuid('venue-geodis'),     seed_uuid('team-nsh-mls'), true, 2022),
  (seed_uuid('vt-gillette-ne-mls'),   seed_uuid('venue-gillette'),   seed_uuid('team-ne-mls'),  true, 2002),
  (seed_uuid('vt-redbull-nyrb'),      seed_uuid('venue-redbull'),    seed_uuid('team-nyrb'),   true,  2010),
  (seed_uuid('vt-exploria-orl'),      seed_uuid('venue-exploria'),   seed_uuid('team-orl-mls'), true, 2017),
  (seed_uuid('vt-subaru-phi'),        seed_uuid('venue-subaru'),     seed_uuid('team-phi-mls'), true, 2010),
  (seed_uuid('vt-prov-por'),          seed_uuid('venue-providence'), seed_uuid('team-por-mls'), true, 2011),
  (seed_uuid('vt-rio-rsl'),           seed_uuid('venue-rio'),        seed_uuid('team-rsl'),    true,  2008),
  (seed_uuid('vt-paypal-sj'),         seed_uuid('venue-paypal'),     seed_uuid('team-sj-mls'), true, 2015),
  (seed_uuid('vt-lumen-sea-mls'),     seed_uuid('venue-lumen'),      seed_uuid('team-sea-mls'), true, 2009),
  (seed_uuid('vt-children-skc'),      seed_uuid('venue-children'),   seed_uuid('team-skc'),    true,  2011),
  (seed_uuid('vt-citypark-stl'),      seed_uuid('venue-citypark'),   seed_uuid('team-stl-mls'), true, 2023),
  (seed_uuid('vt-bmofield-tor'),      seed_uuid('venue-bmofield'),   seed_uuid('team-tor-mls'), true, 2007),
  (seed_uuid('vt-bcplace-van'),       seed_uuid('venue-bcplace'),    seed_uuid('team-van-mls'), true, 2011)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 5. ATHLETES (20+)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO athletes (id, name, sport, is_active) VALUES
  -- Football
  (seed_uuid('athlete-mahomes'),    'Patrick Mahomes',    'football',    true),
  (seed_uuid('athlete-allen'),      'Josh Allen',         'football',    true),
  (seed_uuid('athlete-hurts'),      'Jalen Hurts',        'football',    true),
  (seed_uuid('athlete-lamar'),      'Lamar Jackson',      'football',    true),
  -- Basketball
  (seed_uuid('athlete-lebron'),     'LeBron James',       'basketball',  true),
  (seed_uuid('athlete-brunson'),    'Jalen Brunson',      'basketball',  true),
  (seed_uuid('athlete-curry'),      'Stephen Curry',      'basketball',  true),
  (seed_uuid('athlete-tatum'),      'Jayson Tatum',       'basketball',  true),
  (seed_uuid('athlete-jokic'),      'Nikola Jokic',       'basketball',  true),
  (seed_uuid('athlete-sga'),        'Shai Gilgeous-Alexander', 'basketball', true),
  -- Baseball
  (seed_uuid('athlete-judge'),      'Aaron Judge',        'baseball',    true),
  (seed_uuid('athlete-ohtani'),     'Shohei Ohtani',      'baseball',    true),
  (seed_uuid('athlete-betts'),      'Mookie Betts',       'baseball',    true),
  (seed_uuid('athlete-soto'),       'Juan Soto',          'baseball',    true),
  -- Hockey
  (seed_uuid('athlete-mcdavid'),    'Connor McDavid',     'hockey',      true),
  (seed_uuid('athlete-matthews'),   'Auston Matthews',    'hockey',      true),
  (seed_uuid('athlete-makar'),      'Cale Makar',         'hockey',      true),
  -- Soccer
  (seed_uuid('athlete-messi'),      'Lionel Messi',       'soccer',      true),
  (seed_uuid('athlete-pulisic'),    'Christian Pulisic',   'soccer',      true),
  -- Golf
  (seed_uuid('athlete-scheffler'),  'Scottie Scheffler',  'golf',        true),
  (seed_uuid('athlete-mcilroy'),    'Rory McIlroy',       'golf',        true),
  (seed_uuid('athlete-rahm'),       'Jon Rahm',           'golf',        true),
  -- Motorsports
  (seed_uuid('athlete-blaney'),     'Ryan Blaney',        'motorsports', true),
  -- Tennis (for future use)
  (seed_uuid('athlete-sinner'),     'Jannik Sinner',      'tennis',      true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 6. ATHLETE-TEAM ASSOCIATIONS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO athlete_teams (id, athlete_id, team_id, league_id, season_start) VALUES
  -- Football
  (seed_uuid('at-mahomes-kc'),    seed_uuid('athlete-mahomes'),  seed_uuid('team-kc'),      seed_uuid('league-nfl'), 2017),
  (seed_uuid('at-allen-buf'),     seed_uuid('athlete-allen'),    seed_uuid('team-buf'),     seed_uuid('league-nfl'), 2018),
  (seed_uuid('at-hurts-phi'),     seed_uuid('athlete-hurts'),    seed_uuid('team-phi'),     seed_uuid('league-nfl'), 2020),
  (seed_uuid('at-lamar-bal'),     seed_uuid('athlete-lamar'),    seed_uuid('team-bal'),     seed_uuid('league-nfl'), 2018),
  -- Basketball
  (seed_uuid('at-lebron-lal'),    seed_uuid('athlete-lebron'),   seed_uuid('team-lal'),     seed_uuid('league-nba'), 2018),
  (seed_uuid('at-brunson-nyk'),   seed_uuid('athlete-brunson'),  seed_uuid('team-nyk'),     seed_uuid('league-nba'), 2022),
  (seed_uuid('at-curry-gsw'),     seed_uuid('athlete-curry'),    seed_uuid('team-gsw'),     seed_uuid('league-nba'), 2009),
  (seed_uuid('at-tatum-bos'),     seed_uuid('athlete-tatum'),    seed_uuid('team-bos-nba'), seed_uuid('league-nba'), 2017),
  (seed_uuid('at-jokic-den'),     seed_uuid('athlete-jokic'),    seed_uuid('team-den-nba'), seed_uuid('league-nba'), 2015),
  (seed_uuid('at-sga-okc'),       seed_uuid('athlete-sga'),      seed_uuid('team-okc'),     seed_uuid('league-nba'), 2019),
  -- Baseball
  (seed_uuid('at-judge-nyy'),     seed_uuid('athlete-judge'),    seed_uuid('team-nyy'),     seed_uuid('league-mlb'), 2016),
  (seed_uuid('at-ohtani-lad'),    seed_uuid('athlete-ohtani'),   seed_uuid('team-lad'),     seed_uuid('league-mlb'), 2024),
  (seed_uuid('at-betts-lad'),     seed_uuid('athlete-betts'),    seed_uuid('team-lad'),     seed_uuid('league-mlb'), 2020),
  (seed_uuid('at-soto-nym'),      seed_uuid('athlete-soto'),     seed_uuid('team-nym'),     seed_uuid('league-mlb'), 2025),
  -- Hockey
  (seed_uuid('at-mcdavid-edm'),   seed_uuid('athlete-mcdavid'),  seed_uuid('team-edm'),     seed_uuid('league-nhl'), 2015),
  (seed_uuid('at-matthews-tor'),   seed_uuid('athlete-matthews'),  seed_uuid('team-tor-nhl'), seed_uuid('league-nhl'), 2016),
  (seed_uuid('at-makar-col'),     seed_uuid('athlete-makar'),    seed_uuid('team-col-nhl'), seed_uuid('league-nhl'), 2019),
  -- Soccer
  (seed_uuid('at-messi-mia'),     seed_uuid('athlete-messi'),    seed_uuid('team-mia-mls'), seed_uuid('league-mls'), 2023),
  (seed_uuid('at-pulisic-chi'),   seed_uuid('athlete-pulisic'),  seed_uuid('team-chi-mls'), seed_uuid('league-mls'), 2025)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 7. EVENTS (150+ across all leagues, Feb 2025 - Feb 2026)
-- ═══════════════════════════════════════════════════════════════

-- ─── NFL EVENTS (2024 season = plays in 2024-2025, 2025 season = plays 2025-2026) ───
INSERT INTO events (id, league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, round_or_stage, venue_name_at_time, headline, is_postseason) VALUES
  -- 2024 NFL Playoffs (Jan-Feb 2025)
  (seed_uuid('evt-nfl-wc1'), seed_uuid('league-nfl'), seed_uuid('venue-highmark'), '2025-01-12', 'match', seed_uuid('team-buf'), seed_uuid('team-den'), 31, 7, false, 2024, 'Wild Card', 'Highmark Stadium', 'Allen 3 TDs as Bills cruise past Broncos', true),
  (seed_uuid('evt-nfl-wc2'), seed_uuid('league-nfl'), seed_uuid('venue-lincoln'), '2025-01-12', 'match', seed_uuid('team-phi'), seed_uuid('team-gb'), 22, 10, false, 2024, 'Wild Card', 'Lincoln Financial Field', 'Eagles defense dominates Packers', true),
  (seed_uuid('evt-nfl-wc3'), seed_uuid('league-nfl'), seed_uuid('venue-mandt'), '2025-01-11', 'match', seed_uuid('team-bal'), seed_uuid('team-pit'), 28, 14, false, 2024, 'Wild Card', 'M&T Bank Stadium', 'Lamar Jackson dazzles in playoff opener', true),
  (seed_uuid('evt-nfl-div1'), seed_uuid('league-nfl'), seed_uuid('venue-arrowhead'), '2025-01-18', 'match', seed_uuid('team-kc'), seed_uuid('team-hou'), 23, 14, false, 2024, 'Divisional', 'GEHA Field at Arrowhead Stadium', 'Mahomes leads Chiefs to divisional win', true),
  (seed_uuid('evt-nfl-div2'), seed_uuid('league-nfl'), seed_uuid('venue-highmark'), '2025-01-19', 'match', seed_uuid('team-buf'), seed_uuid('team-bal'), 27, 25, false, 2024, 'Divisional', 'Highmark Stadium', 'Bills survive Ravens thriller', true),
  (seed_uuid('evt-nfl-nfcc'), seed_uuid('league-nfl'), seed_uuid('venue-lincoln'), '2025-01-26', 'match', seed_uuid('team-phi'), seed_uuid('team-was'), 55, 23, false, 2024, 'NFC Championship', 'Lincoln Financial Field', 'Eagles demolish Commanders for NFC title', true),
  (seed_uuid('evt-nfl-afcc'), seed_uuid('league-nfl'), seed_uuid('venue-arrowhead'), '2025-01-26', 'match', seed_uuid('team-kc'), seed_uuid('team-buf'), 32, 29, false, 2024, 'AFC Championship', 'GEHA Field at Arrowhead Stadium', 'Chiefs edge Bills in overtime classic', true),
  (seed_uuid('evt-nfl-sb'), seed_uuid('league-nfl'), seed_uuid('venue-caesars'), '2025-02-09', 'match', seed_uuid('team-phi'), seed_uuid('team-kc'), 40, 22, false, 2024, 'Super Bowl LIX', 'Caesars Superdome', 'Eagles dominate Chiefs for Super Bowl title', true),
  -- 2025 NFL Regular Season (Sep-Dec 2025)
  (seed_uuid('evt-nfl-rs1'), seed_uuid('league-nfl'), seed_uuid('venue-arrowhead'), '2025-09-05', 'match', seed_uuid('team-kc'), seed_uuid('team-bal'), 27, 20, false, 2025, 'Week 1', 'GEHA Field at Arrowhead Stadium', 'Chiefs open season with win over Ravens', false),
  (seed_uuid('evt-nfl-rs2'), seed_uuid('league-nfl'), seed_uuid('venue-metlife'), '2025-09-07', 'match', seed_uuid('team-nyg'), seed_uuid('team-min'), 17, 24, false, 2025, 'Week 1', 'MetLife Stadium', 'Vikings spoil Giants home opener', false),
  (seed_uuid('evt-nfl-rs3'), seed_uuid('league-nfl'), seed_uuid('venue-metlife'), '2025-09-07', 'match', seed_uuid('team-nyj'), seed_uuid('team-sf'), 19, 23, false, 2025, 'Week 1', 'MetLife Stadium', '49ers hold off Jets', false),
  (seed_uuid('evt-nfl-rs4'), seed_uuid('league-nfl'), seed_uuid('venue-lincoln'), '2025-09-08', 'match', seed_uuid('team-phi'), seed_uuid('team-gb'), 34, 29, false, 2025, 'Week 1', 'Lincoln Financial Field', 'Hurts 4 TDs in Monday Night opener', false),
  (seed_uuid('evt-nfl-rs5'), seed_uuid('league-nfl'), seed_uuid('venue-sofi'), '2025-09-14', 'match', seed_uuid('team-lar'), seed_uuid('team-ari'), 27, 17, false, 2025, 'Week 2', 'SoFi Stadium', 'Rams handle Cardinals at home', false),
  (seed_uuid('evt-nfl-rs6'), seed_uuid('league-nfl'), seed_uuid('venue-att'), '2025-09-14', 'match', seed_uuid('team-dal'), seed_uuid('team-no'), 21, 24, false, 2025, 'Week 2', 'AT&T Stadium', 'Saints stun Cowboys in Arlington', false),
  (seed_uuid('evt-nfl-rs7'), seed_uuid('league-nfl'), seed_uuid('venue-highmark'), '2025-09-21', 'match', seed_uuid('team-buf'), seed_uuid('team-mia'), 31, 10, false, 2025, 'Week 3', 'Highmark Stadium', 'Allen dominates Dolphins', false),
  (seed_uuid('evt-nfl-rs8'), seed_uuid('league-nfl'), seed_uuid('venue-acrisure'), '2025-09-28', 'match', seed_uuid('team-pit'), seed_uuid('team-dal'), 20, 17, false, 2025, 'Week 4', 'Acrisure Stadium', 'Steelers edge Cowboys in defensive battle', false),
  (seed_uuid('evt-nfl-rs9'), seed_uuid('league-nfl'), seed_uuid('venue-lambeau'), '2025-10-05', 'match', seed_uuid('team-gb'), seed_uuid('team-lar'), 28, 21, false, 2025, 'Week 5', 'Lambeau Field', 'Packers rally in fourth quarter', false),
  (seed_uuid('evt-nfl-rs10'), seed_uuid('league-nfl'), seed_uuid('venue-levis'), '2025-10-12', 'match', seed_uuid('team-sf'), seed_uuid('team-sea'), 23, 20, false, 2025, 'Week 6', 'Levi''s Stadium', '49ers survive Seahawks in OT', false),
  (seed_uuid('evt-nfl-rs11'), seed_uuid('league-nfl'), seed_uuid('venue-mbstadium'), '2025-10-19', 'match', seed_uuid('team-atl'), seed_uuid('team-tb'), 35, 28, false, 2025, 'Week 7', 'Mercedes-Benz Stadium', 'Falcons-Bucs shootout goes to Atlanta', false),
  (seed_uuid('evt-nfl-rs12'), seed_uuid('league-nfl'), seed_uuid('venue-empower'), '2025-10-26', 'match', seed_uuid('team-den'), seed_uuid('team-car'), 17, 10, false, 2025, 'Week 8', 'Empower Field at Mile High', 'Broncos grind out win vs Panthers', false),
  (seed_uuid('evt-nfl-rs13'), seed_uuid('league-nfl'), seed_uuid('venue-usbank'), '2025-11-02', 'match', seed_uuid('team-min'), seed_uuid('team-chi'), 27, 13, false, 2025, 'Week 9', 'U.S. Bank Stadium', 'Vikings cruise past Bears', false),
  (seed_uuid('evt-nfl-rs14'), seed_uuid('league-nfl'), seed_uuid('venue-ford'), '2025-11-09', 'match', seed_uuid('team-det'), seed_uuid('team-gb'), 31, 27, false, 2025, 'Week 10', 'Ford Field', 'Lions hold off Packers in NFC North clash', false),
  (seed_uuid('evt-nfl-rs15'), seed_uuid('league-nfl'), seed_uuid('venue-hardrock'), '2025-11-16', 'match', seed_uuid('team-mia'), seed_uuid('team-lv'), 24, 20, false, 2025, 'Week 11', 'Hard Rock Stadium', 'Dolphins handle Raiders', false),
  (seed_uuid('evt-nfl-rs16'), seed_uuid('league-nfl'), seed_uuid('venue-lucas'), '2025-11-23', 'match', seed_uuid('team-ind'), seed_uuid('team-ten'), 28, 14, false, 2025, 'Week 12', 'Lucas Oil Stadium', 'Colts dominate Titans', false),
  (seed_uuid('evt-nfl-rs17'), seed_uuid('league-nfl'), seed_uuid('venue-huntington'), '2025-11-27', 'match', seed_uuid('team-cle'), seed_uuid('team-pit'), 14, 21, false, 2025, 'Week 13', 'Huntington Bank Field', 'Steelers win Thanksgiving rivalry game', false),
  (seed_uuid('evt-nfl-rs18'), seed_uuid('league-nfl'), seed_uuid('venue-caesars'), '2025-12-07', 'match', seed_uuid('team-no'), seed_uuid('team-car'), 31, 13, false, 2025, 'Week 14', 'Caesars Superdome', 'Saints dominate Panthers at home', false),
  (seed_uuid('evt-nfl-rs19'), seed_uuid('league-nfl'), seed_uuid('venue-nrg'), '2025-12-14', 'match', seed_uuid('team-hou'), seed_uuid('team-kc'), 20, 23, false, 2025, 'Week 15', 'NRG Stadium', 'Mahomes clutch drive sinks Texans', false),
  (seed_uuid('evt-nfl-rs20'), seed_uuid('league-nfl'), seed_uuid('venue-soldier'), '2025-12-21', 'match', seed_uuid('team-chi'), seed_uuid('team-det'), 19, 34, false, 2025, 'Week 16', 'Soldier Field', 'Lions rout Bears in Chicago', false),
  (seed_uuid('evt-nfl-rs21'), seed_uuid('league-nfl'), seed_uuid('venue-stfarm'), '2025-12-28', 'match', seed_uuid('team-ari'), seed_uuid('team-sf'), 17, 24, false, 2025, 'Week 17', 'State Farm Stadium', '49ers clinch wild card in Arizona', false)
ON CONFLICT DO NOTHING;

-- ─── NBA EVENTS (2024-25 season and 2025-26 season) ───
INSERT INTO events (id, league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, round_or_stage, venue_name_at_time, headline, is_postseason) VALUES
  -- 2024-25 NBA Regular Season
  (seed_uuid('evt-nba-1'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2025-02-14', 'match', seed_uuid('team-nyk'), seed_uuid('team-bos-nba'), 118, 112, false, 2024, 'Regular Season', 'Madison Square Garden', 'Brunson 38 pts as Knicks top Celtics', false),
  (seed_uuid('evt-nba-2'), seed_uuid('league-nba'), seed_uuid('venue-crypto'), '2025-02-20', 'match', seed_uuid('team-lal'), seed_uuid('team-gsw'), 121, 115, false, 2024, 'Regular Season', 'Crypto.com Arena', 'LeBron triple-double sinks Warriors', false),
  (seed_uuid('evt-nba-3'), seed_uuid('league-nba'), seed_uuid('venue-chase'), '2025-03-05', 'match', seed_uuid('team-gsw'), seed_uuid('team-lal'), 108, 102, false, 2024, 'Regular Season', 'Chase Center', 'Curry 35 pts, Warriors even series', false),
  (seed_uuid('evt-nba-4'), seed_uuid('league-nba'), seed_uuid('venue-united'), '2025-03-08', 'match', seed_uuid('team-chi-nba'), seed_uuid('team-mil'), 105, 110, false, 2024, 'Regular Season', 'United Center', 'Bucks edge Bulls at United Center', false),
  (seed_uuid('evt-nba-5'), seed_uuid('league-nba'), seed_uuid('venue-tdgarden'), '2025-03-12', 'match', seed_uuid('team-bos-nba'), seed_uuid('team-phi-nba'), 125, 108, false, 2024, 'Regular Season', 'TD Garden', 'Tatum 42 pts in Celtics blowout', false),
  (seed_uuid('evt-nba-6'), seed_uuid('league-nba'), seed_uuid('venue-wells'), '2025-03-19', 'match', seed_uuid('team-phi-nba'), seed_uuid('team-nyk'), 101, 109, false, 2024, 'Regular Season', 'Wells Fargo Center', 'Knicks win in Philly behind Brunson', false),
  (seed_uuid('evt-nba-7'), seed_uuid('league-nba'), seed_uuid('venue-ball'), '2025-03-22', 'match', seed_uuid('team-den-nba'), seed_uuid('team-min-nba'), 118, 107, false, 2024, 'Regular Season', 'Ball Arena', 'Jokic 30-12-11 triple-double', false),
  (seed_uuid('evt-nba-8'), seed_uuid('league-nba'), seed_uuid('venue-paycom'), '2025-03-28', 'match', seed_uuid('team-okc'), seed_uuid('team-dal-nba'), 127, 117, false, 2024, 'Regular Season', 'Paycom Center', 'SGA 41 pts leads Thunder', false),
  (seed_uuid('evt-nba-9'), seed_uuid('league-nba'), seed_uuid('venue-aaa'), '2025-04-02', 'match', seed_uuid('team-mia-nba'), seed_uuid('team-bos-nba'), 95, 112, false, 2024, 'Regular Season', 'Kaseya Center', 'Celtics cruise past Heat in Miami', false),
  (seed_uuid('evt-nba-10'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2025-04-05', 'match', seed_uuid('team-nyk'), seed_uuid('team-mia-nba'), 114, 98, false, 2024, 'Regular Season', 'Madison Square Garden', 'Knicks clinch playoff berth', false),
  -- 2024-25 NBA Playoffs
  (seed_uuid('evt-nba-p1'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2025-04-20', 'match', seed_uuid('team-nyk'), seed_uuid('team-orl'), 112, 95, false, 2024, 'First Round G1', 'Madison Square Garden', 'Knicks roll in playoff opener', true),
  (seed_uuid('evt-nba-p2'), seed_uuid('league-nba'), seed_uuid('venue-tdgarden'), '2025-04-21', 'match', seed_uuid('team-bos-nba'), seed_uuid('team-mia-nba'), 120, 105, false, 2024, 'First Round G1', 'TD Garden', 'Celtics handle Heat in Game 1', true),
  (seed_uuid('evt-nba-p3'), seed_uuid('league-nba'), seed_uuid('venue-paycom'), '2025-04-22', 'match', seed_uuid('team-okc'), seed_uuid('team-den-nba'), 115, 108, false, 2024, 'First Round G1', 'Paycom Center', 'Thunder survive Nuggets', true),
  (seed_uuid('evt-nba-p4'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2025-05-05', 'match', seed_uuid('team-nyk'), seed_uuid('team-ind-nba'), 108, 104, false, 2024, 'Second Round G1', 'Madison Square Garden', 'Brunson clutch in MSG', true),
  (seed_uuid('evt-nba-p5'), seed_uuid('league-nba'), seed_uuid('venue-tdgarden'), '2025-05-15', 'match', seed_uuid('team-bos-nba'), seed_uuid('team-nyk'), 98, 105, false, 2024, 'ECF G1', 'TD Garden', 'Knicks steal Game 1 in Boston', true),
  (seed_uuid('evt-nba-p6'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2025-05-19', 'match', seed_uuid('team-nyk'), seed_uuid('team-bos-nba'), 112, 109, false, 2024, 'ECF G3', 'Madison Square Garden', 'MSG erupts as Knicks take 2-1 lead', true),
  (seed_uuid('evt-nba-p7'), seed_uuid('league-nba'), seed_uuid('venue-paycom'), '2025-06-05', 'match', seed_uuid('team-okc'), seed_uuid('team-nyk'), 110, 104, false, 2024, 'NBA Finals G1', 'Paycom Center', 'Thunder win Finals opener at home', true),
  (seed_uuid('evt-nba-p8'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2025-06-12', 'match', seed_uuid('team-nyk'), seed_uuid('team-okc'), 118, 110, false, 2024, 'NBA Finals G3', 'Madison Square Garden', 'Brunson 45 pts, Knicks take Finals lead', true),
  -- 2025-26 NBA Regular Season
  (seed_uuid('evt-nba-11'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2025-10-22', 'match', seed_uuid('team-nyk'), seed_uuid('team-bos-nba'), 110, 107, false, 2025, 'Regular Season', 'Madison Square Garden', 'Knicks open season with win over Celtics', false),
  (seed_uuid('evt-nba-12'), seed_uuid('league-nba'), seed_uuid('venue-crypto'), '2025-10-22', 'match', seed_uuid('team-lal'), seed_uuid('team-min-nba'), 115, 105, false, 2025, 'Regular Season', 'Crypto.com Arena', 'Lakers cruise in season opener', false),
  (seed_uuid('evt-nba-13'), seed_uuid('league-nba'), seed_uuid('venue-chase'), '2025-10-24', 'match', seed_uuid('team-gsw'), seed_uuid('team-por'), 122, 99, false, 2025, 'Regular Season', 'Chase Center', 'Warriors rout Blazers', false),
  (seed_uuid('evt-nba-14'), seed_uuid('league-nba'), seed_uuid('venue-barclays'), '2025-11-05', 'match', seed_uuid('team-bkn'), seed_uuid('team-nyk'), 97, 114, false, 2025, 'Regular Season', 'Barclays Center', 'Knicks dominate crosstown rivals', false),
  (seed_uuid('evt-nba-15'), seed_uuid('league-nba'), seed_uuid('venue-fiserv'), '2025-11-12', 'match', seed_uuid('team-mil'), seed_uuid('team-chi-nba'), 119, 104, false, 2025, 'Regular Season', 'Fiserv Forum', 'Bucks roll over Bulls', false),
  (seed_uuid('evt-nba-16'), seed_uuid('league-nba'), seed_uuid('venue-aac'), '2025-11-18', 'match', seed_uuid('team-dal-nba'), seed_uuid('team-hou-nba'), 125, 118, false, 2025, 'Regular Season', 'American Airlines Center', 'Mavs edge Rockets in OT', false),
  (seed_uuid('evt-nba-17'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2025-12-05', 'match', seed_uuid('team-nyk'), seed_uuid('team-lal'), 128, 120, false, 2025, 'Regular Season', 'Madison Square Garden', 'Brunson outduels LeBron at MSG', false),
  (seed_uuid('evt-nba-18'), seed_uuid('league-nba'), seed_uuid('venue-scotiabank'), '2025-12-15', 'match', seed_uuid('team-tor'), seed_uuid('team-bos-nba'), 99, 115, false, 2025, 'Regular Season', 'Scotiabank Arena', 'Celtics handle Raptors in Toronto', false),
  (seed_uuid('evt-nba-19'), seed_uuid('league-nba'), seed_uuid('venue-footprint'), '2025-12-20', 'match', seed_uuid('team-phx'), seed_uuid('team-gsw'), 112, 108, false, 2025, 'Regular Season', 'Footprint Center', 'Suns hold off Warriors', false),
  (seed_uuid('evt-nba-20'), seed_uuid('league-nba'), seed_uuid('venue-msg'), '2026-01-10', 'match', seed_uuid('team-nyk'), seed_uuid('team-phi-nba'), 116, 103, false, 2025, 'Regular Season', 'Madison Square Garden', 'Knicks cruise past 76ers', false),
  (seed_uuid('evt-nba-21'), seed_uuid('league-nba'), seed_uuid('venue-crypto'), '2026-01-15', 'match', seed_uuid('team-lal'), seed_uuid('team-den-nba'), 108, 113, false, 2025, 'Regular Season', 'Crypto.com Arena', 'Jokic dominates Lakers', false),
  (seed_uuid('evt-nba-22'), seed_uuid('league-nba'), seed_uuid('venue-intuit'), '2026-01-25', 'match', seed_uuid('team-lac-nba'), seed_uuid('team-phx'), 105, 99, false, 2025, 'Regular Season', 'Intuit Dome', 'Clippers win at new arena', false),
  (seed_uuid('evt-nba-23'), seed_uuid('league-nba'), seed_uuid('venue-united'), '2026-02-01', 'match', seed_uuid('team-chi-nba'), seed_uuid('team-nyk'), 102, 110, false, 2025, 'Regular Season', 'United Center', 'Knicks win in Chicago', false)
ON CONFLICT DO NOTHING;

-- ─── MLB EVENTS (2025 season: Apr-Oct) ───
INSERT INTO events (id, league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, round_or_stage, venue_name_at_time, headline, is_postseason) VALUES
  (seed_uuid('evt-mlb-1'), seed_uuid('league-mlb'), seed_uuid('venue-yankee'), '2025-03-27', 'match', seed_uuid('team-nyy'), seed_uuid('team-hou-mlb'), 5, 2, false, 2025, 'Opening Day', 'Yankee Stadium', 'Judge HR on Opening Day', false),
  (seed_uuid('evt-mlb-2'), seed_uuid('league-mlb'), seed_uuid('venue-dodger'), '2025-03-27', 'match', seed_uuid('team-lad'), seed_uuid('team-chc'), 8, 3, false, 2025, 'Opening Day', 'Dodger Stadium', 'Ohtani 2-HR day as Dodgers open in style', false),
  (seed_uuid('evt-mlb-3'), seed_uuid('league-mlb'), seed_uuid('venue-citi'), '2025-03-27', 'match', seed_uuid('team-nym'), seed_uuid('team-atl-mlb'), 4, 1, false, 2025, 'Opening Day', 'Citi Field', 'Soto delivers in Mets debut', false),
  (seed_uuid('evt-mlb-4'), seed_uuid('league-mlb'), seed_uuid('venue-fenway'), '2025-03-28', 'match', seed_uuid('team-bos-mlb'), seed_uuid('team-tor-mlb'), 7, 4, false, 2025, 'Regular Season', 'Fenway Park', 'Red Sox win Fenway opener', false),
  (seed_uuid('evt-mlb-5'), seed_uuid('league-mlb'), seed_uuid('venue-wrigley'), '2025-04-05', 'match', seed_uuid('team-chc'), seed_uuid('team-mil-mlb'), 3, 5, false, 2025, 'Regular Season', 'Wrigley Field', 'Brewers spoil Cubs home opener', false),
  (seed_uuid('evt-mlb-6'), seed_uuid('league-mlb'), seed_uuid('venue-pnc'), '2025-04-12', 'match', seed_uuid('team-pit-mlb'), seed_uuid('team-chc'), 6, 3, false, 2025, 'Regular Season', 'PNC Park', 'Pirates handle Cubs at PNC Park', false),
  (seed_uuid('evt-mlb-7'), seed_uuid('league-mlb'), seed_uuid('venue-yankee'), '2025-04-18', 'match', seed_uuid('team-nyy'), seed_uuid('team-bos-mlb'), 7, 6, false, 2025, 'Regular Season', 'Yankee Stadium', 'Judge walk-off HR vs Red Sox', false),
  (seed_uuid('evt-mlb-8'), seed_uuid('league-mlb'), seed_uuid('venue-citizens'), '2025-04-25', 'match', seed_uuid('team-phi-mlb'), seed_uuid('team-nym'), 5, 8, false, 2025, 'Regular Season', 'Citizens Bank Park', 'Mets rally to beat Phillies', false),
  (seed_uuid('evt-mlb-9'), seed_uuid('league-mlb'), seed_uuid('venue-oracle'), '2025-05-02', 'match', seed_uuid('team-sf-mlb'), seed_uuid('team-lad'), 2, 6, false, 2025, 'Regular Season', 'Oracle Park', 'Ohtani dominates at Oracle Park', false),
  (seed_uuid('evt-mlb-10'), seed_uuid('league-mlb'), seed_uuid('venue-minute'), '2025-05-10', 'match', seed_uuid('team-hou-mlb'), seed_uuid('team-nyy'), 4, 5, false, 2025, 'Regular Season', 'Minute Maid Park', 'Yankees edge Astros', false),
  (seed_uuid('evt-mlb-11'), seed_uuid('league-mlb'), seed_uuid('venue-dodger'), '2025-05-17', 'match', seed_uuid('team-lad'), seed_uuid('team-sd'), 11, 3, false, 2025, 'Regular Season', 'Dodger Stadium', 'Dodgers blast Padres', false),
  (seed_uuid('evt-mlb-12'), seed_uuid('league-mlb'), seed_uuid('venue-truist'), '2025-05-24', 'match', seed_uuid('team-atl-mlb'), seed_uuid('team-phi-mlb'), 6, 4, false, 2025, 'Regular Season', 'Truist Park', 'Braves edge Phillies', false),
  (seed_uuid('evt-mlb-13'), seed_uuid('league-mlb'), seed_uuid('venue-camden'), '2025-05-31', 'match', seed_uuid('team-bal-mlb'), seed_uuid('team-nyy'), 3, 7, false, 2025, 'Regular Season', 'Camden Yards', 'Judge 3-HR game at Camden', false),
  (seed_uuid('evt-mlb-14'), seed_uuid('league-mlb'), seed_uuid('venue-citi'), '2025-06-07', 'match', seed_uuid('team-nym'), seed_uuid('team-lad'), 5, 4, false, 2025, 'Regular Season', 'Citi Field', 'Mets walk-off vs Dodgers', false),
  (seed_uuid('evt-mlb-15'), seed_uuid('league-mlb'), seed_uuid('venue-petco'), '2025-06-14', 'match', seed_uuid('team-sd'), seed_uuid('team-sf-mlb'), 8, 2, false, 2025, 'Regular Season', 'Petco Park', 'Padres rout Giants', false),
  (seed_uuid('evt-mlb-16'), seed_uuid('league-mlb'), seed_uuid('venue-pnc'), '2025-06-14', 'match', seed_uuid('team-pit-mlb'), seed_uuid('team-nyy'), 7, 4, false, 2025, 'Regular Season', 'PNC Park', 'Pirates top Yankees at PNC Park', false),
  (seed_uuid('evt-mlb-17'), seed_uuid('league-mlb'), seed_uuid('venue-busch'), '2025-06-21', 'match', seed_uuid('team-stl'), seed_uuid('team-chc'), 4, 6, false, 2025, 'Regular Season', 'Busch Stadium', 'Cubs take rivalry game in St. Louis', false),
  (seed_uuid('evt-mlb-18'), seed_uuid('league-mlb'), seed_uuid('venue-yankee'), '2025-06-28', 'match', seed_uuid('team-nyy'), seed_uuid('team-nym'), 3, 5, false, 2025, 'Subway Series', 'Yankee Stadium', 'Mets take Subway Series opener', false),
  (seed_uuid('evt-mlb-19'), seed_uuid('league-mlb'), seed_uuid('venue-citi'), '2025-06-29', 'match', seed_uuid('team-nym'), seed_uuid('team-nyy'), 8, 2, false, 2025, 'Subway Series', 'Citi Field', 'Soto homers in Subway Series', false),
  (seed_uuid('evt-mlb-20'), seed_uuid('league-mlb'), seed_uuid('venue-fenway'), '2025-07-04', 'match', seed_uuid('team-bos-mlb'), seed_uuid('team-nyy'), 6, 8, false, 2025, 'Regular Season', 'Fenway Park', 'Yankees spoil 4th of July at Fenway', false),
  (seed_uuid('evt-mlb-21'), seed_uuid('league-mlb'), seed_uuid('venue-dodger'), '2025-07-12', 'match', seed_uuid('team-lad'), seed_uuid('team-nym'), 4, 3, false, 2025, 'Regular Season', 'Dodger Stadium', 'Betts walk-off single for Dodgers', false),
  (seed_uuid('evt-mlb-22'), seed_uuid('league-mlb'), seed_uuid('venue-progressive'), '2025-07-18', 'match', seed_uuid('team-cle-mlb'), seed_uuid('team-det-mlb'), 3, 1, false, 2025, 'Regular Season', 'Progressive Field', 'Guardians shut down Tigers', false),
  (seed_uuid('evt-mlb-23'), seed_uuid('league-mlb'), seed_uuid('venue-coors'), '2025-07-25', 'match', seed_uuid('team-col'), seed_uuid('team-ari-mlb'), 12, 9, false, 2025, 'Regular Season', 'Coors Field', 'Coors slugfest goes to Rockies', false),
  (seed_uuid('evt-mlb-24'), seed_uuid('league-mlb'), seed_uuid('venue-globe'), '2025-08-02', 'match', seed_uuid('team-tex'), seed_uuid('team-hou-mlb'), 5, 7, false, 2025, 'Regular Season', 'Globe Life Field', 'Astros prevail in Texas rivalry', false),
  (seed_uuid('evt-mlb-25'), seed_uuid('league-mlb'), seed_uuid('venue-yankee'), '2025-08-09', 'match', seed_uuid('team-nyy'), seed_uuid('team-tb-mlb'), 9, 1, false, 2025, 'Regular Season', 'Yankee Stadium', 'Judge goes yard twice vs Rays', false),
  (seed_uuid('evt-mlb-26'), seed_uuid('league-mlb'), seed_uuid('venue-wrigley'), '2025-08-16', 'match', seed_uuid('team-chc'), seed_uuid('team-stl'), 5, 4, false, 2025, 'Regular Season', 'Wrigley Field', 'Cubs walk-off vs Cardinals', false),
  (seed_uuid('evt-mlb-27'), seed_uuid('league-mlb'), seed_uuid('venue-pnc'), '2025-08-23', 'match', seed_uuid('team-pit-mlb'), seed_uuid('team-cin-mlb'), 4, 2, false, 2025, 'Regular Season', 'PNC Park', 'Pirates edge Reds at beautiful PNC', false),
  (seed_uuid('evt-mlb-28'), seed_uuid('league-mlb'), seed_uuid('venue-target-mlb'), '2025-08-30', 'match', seed_uuid('team-min-mlb'), seed_uuid('team-cle-mlb'), 6, 5, false, 2025, 'Regular Season', 'Target Field', 'Twins walk-off in extras', false),
  (seed_uuid('evt-mlb-29'), seed_uuid('league-mlb'), seed_uuid('venue-dodger'), '2025-09-06', 'match', seed_uuid('team-lad'), seed_uuid('team-nym'), 3, 5, false, 2025, 'Regular Season', 'Dodger Stadium', 'Mets gain on Dodgers in NL race', false),
  (seed_uuid('evt-mlb-30'), seed_uuid('league-mlb'), seed_uuid('venue-yankee'), '2025-09-14', 'match', seed_uuid('team-nyy'), seed_uuid('team-bal-mlb'), 6, 2, false, 2025, 'Regular Season', 'Yankee Stadium', 'Yankees clinch AL East', false),
  -- MLB Postseason
  (seed_uuid('evt-mlb-p1'), seed_uuid('league-mlb'), seed_uuid('venue-yankee'), '2025-10-01', 'match', seed_uuid('team-nyy'), seed_uuid('team-kc-mlb'), 4, 1, false, 2025, 'ALDS G1', 'Yankee Stadium', 'Yankees win ALDS opener', true),
  (seed_uuid('evt-mlb-p2'), seed_uuid('league-mlb'), seed_uuid('venue-dodger'), '2025-10-01', 'match', seed_uuid('team-lad'), seed_uuid('team-atl-mlb'), 6, 3, false, 2025, 'NLDS G1', 'Dodger Stadium', 'Ohtani leads Dodgers in NLDS', true),
  (seed_uuid('evt-mlb-p3'), seed_uuid('league-mlb'), seed_uuid('venue-citi'), '2025-10-02', 'match', seed_uuid('team-nym'), seed_uuid('team-mil-mlb'), 5, 2, false, 2025, 'NLDS G1', 'Citi Field', 'Mets dominate Brewers in Game 1', true),
  (seed_uuid('evt-mlb-p4'), seed_uuid('league-mlb'), seed_uuid('venue-yankee'), '2025-10-14', 'match', seed_uuid('team-nyy'), seed_uuid('team-cle-mlb'), 7, 3, false, 2025, 'ALCS G1', 'Yankee Stadium', 'Judge homer powers ALCS start', true),
  (seed_uuid('evt-mlb-p5'), seed_uuid('league-mlb'), seed_uuid('venue-citi'), '2025-10-15', 'match', seed_uuid('team-nym'), seed_uuid('team-lad'), 4, 3, false, 2025, 'NLCS G1', 'Citi Field', 'Mets edge Dodgers in NLCS opener', true),
  (seed_uuid('evt-mlb-p6'), seed_uuid('league-mlb'), seed_uuid('venue-yankee'), '2025-10-28', 'match', seed_uuid('team-nyy'), seed_uuid('team-nym'), 5, 3, false, 2025, 'World Series G1', 'Yankee Stadium', 'Subway Series opens at Yankee Stadium', true),
  (seed_uuid('evt-mlb-p7'), seed_uuid('league-mlb'), seed_uuid('venue-citi'), '2025-10-30', 'match', seed_uuid('team-nym'), seed_uuid('team-nyy'), 8, 4, false, 2025, 'World Series G3', 'Citi Field', 'Mets blast Yankees in WS Game 3', true)
ON CONFLICT DO NOTHING;

-- ─── NHL EVENTS (2024-25 season and 2025-26 season) ───
INSERT INTO events (id, league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, round_or_stage, venue_name_at_time, headline, is_postseason) VALUES
  -- 2024-25 NHL Regular Season
  (seed_uuid('evt-nhl-1'), seed_uuid('league-nhl'), seed_uuid('venue-msg'), '2025-02-08', 'match', seed_uuid('team-nyr'), seed_uuid('team-nyi'), 4, 2, false, 2024, 'Regular Season', 'Madison Square Garden', 'Rangers top Islanders in rivalry game', false),
  (seed_uuid('evt-nhl-2'), seed_uuid('league-nhl'), seed_uuid('venue-tdgarden'), '2025-02-15', 'match', seed_uuid('team-bos-nhl'), seed_uuid('team-tor-nhl'), 3, 5, false, 2024, 'Regular Season', 'TD Garden', 'Matthews scores twice in Leafs win', false),
  (seed_uuid('evt-nhl-3'), seed_uuid('league-nhl'), seed_uuid('venue-united'), '2025-02-22', 'match', seed_uuid('team-chi-nhl'), seed_uuid('team-col-nhl'), 1, 4, false, 2024, 'Regular Season', 'United Center', 'Makar dazzles in Avs rout', false),
  (seed_uuid('evt-nhl-4'), seed_uuid('league-nhl'), seed_uuid('venue-crypto'), '2025-03-01', 'match', seed_uuid('team-la-nhl'), seed_uuid('team-edm'), 2, 5, false, 2024, 'Regular Season', 'Crypto.com Arena', 'McDavid hat trick sinks Kings', false),
  (seed_uuid('evt-nhl-5'), seed_uuid('league-nhl'), seed_uuid('venue-ball'), '2025-03-08', 'match', seed_uuid('team-col-nhl'), seed_uuid('team-dal-nhl'), 3, 2, false, 2024, 'Regular Season', 'Ball Arena', 'Avs edge Stars in OT', false),
  (seed_uuid('evt-nhl-6'), seed_uuid('league-nhl'), seed_uuid('venue-ppg'), '2025-03-15', 'match', seed_uuid('team-pit-nhl'), seed_uuid('team-phi-nhl'), 4, 3, false, 2024, 'Regular Season', 'PPG Paints Arena', 'Penguins win Pennsylvania rivalry', false),
  (seed_uuid('evt-nhl-7'), seed_uuid('league-nhl'), seed_uuid('venue-amerant'), '2025-03-22', 'match', seed_uuid('team-fla-nhl'), seed_uuid('team-tb-nhl'), 5, 2, false, 2024, 'Regular Season', 'Amerant Bank Arena', 'Panthers dominate Lightning', false),
  (seed_uuid('evt-nhl-8'), seed_uuid('league-nhl'), seed_uuid('venue-pru'), '2025-03-29', 'match', seed_uuid('team-njd'), seed_uuid('team-nyr'), 2, 3, false, 2024, 'Regular Season', 'Prudential Center', 'Rangers edge Devils in Hudson derby', false),
  -- 2024-25 NHL Playoffs
  (seed_uuid('evt-nhl-p1'), seed_uuid('league-nhl'), seed_uuid('venue-amerant'), '2025-04-19', 'match', seed_uuid('team-fla-nhl'), seed_uuid('team-tor-nhl'), 4, 1, false, 2024, 'First Round G1', 'Amerant Bank Arena', 'Panthers roll past Leafs', true),
  (seed_uuid('evt-nhl-p2'), seed_uuid('league-nhl'), seed_uuid('venue-msg'), '2025-04-20', 'match', seed_uuid('team-nyr'), seed_uuid('team-wsh-nhl'), 3, 2, false, 2024, 'First Round G1', 'Madison Square Garden', 'Rangers survive Caps in OT', true),
  (seed_uuid('evt-nhl-p3'), seed_uuid('league-nhl'), seed_uuid('venue-rogers-nhl'), '2025-04-21', 'match', seed_uuid('team-edm'), seed_uuid('team-la-nhl'), 5, 3, false, 2024, 'First Round G1', 'Rogers Place', 'McDavid powers Oilers in playoff opener', true),
  -- 2025-26 NHL Regular Season
  (seed_uuid('evt-nhl-9'), seed_uuid('league-nhl'), seed_uuid('venue-msg'), '2025-10-08', 'match', seed_uuid('team-nyr'), seed_uuid('team-pit-nhl'), 3, 1, false, 2025, 'Regular Season', 'Madison Square Garden', 'Rangers win season opener', false),
  (seed_uuid('evt-nhl-10'), seed_uuid('league-nhl'), seed_uuid('venue-scotiabank'), '2025-10-15', 'match', seed_uuid('team-tor-nhl'), seed_uuid('team-mtl'), 4, 2, false, 2025, 'Regular Season', 'Scotiabank Arena', 'Matthews scores in home opener', false),
  (seed_uuid('evt-nhl-11'), seed_uuid('league-nhl'), seed_uuid('venue-wells'), '2025-10-22', 'match', seed_uuid('team-phi-nhl'), seed_uuid('team-bos-nhl'), 3, 4, false, 2025, 'Regular Season', 'Wells Fargo Center', 'Bruins edge Flyers', false),
  (seed_uuid('evt-nhl-12'), seed_uuid('league-nhl'), seed_uuid('venue-ball'), '2025-11-01', 'match', seed_uuid('team-col-nhl'), seed_uuid('team-min-nhl'), 5, 2, false, 2025, 'Regular Season', 'Ball Arena', 'Avalanche dominate Wild', false),
  (seed_uuid('evt-nhl-13'), seed_uuid('league-nhl'), seed_uuid('venue-tmobile'), '2025-11-08', 'match', seed_uuid('team-vgk'), seed_uuid('team-la-nhl'), 3, 3, true, 2025, 'Regular Season', 'T-Mobile Arena', 'Golden Knights and Kings tie in OT', false),
  (seed_uuid('evt-nhl-14'), seed_uuid('league-nhl'), seed_uuid('venue-climate'), '2025-11-15', 'match', seed_uuid('team-sea-nhl'), seed_uuid('team-van'), 4, 1, false, 2025, 'Regular Season', 'Climate Pledge Arena', 'Kraken cruise past Canucks', false),
  (seed_uuid('evt-nhl-15'), seed_uuid('league-nhl'), seed_uuid('venue-aac'), '2025-12-01', 'match', seed_uuid('team-dal-nhl'), seed_uuid('team-col-nhl'), 2, 3, false, 2025, 'Regular Season', 'American Airlines Center', 'Avs edge Stars', false),
  (seed_uuid('evt-nhl-16'), seed_uuid('league-nhl'), seed_uuid('venue-enterprise'), '2025-12-10', 'match', seed_uuid('team-stl-nhl'), seed_uuid('team-chi-nhl'), 5, 1, false, 2025, 'Regular Season', 'Enterprise Center', 'Blues rout Blackhawks', false),
  (seed_uuid('evt-nhl-17'), seed_uuid('league-nhl'), seed_uuid('venue-ubs'), '2025-12-20', 'match', seed_uuid('team-nyi'), seed_uuid('team-njd'), 2, 4, false, 2025, 'Regular Season', 'UBS Arena', 'Devils top Isles at UBS', false),
  (seed_uuid('evt-nhl-18'), seed_uuid('league-nhl'), seed_uuid('venue-capitol'), '2026-01-05', 'match', seed_uuid('team-wsh-nhl'), seed_uuid('team-car-nhl'), 3, 2, false, 2025, 'Regular Season', 'Capital One Arena', 'Capitals hold off Hurricanes', false),
  (seed_uuid('evt-nhl-19'), seed_uuid('league-nhl'), seed_uuid('venue-msg'), '2026-01-20', 'match', seed_uuid('team-nyr'), seed_uuid('team-bos-nhl'), 5, 3, false, 2025, 'Regular Season', 'Madison Square Garden', 'Rangers light up Bruins at MSG', false),
  (seed_uuid('evt-nhl-20'), seed_uuid('league-nhl'), seed_uuid('venue-rogers-nhl'), '2026-02-01', 'match', seed_uuid('team-edm'), seed_uuid('team-cgy'), 4, 2, false, 2025, 'Regular Season', 'Rogers Place', 'McDavid dominates Battle of Alberta', false)
ON CONFLICT DO NOTHING;

-- ─── MLS EVENTS (2025 season: Feb-Nov) ───
INSERT INTO events (id, league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, round_or_stage, venue_name_at_time, headline, is_postseason) VALUES
  (seed_uuid('evt-mls-1'), seed_uuid('league-mls'), seed_uuid('venue-drivehuron'), '2025-02-22', 'match', seed_uuid('team-mia-mls'), seed_uuid('team-nyc-mls'), 3, 1, false, 2025, 'Regular Season', 'Chase Stadium', 'Messi brace opens MLS season', false),
  (seed_uuid('evt-mls-2'), seed_uuid('league-mls'), seed_uuid('venue-bmostadium'), '2025-03-01', 'match', seed_uuid('team-lafc'), seed_uuid('team-la-mls'), 2, 2, true, 2025, 'Regular Season', 'BMO Stadium', 'El Trafico ends in draw', false),
  (seed_uuid('evt-mls-3'), seed_uuid('league-mls'), seed_uuid('venue-mbstadium'), '2025-03-08', 'match', seed_uuid('team-atl-mls'), seed_uuid('team-mia-mls'), 1, 3, false, 2025, 'Regular Season', 'Mercedes-Benz Stadium', 'Messi inspires Inter Miami in Atlanta', false),
  (seed_uuid('evt-mls-4'), seed_uuid('league-mls'), seed_uuid('venue-redbull'), '2025-03-15', 'match', seed_uuid('team-nyrb'), seed_uuid('team-nyc-mls'), 1, 0, false, 2025, 'Regular Season', 'Red Bull Arena', 'Red Bulls edge NYCFC in Hudson derby', false),
  (seed_uuid('evt-mls-5'), seed_uuid('league-mls'), seed_uuid('venue-lumen'), '2025-03-22', 'match', seed_uuid('team-sea-mls'), seed_uuid('team-por-mls'), 2, 1, false, 2025, 'Regular Season', 'Lumen Field', 'Sounders win Cascadia Cup clash', false),
  (seed_uuid('evt-mls-6'), seed_uuid('league-mls'), seed_uuid('venue-soldier'), '2025-04-05', 'match', seed_uuid('team-chi-mls'), seed_uuid('team-cin-mls'), 2, 3, false, 2025, 'Regular Season', 'Soldier Field', 'Pulisic scores but Fire fall', false),
  (seed_uuid('evt-mls-7'), seed_uuid('league-mls'), seed_uuid('venue-lowerfld'), '2025-04-12', 'match', seed_uuid('team-clb'), seed_uuid('team-phi-mls'), 3, 0, false, 2025, 'Regular Season', 'Lower.com Field', 'Crew shut out Union', false),
  (seed_uuid('evt-mls-8'), seed_uuid('league-mls'), seed_uuid('venue-q2'), '2025-05-03', 'match', seed_uuid('team-aus-mls'), seed_uuid('team-hou-mls'), 4, 1, false, 2025, 'Regular Season', 'Q2 Stadium', 'Austin FC routs Dynamo', false),
  (seed_uuid('evt-mls-9'), seed_uuid('league-mls'), seed_uuid('venue-citypark'), '2025-05-17', 'match', seed_uuid('team-stl-mls'), seed_uuid('team-skc'), 2, 1, false, 2025, 'Regular Season', 'CityPark', 'St. Louis City edges SKC', false),
  (seed_uuid('evt-mls-10'), seed_uuid('league-mls'), seed_uuid('venue-drivehuron'), '2025-06-01', 'match', seed_uuid('team-mia-mls'), seed_uuid('team-atl-mls'), 4, 0, false, 2025, 'Regular Season', 'Chase Stadium', 'Messi masterclass vs Atlanta', false),
  (seed_uuid('evt-mls-11'), seed_uuid('league-mls'), seed_uuid('venue-geodis'), '2025-06-14', 'match', seed_uuid('team-nsh-mls'), seed_uuid('team-clb'), 1, 2, false, 2025, 'Regular Season', 'GEODIS Park', 'Crew win at GEODIS Park', false),
  (seed_uuid('evt-mls-12'), seed_uuid('league-mls'), seed_uuid('venue-tql'), '2025-07-04', 'match', seed_uuid('team-cin-mls'), seed_uuid('team-chi-mls'), 3, 2, false, 2025, 'Regular Season', 'TQL Stadium', 'FC Cincinnati win 4th of July showdown', false),
  (seed_uuid('evt-mls-13'), seed_uuid('league-mls'), seed_uuid('venue-yankee'), '2025-07-19', 'match', seed_uuid('team-nyc-mls'), seed_uuid('team-nyrb'), 2, 2, true, 2025, 'Regular Season', 'Yankee Stadium', 'NYCFC and Red Bulls split NY derby', false),
  (seed_uuid('evt-mls-14'), seed_uuid('league-mls'), seed_uuid('venue-providence'), '2025-08-02', 'match', seed_uuid('team-por-mls'), seed_uuid('team-sea-mls'), 1, 0, false, 2025, 'Regular Season', 'Providence Park', 'Timbers win rivalry at Providence Park', false),
  (seed_uuid('evt-mls-15'), seed_uuid('league-mls'), seed_uuid('venue-allianz'), '2025-08-16', 'match', seed_uuid('team-min-mls'), seed_uuid('team-stl-mls'), 3, 1, false, 2025, 'Regular Season', 'Allianz Field', 'Loons cruise at Allianz Field', false),
  (seed_uuid('evt-mls-16'), seed_uuid('league-mls'), seed_uuid('venue-drivehuron'), '2025-09-20', 'match', seed_uuid('team-mia-mls'), seed_uuid('team-clb'), 2, 1, false, 2025, 'Regular Season', 'Chase Stadium', 'Inter Miami clinch Supporters Shield', false),
  -- MLS Playoffs
  (seed_uuid('evt-mls-p1'), seed_uuid('league-mls'), seed_uuid('venue-drivehuron'), '2025-10-25', 'match', seed_uuid('team-mia-mls'), seed_uuid('team-orl-mls'), 3, 0, false, 2025, 'MLS Cup R1', 'Chase Stadium', 'Inter Miami advance in playoffs', true),
  (seed_uuid('evt-mls-p2'), seed_uuid('league-mls'), seed_uuid('venue-lowerfld'), '2025-10-26', 'match', seed_uuid('team-clb'), seed_uuid('team-phi-mls'), 2, 1, false, 2025, 'MLS Cup R1', 'Lower.com Field', 'Crew advance past Union', true),
  (seed_uuid('evt-mls-p3'), seed_uuid('league-mls'), seed_uuid('venue-drivehuron'), '2025-11-22', 'match', seed_uuid('team-mia-mls'), seed_uuid('team-clb'), 2, 0, false, 2025, 'MLS Cup', 'Chase Stadium', 'Messi lifts Inter Miami to MLS Cup', true)
ON CONFLICT DO NOTHING;

-- ─── PGA TOUR EVENTS (field events with tournament_name) ───
INSERT INTO events (id, league_id, venue_id, event_date, event_template, tournament_name, winner_name, season, round_or_stage, venue_name_at_time, headline, is_postseason, event_tags) VALUES
  (seed_uuid('evt-pga-1'), seed_uuid('league-pga'), seed_uuid('venue-riviera'), '2025-02-16', 'field', 'The Genesis Invitational', 'Scottie Scheffler', 2025, 'Regular Season', 'Riviera Country Club', 'Scheffler dominates at Riviera', false, NULL),
  (seed_uuid('evt-pga-2'), seed_uuid('league-pga'), seed_uuid('venue-tpc'), '2025-03-16', 'field', 'THE PLAYERS Championship', 'Rory McIlroy', 2025, 'Regular Season', 'TPC Sawgrass', 'McIlroy wins at TPC Sawgrass', false, NULL),
  (seed_uuid('evt-pga-3'), seed_uuid('league-pga'), seed_uuid('venue-augusta'), '2025-04-13', 'field', '2025 Masters Tournament', 'Scottie Scheffler', 2025, 'Major', 'Augusta National Golf Club', 'Scheffler claims third green jacket', false, ARRAY['pga_major','masters']),
  (seed_uuid('evt-pga-4'), seed_uuid('league-pga'), seed_uuid('venue-pebble'), '2025-06-15', 'field', '2025 U.S. Open', 'Rory McIlroy', 2025, 'Major', 'Pebble Beach Golf Links', 'McIlroy finally breaks major drought', false, ARRAY['pga_major','us_open']),
  (seed_uuid('evt-pga-5'), seed_uuid('league-pga'), seed_uuid('venue-pinehurst'), '2025-07-20', 'field', '2025 Open Championship', 'Jon Rahm', 2025, 'Major', 'Pinehurst No. 2', 'Rahm captures Claret Jug', false, ARRAY['pga_major','open_championship']),
  (seed_uuid('evt-pga-6'), seed_uuid('league-pga'), seed_uuid('venue-valhalla'), '2025-08-17', 'field', '2025 PGA Championship', 'Scottie Scheffler', 2025, 'Major', 'Valhalla Golf Club', 'Scheffler completes career Grand Slam', false, ARRAY['pga_major','pga_championship']),
  (seed_uuid('evt-pga-7'), seed_uuid('league-pga'), seed_uuid('venue-torrey'), '2025-01-26', 'field', 'Farmers Insurance Open', 'Scottie Scheffler', 2025, 'Regular Season', 'Torrey Pines Golf Course', 'Scheffler opens 2025 with win', false, NULL),
  (seed_uuid('evt-pga-8'), seed_uuid('league-pga'), seed_uuid('venue-tpc'), '2025-09-07', 'field', 'TOUR Championship', 'Scottie Scheffler', 2025, 'FedEx Cup Playoffs', 'TPC Sawgrass', 'Scheffler wins FedEx Cup', false, NULL),
  (seed_uuid('evt-pga-9'), seed_uuid('league-pga'), seed_uuid('venue-augusta'), '2026-04-12', 'field', '2026 Masters Tournament', NULL, 2026, 'Major', 'Augusta National Golf Club', '2026 Masters Tournament', false, ARRAY['pga_major','masters']),
  (seed_uuid('evt-pga-10'), seed_uuid('league-pga'), seed_uuid('venue-riviera'), '2026-02-15', 'field', 'The Genesis Invitational 2026', NULL, 2026, 'Regular Season', 'Riviera Country Club', '2026 Genesis Invitational', false, NULL)
ON CONFLICT DO NOTHING;

-- ─── ADDITIONAL NFL/NBA/MLB EVENTS to reach 150+ total ───
INSERT INTO events (id, league_id, venue_id, event_date, event_template, home_team_id, away_team_id, home_score, away_score, is_draw, season, round_or_stage, venue_name_at_time, headline, is_postseason) VALUES
  -- More NFL 2025 Season
  (seed_uuid('evt-nfl-rs22'), seed_uuid('league-nfl'), seed_uuid('venue-paycor'), '2025-12-28', 'match', seed_uuid('team-cin'), seed_uuid('team-bal'), 24, 31, false, 2025, 'Week 17', 'Paycor Stadium', 'Ravens clinch division at Cincinnati', false),
  (seed_uuid('evt-nfl-rs23'), seed_uuid('league-nfl'), seed_uuid('venue-allegiant'), '2026-01-04', 'match', seed_uuid('team-lv'), seed_uuid('team-den'), 17, 20, false, 2025, 'Week 18', 'Allegiant Stadium', 'Broncos edge Raiders in finale', false),
  (seed_uuid('evt-nfl-rs24'), seed_uuid('league-nfl'), seed_uuid('venue-raymond'), '2025-10-26', 'match', seed_uuid('team-tb'), seed_uuid('team-no'), 28, 21, false, 2025, 'Week 8', 'Raymond James Stadium', 'Bucs top Saints in NFC South', false),
  (seed_uuid('evt-nfl-rs25'), seed_uuid('league-nfl'), seed_uuid('venue-everbank'), '2025-11-09', 'match', seed_uuid('team-jax'), seed_uuid('team-ten'), 24, 17, false, 2025, 'Week 10', 'EverBank Stadium', 'Jaguars handle Titans', false),
  (seed_uuid('evt-nfl-rs26'), seed_uuid('league-nfl'), seed_uuid('venue-lumen'), '2025-12-14', 'match', seed_uuid('team-sea'), seed_uuid('team-lar'), 21, 17, false, 2025, 'Week 15', 'Lumen Field', 'Seahawks edge Rams in Seattle', false),
  -- More NBA 2025-26
  (seed_uuid('evt-nba-24'), seed_uuid('league-nba'), seed_uuid('venue-aaa'), '2025-11-22', 'match', seed_uuid('team-mia-nba'), seed_uuid('team-atl-nba'), 108, 99, false, 2025, 'Regular Season', 'Kaseya Center', 'Heat handle Hawks', false),
  (seed_uuid('evt-nba-25'), seed_uuid('league-nba'), seed_uuid('venue-ball'), '2025-12-28', 'match', seed_uuid('team-den-nba'), seed_uuid('team-okc'), 119, 121, false, 2025, 'Regular Season', 'Ball Arena', 'SGA buzzer beater sinks Nuggets', false),
  (seed_uuid('evt-nba-26'), seed_uuid('league-nba'), seed_uuid('venue-golden1'), '2026-01-03', 'match', seed_uuid('team-sac'), seed_uuid('team-lal'), 120, 116, false, 2025, 'Regular Season', 'Golden 1 Center', 'Kings upset Lakers in Sacramento', false),
  (seed_uuid('evt-nba-27'), seed_uuid('league-nba'), seed_uuid('venue-fedex'), '2026-01-18', 'match', seed_uuid('team-mem'), seed_uuid('team-nop'), 124, 110, false, 2025, 'Regular Season', 'FedExForum', 'Grizzlies dominate Pelicans', false),
  (seed_uuid('evt-nba-28'), seed_uuid('league-nba'), seed_uuid('venue-frost'), '2026-01-30', 'match', seed_uuid('team-sas'), seed_uuid('team-dal-nba'), 105, 112, false, 2025, 'Regular Season', 'Frost Bank Center', 'Mavs win Texas showdown', false),
  -- More MLB 2025
  (seed_uuid('evt-mlb-31'), seed_uuid('league-mlb'), seed_uuid('venue-kauffman'), '2025-05-03', 'match', seed_uuid('team-kc-mlb'), seed_uuid('team-min-mlb'), 3, 5, false, 2025, 'Regular Season', 'Kauffman Stadium', 'Twins win at Kauffman', false),
  (seed_uuid('evt-mlb-32'), seed_uuid('league-mlb'), seed_uuid('venue-tmobile-mlb'), '2025-06-07', 'match', seed_uuid('team-sea-mlb'), seed_uuid('team-hou-mlb'), 4, 2, false, 2025, 'Regular Season', 'T-Mobile Park', 'Mariners beat Astros at home', false),
  (seed_uuid('evt-mlb-33'), seed_uuid('league-mlb'), seed_uuid('venue-amfam'), '2025-07-05', 'match', seed_uuid('team-mil-mlb'), seed_uuid('team-stl'), 7, 3, false, 2025, 'Regular Season', 'American Family Field', 'Brewers rout Cards on July 4th weekend', false),
  (seed_uuid('evt-mlb-34'), seed_uuid('league-mlb'), seed_uuid('venue-guaranteed'), '2025-07-19', 'match', seed_uuid('team-cws'), seed_uuid('team-det-mlb'), 2, 8, false, 2025, 'Regular Season', 'Guaranteed Rate Field', 'Tigers blast White Sox', false),
  (seed_uuid('evt-mlb-35'), seed_uuid('league-mlb'), seed_uuid('venue-gabp'), '2025-08-09', 'match', seed_uuid('team-cin-mlb'), seed_uuid('team-pit-mlb'), 5, 6, false, 2025, 'Regular Season', 'Great American Ball Park', 'Pirates rally to beat Reds', false),
  (seed_uuid('evt-mlb-36'), seed_uuid('league-mlb'), seed_uuid('venue-comerica'), '2025-08-23', 'match', seed_uuid('team-det-mlb'), seed_uuid('team-cle-mlb'), 3, 1, false, 2025, 'Regular Season', 'Comerica Park', 'Tigers edge Guardians', false),
  (seed_uuid('evt-mlb-37'), seed_uuid('league-mlb'), seed_uuid('venue-chase-mlb'), '2025-09-06', 'match', seed_uuid('team-ari-mlb'), seed_uuid('team-sd'), 4, 7, false, 2025, 'Regular Season', 'Chase Field', 'Padres win at Chase Field', false),
  (seed_uuid('evt-mlb-38'), seed_uuid('league-mlb'), seed_uuid('venue-loandepot'), '2025-04-19', 'match', seed_uuid('team-mia-mlb'), seed_uuid('team-was-mlb'), 6, 3, false, 2025, 'Regular Season', 'loanDepot Park', 'Marlins beat Nationals at home', false),
  (seed_uuid('evt-mlb-39'), seed_uuid('league-mlb'), seed_uuid('venue-nationals'), '2025-05-10', 'match', seed_uuid('team-was-mlb'), seed_uuid('team-phi-mlb'), 4, 8, false, 2025, 'Regular Season', 'Nationals Park', 'Phillies cruise at Nationals Park', false),
  (seed_uuid('evt-mlb-40'), seed_uuid('league-mlb'), seed_uuid('venue-angel'), '2025-06-28', 'match', seed_uuid('team-laa'), seed_uuid('team-tex'), 5, 3, false, 2025, 'Regular Season', 'Angel Stadium', 'Angels down Rangers', false)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 8. TEST USERS (auth.users + profiles)
-- The on_auth_user_created trigger auto-creates a profile row.
-- We INSERT into auth.users, then UPDATE the auto-created profile.
-- ═══════════════════════════════════════════════════════════════

-- Need to insert auth.identities too for Supabase auth to work
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, role, aud, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'anthony@test.com', crypt('password123', gen_salt('bf')), now(), '{"username": "anthony"}'::jsonb, 'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'kyle@test.com',    crypt('password123', gen_salt('bf')), now(), '{"username": "kyle"}'::jsonb,    'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'sarah@test.com',   crypt('password123', gen_salt('bf')), now(), '{"username": "sarah"}'::jsonb,   'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'dave@test.com',    crypt('password123', gen_salt('bf')), now(), '{"username": "dave"}'::jsonb,    'authenticated', 'authenticated', now(), now()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'mike@test.com',    crypt('password123', gen_salt('bf')), now(), '{"username": "mike"}'::jsonb,    'authenticated', 'authenticated', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert auth.identities for each user (required for Supabase auth to work)
INSERT INTO auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
VALUES
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'email', '{"sub": "00000000-0000-0000-0000-000000000001", "email": "anthony@test.com"}'::jsonb, now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'email', '{"sub": "00000000-0000-0000-0000-000000000002", "email": "kyle@test.com"}'::jsonb, now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003', 'email', '{"sub": "00000000-0000-0000-0000-000000000003", "email": "sarah@test.com"}'::jsonb, now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004', 'email', '{"sub": "00000000-0000-0000-0000-000000000004", "email": "dave@test.com"}'::jsonb, now(), now(), now()),
  (gen_random_uuid(), '00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005', 'email', '{"sub": "00000000-0000-0000-0000-000000000005", "email": "mike@test.com"}'::jsonb, now(), now(), now())
ON CONFLICT DO NOTHING;

-- Now UPDATE the auto-created profiles with additional fields
-- (The trigger already created profiles with id and username)

UPDATE profiles SET
  display_name = 'Anthony',
  bio = 'NYC sports junkie | 34 stadiums and counting',
  fav_sport = 'basketball',
  fav_team_id = seed_uuid('team-nyy'),
  fav_venue_id = seed_uuid('venue-pnc'),
  fav_athlete_id = seed_uuid('athlete-blaney'),
  fav_event_id = seed_uuid('evt-mlb-16')
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE profiles SET
  display_name = 'Kyle',
  bio = 'Philly sports through and through'
WHERE id = '00000000-0000-0000-0000-000000000002';

UPDATE profiles SET
  display_name = 'Sarah',
  bio = 'Baseball purist | Wrigley is my happy place'
WHERE id = '00000000-0000-0000-0000-000000000003';

UPDATE profiles SET
  display_name = 'Dave',
  bio = 'Chasing the bucket list one stadium at a time'
WHERE id = '00000000-0000-0000-0000-000000000004';

UPDATE profiles SET
  display_name = 'Mike',
  bio = 'Hockey and hoops | NY sports fan'
WHERE id = '00000000-0000-0000-0000-000000000005';

-- ═══════════════════════════════════════════════════════════════
-- 9. SYSTEM LISTS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO lists (id, name, description, list_type, source, is_featured, sport, league_id, item_count) VALUES
  (seed_uuid('list-mlb-stadiums'), 'All 30 MLB Stadiums', 'Visit every active Major League Baseball stadium across the United States and Canada.', 'venue', 'system', true, 'baseball', seed_uuid('league-mlb'), 30),
  (seed_uuid('list-nfl-stadiums'), 'All 32 NFL Stadiums', 'Visit every active National Football League stadium across the United States.', 'venue', 'system', true, 'football', seed_uuid('league-nfl'), 30),
  (seed_uuid('list-nba-arenas'), 'All 30 NBA Arenas', 'Visit every active National Basketball Association arena across the United States and Canada.', 'venue', 'system', true, 'basketball', seed_uuid('league-nba'), 30),
  (seed_uuid('list-nhl-arenas'), 'All 32 NHL Arenas', 'Visit every active National Hockey League arena across the United States and Canada.', 'venue', 'system', true, 'hockey', seed_uuid('league-nhl'), 32),
  (seed_uuid('list-grand-slams'), 'All 4 Grand Slams', 'Attend all four tennis Grand Slam tournaments: Australian Open, French Open, Wimbledon, and the US Open.', 'event', 'system', true, 'tennis', NULL, 4),
  (seed_uuid('list-pga-majors'), 'PGA Major Championships', 'Attend all four PGA Major Championships: The Masters, PGA Championship, U.S. Open, and The Open Championship.', 'event', 'system', true, 'golf', seed_uuid('league-pga'), 4)
ON CONFLICT DO NOTHING;

-- ─── LIST ITEMS: MLB Stadiums ───
INSERT INTO list_items (id, list_id, venue_id, display_name, display_order) VALUES
  (seed_uuid('li-mlb-1'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-yankee'),      'Yankee Stadium', 1),
  (seed_uuid('li-mlb-2'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-citi'),         'Citi Field', 2),
  (seed_uuid('li-mlb-3'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-fenway'),       'Fenway Park', 3),
  (seed_uuid('li-mlb-4'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-wrigley'),      'Wrigley Field', 4),
  (seed_uuid('li-mlb-5'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-dodger'),       'Dodger Stadium', 5),
  (seed_uuid('li-mlb-6'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-pnc'),          'PNC Park', 6),
  (seed_uuid('li-mlb-7'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-oracle'),       'Oracle Park', 7),
  (seed_uuid('li-mlb-8'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-camden'),       'Camden Yards', 8),
  (seed_uuid('li-mlb-9'),  seed_uuid('list-mlb-stadiums'), seed_uuid('venue-minute'),       'Minute Maid Park', 9),
  (seed_uuid('li-mlb-10'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-truist'),       'Truist Park', 10),
  (seed_uuid('li-mlb-11'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-citizens'),     'Citizens Bank Park', 11),
  (seed_uuid('li-mlb-12'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-petco'),        'Petco Park', 12),
  (seed_uuid('li-mlb-13'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-trop'),         'Tropicana Field', 13),
  (seed_uuid('li-mlb-14'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-guaranteed'),   'Guaranteed Rate Field', 14),
  (seed_uuid('li-mlb-15'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-progressive'),  'Progressive Field', 15),
  (seed_uuid('li-mlb-16'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-target-mlb'),   'Target Field', 16),
  (seed_uuid('li-mlb-17'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-comerica'),     'Comerica Park', 17),
  (seed_uuid('li-mlb-18'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-kauffman'),     'Kauffman Stadium', 18),
  (seed_uuid('li-mlb-19'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-globe'),        'Globe Life Field', 19),
  (seed_uuid('li-mlb-20'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-tmobile-mlb'),  'T-Mobile Park', 20),
  (seed_uuid('li-mlb-21'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-angel'),        'Angel Stadium', 21),
  (seed_uuid('li-mlb-22'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-rogers'),       'Rogers Centre', 22),
  (seed_uuid('li-mlb-23'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-busch'),        'Busch Stadium', 23),
  (seed_uuid('li-mlb-24'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-chase-mlb'),    'Chase Field', 24),
  (seed_uuid('li-mlb-25'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-coors'),        'Coors Field', 25),
  (seed_uuid('li-mlb-26'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-amfam'),        'American Family Field', 26),
  (seed_uuid('li-mlb-27'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-gabp'),         'Great American Ball Park', 27),
  (seed_uuid('li-mlb-28'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-nationals'),    'Nationals Park', 28),
  (seed_uuid('li-mlb-29'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-loandepot'),    'loanDepot Park', 29),
  (seed_uuid('li-mlb-30'), seed_uuid('list-mlb-stadiums'), seed_uuid('venue-sutter'),       'Sutter Health Park', 30)
ON CONFLICT DO NOTHING;

-- ─── LIST ITEMS: NFL Stadiums ───
INSERT INTO list_items (id, list_id, venue_id, display_name, display_order) VALUES
  (seed_uuid('li-nfl-1'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-metlife'),     'MetLife Stadium', 1),
  (seed_uuid('li-nfl-2'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-arrowhead'),   'GEHA Field at Arrowhead Stadium', 2),
  (seed_uuid('li-nfl-3'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-sofi'),        'SoFi Stadium', 3),
  (seed_uuid('li-nfl-4'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-lambeau'),     'Lambeau Field', 4),
  (seed_uuid('li-nfl-5'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-att'),         'AT&T Stadium', 5),
  (seed_uuid('li-nfl-6'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-lincoln'),     'Lincoln Financial Field', 6),
  (seed_uuid('li-nfl-7'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-gillette'),    'Gillette Stadium', 7),
  (seed_uuid('li-nfl-8'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-highmark'),    'Highmark Stadium', 8),
  (seed_uuid('li-nfl-9'),  seed_uuid('list-nfl-stadiums'), seed_uuid('venue-lumen'),       'Lumen Field', 9),
  (seed_uuid('li-nfl-10'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-allegiant'),   'Allegiant Stadium', 10),
  (seed_uuid('li-nfl-11'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-mbstadium'),   'Mercedes-Benz Stadium', 11),
  (seed_uuid('li-nfl-12'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-raymond'),     'Raymond James Stadium', 12),
  (seed_uuid('li-nfl-13'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-caesars'),     'Caesars Superdome', 13),
  (seed_uuid('li-nfl-14'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-nrg'),         'NRG Stadium', 14),
  (seed_uuid('li-nfl-15'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-acrisure'),    'Acrisure Stadium', 15),
  (seed_uuid('li-nfl-16'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-usbank'),      'U.S. Bank Stadium', 16),
  (seed_uuid('li-nfl-17'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-ford'),        'Ford Field', 17),
  (seed_uuid('li-nfl-18'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-soldier'),     'Soldier Field', 18),
  (seed_uuid('li-nfl-19'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-levis'),       'Levi''s Stadium', 19),
  (seed_uuid('li-nfl-20'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-hardrock'),    'Hard Rock Stadium', 20),
  (seed_uuid('li-nfl-21'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-paycor'),      'Paycor Stadium', 21),
  (seed_uuid('li-nfl-22'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-northwest'),   'Northwest Stadium', 22),
  (seed_uuid('li-nfl-23'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-nissan'),      'Nissan Stadium', 23),
  (seed_uuid('li-nfl-24'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-lucas'),       'Lucas Oil Stadium', 24),
  (seed_uuid('li-nfl-25'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-everbank'),    'EverBank Stadium', 25),
  (seed_uuid('li-nfl-26'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-boa'),         'Bank of America Stadium', 26),
  (seed_uuid('li-nfl-27'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-mandt'),       'M&T Bank Stadium', 27),
  (seed_uuid('li-nfl-28'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-huntington'),  'Huntington Bank Field', 28),
  (seed_uuid('li-nfl-29'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-empower'),     'Empower Field at Mile High', 29),
  (seed_uuid('li-nfl-30'), seed_uuid('list-nfl-stadiums'), seed_uuid('venue-stfarm'),      'State Farm Stadium', 30)
ON CONFLICT DO NOTHING;

-- ─── LIST ITEMS: NBA Arenas ───
INSERT INTO list_items (id, list_id, venue_id, display_name, display_order) VALUES
  (seed_uuid('li-nba-1'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-msg'),          'Madison Square Garden', 1),
  (seed_uuid('li-nba-2'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-tdgarden'),     'TD Garden', 2),
  (seed_uuid('li-nba-3'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-chase'),        'Chase Center', 3),
  (seed_uuid('li-nba-4'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-crypto'),       'Crypto.com Arena', 4),
  (seed_uuid('li-nba-5'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-united'),       'United Center', 5),
  (seed_uuid('li-nba-6'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-barclays'),     'Barclays Center', 6),
  (seed_uuid('li-nba-7'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-wells'),        'Wells Fargo Center', 7),
  (seed_uuid('li-nba-8'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-ball'),         'Ball Arena', 8),
  (seed_uuid('li-nba-9'),  seed_uuid('list-nba-arenas'), seed_uuid('venue-target'),       'Target Center', 9),
  (seed_uuid('li-nba-10'), seed_uuid('list-nba-arenas'), seed_uuid('venue-paycom'),       'Paycom Center', 10),
  (seed_uuid('li-nba-11'), seed_uuid('list-nba-arenas'), seed_uuid('venue-aaa'),          'Kaseya Center', 11),
  (seed_uuid('li-nba-12'), seed_uuid('list-nba-arenas'), seed_uuid('venue-fiserv'),       'Fiserv Forum', 12),
  (seed_uuid('li-nba-13'), seed_uuid('list-nba-arenas'), seed_uuid('venue-footprint'),    'Footprint Center', 13),
  (seed_uuid('li-nba-14'), seed_uuid('list-nba-arenas'), seed_uuid('venue-toyota'),       'Toyota Center', 14),
  (seed_uuid('li-nba-15'), seed_uuid('list-nba-arenas'), seed_uuid('venue-aac'),          'American Airlines Center', 15),
  (seed_uuid('li-nba-16'), seed_uuid('list-nba-arenas'), seed_uuid('venue-scotiabank'),   'Scotiabank Arena', 16),
  (seed_uuid('li-nba-17'), seed_uuid('list-nba-arenas'), seed_uuid('venue-intuit'),       'Intuit Dome', 17),
  (seed_uuid('li-nba-18'), seed_uuid('list-nba-arenas'), seed_uuid('venue-capitol'),      'Capital One Arena', 18),
  (seed_uuid('li-nba-19'), seed_uuid('list-nba-arenas'), seed_uuid('venue-stfarm-nba'),   'State Farm Arena', 19),
  (seed_uuid('li-nba-20'), seed_uuid('list-nba-arenas'), seed_uuid('venue-fedex'),        'FedExForum', 20),
  (seed_uuid('li-nba-21'), seed_uuid('list-nba-arenas'), seed_uuid('venue-smoothie'),     'Smoothie King Center', 21),
  (seed_uuid('li-nba-22'), seed_uuid('list-nba-arenas'), seed_uuid('venue-gainbridge'),   'Gainbridge Fieldhouse', 22),
  (seed_uuid('li-nba-23'), seed_uuid('list-nba-arenas'), seed_uuid('venue-frost'),        'Frost Bank Center', 23),
  (seed_uuid('li-nba-24'), seed_uuid('list-nba-arenas'), seed_uuid('venue-rocket'),       'Rocket Mortgage FieldHouse', 24),
  (seed_uuid('li-nba-25'), seed_uuid('list-nba-arenas'), seed_uuid('venue-littlecaesars'),'Little Caesars Arena', 25),
  (seed_uuid('li-nba-26'), seed_uuid('list-nba-arenas'), seed_uuid('venue-golden1'),      'Golden 1 Center', 26),
  (seed_uuid('li-nba-27'), seed_uuid('list-nba-arenas'), seed_uuid('venue-moda'),         'Moda Center', 27),
  (seed_uuid('li-nba-28'), seed_uuid('list-nba-arenas'), seed_uuid('venue-delta'),        'Delta Center', 28),
  (seed_uuid('li-nba-29'), seed_uuid('list-nba-arenas'), seed_uuid('venue-spectrum'),     'Spectrum Center', 29),
  (seed_uuid('li-nba-30'), seed_uuid('list-nba-arenas'), seed_uuid('venue-amway'),        'Amway Center', 30)
ON CONFLICT DO NOTHING;

-- ─── LIST ITEMS: NHL Arenas ───
INSERT INTO list_items (id, list_id, venue_id, display_name, display_order) VALUES
  (seed_uuid('li-nhl-1'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-msg'),          'Madison Square Garden', 1),
  (seed_uuid('li-nhl-2'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-tdgarden'),     'TD Garden', 2),
  (seed_uuid('li-nhl-3'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-crypto'),       'Crypto.com Arena', 3),
  (seed_uuid('li-nhl-4'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-united'),       'United Center', 4),
  (seed_uuid('li-nhl-5'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-wells'),        'Wells Fargo Center', 5),
  (seed_uuid('li-nhl-6'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-ball'),         'Ball Arena', 6),
  (seed_uuid('li-nhl-7'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-aac'),          'American Airlines Center', 7),
  (seed_uuid('li-nhl-8'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-scotiabank'),   'Scotiabank Arena', 8),
  (seed_uuid('li-nhl-9'),  seed_uuid('list-nhl-arenas'), seed_uuid('venue-capitol'),      'Capital One Arena', 9),
  (seed_uuid('li-nhl-10'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-ubs'),          'UBS Arena', 10),
  (seed_uuid('li-nhl-11'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-pru'),          'Prudential Center', 11),
  (seed_uuid('li-nhl-12'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-ppg'),          'PPG Paints Arena', 12),
  (seed_uuid('li-nhl-13'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-pnc-nhl'),     'PNC Arena', 13),
  (seed_uuid('li-nhl-14'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-nationwide'),   'Nationwide Arena', 14),
  (seed_uuid('li-nhl-15'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-amalie'),       'Amalie Arena', 15),
  (seed_uuid('li-nhl-16'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-bell'),         'Bell Centre', 16),
  (seed_uuid('li-nhl-17'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-ctd'),          'Canadian Tire Centre', 17),
  (seed_uuid('li-nhl-18'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-amerant'),      'Amerant Bank Arena', 18),
  (seed_uuid('li-nhl-19'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-keybank'),      'KeyBank Center', 19),
  (seed_uuid('li-nhl-20'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-littlecaesars'),'Little Caesars Arena', 20),
  (seed_uuid('li-nhl-21'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-enterprise'),   'Enterprise Center', 21),
  (seed_uuid('li-nhl-22'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-bridgestone'),  'Bridgestone Arena', 22),
  (seed_uuid('li-nhl-23'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-xcel'),         'Xcel Energy Center', 23),
  (seed_uuid('li-nhl-24'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-tmobile'),      'T-Mobile Arena', 24),
  (seed_uuid('li-nhl-25'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-honda'),        'Honda Center', 25),
  (seed_uuid('li-nhl-26'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-rogers-nhl'),   'Rogers Place', 26),
  (seed_uuid('li-nhl-27'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-saddledome'),   'Scotiabank Saddledome', 27),
  (seed_uuid('li-nhl-28'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-climate'),      'Climate Pledge Arena', 28),
  (seed_uuid('li-nhl-29'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-rogers-van'),   'Rogers Arena', 29),
  (seed_uuid('li-nhl-30'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-sap'),          'SAP Center', 30),
  (seed_uuid('li-nhl-31'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-canada'),       'Canada Life Centre', 31),
  (seed_uuid('li-nhl-32'), seed_uuid('list-nhl-arenas'), seed_uuid('venue-delta'),        'Delta Center', 32)
ON CONFLICT DO NOTHING;

-- ─── LIST ITEMS: Grand Slams (event list) ───
INSERT INTO list_items (id, list_id, event_tag, display_name, display_order) VALUES
  (seed_uuid('li-gs-1'), seed_uuid('list-grand-slams'), 'grand_slam_australian_open', 'Australian Open', 1),
  (seed_uuid('li-gs-2'), seed_uuid('list-grand-slams'), 'grand_slam_french_open', 'French Open (Roland Garros)', 2),
  (seed_uuid('li-gs-3'), seed_uuid('list-grand-slams'), 'grand_slam_wimbledon', 'Wimbledon', 3),
  (seed_uuid('li-gs-4'), seed_uuid('list-grand-slams'), 'grand_slam_us_open', 'US Open', 4)
ON CONFLICT DO NOTHING;

-- ─── LIST ITEMS: PGA Majors (event list) ───
INSERT INTO list_items (id, list_id, event_tag, display_name, display_order) VALUES
  (seed_uuid('li-pga-1'), seed_uuid('list-pga-majors'), 'masters', 'The Masters', 1),
  (seed_uuid('li-pga-2'), seed_uuid('list-pga-majors'), 'pga_championship', 'PGA Championship', 2),
  (seed_uuid('li-pga-3'), seed_uuid('list-pga-majors'), 'us_open', 'U.S. Open', 3),
  (seed_uuid('li-pga-4'), seed_uuid('list-pga-majors'), 'open_championship', 'The Open Championship', 4)
ON CONFLICT DO NOTHING;

-- ─── PIN LISTS ON ANTHONY'S PROFILE ───
UPDATE profiles SET
  pinned_list_1_id = seed_uuid('list-mlb-stadiums'),
  pinned_list_2_id = seed_uuid('list-nfl-stadiums')
WHERE id = '00000000-0000-0000-0000-000000000001';

-- ═══════════════════════════════════════════════════════════════
-- 10. EVENT LOGS
-- NOTE: The auto_visit_venue trigger will automatically create
-- venue_visits entries when event_logs are inserted.
-- The like/comment count triggers will handle counts.
-- ═══════════════════════════════════════════════════════════════

-- ─── ANTHONY'S EVENT LOGS (~25 events) ───
INSERT INTO event_logs (id, user_id, event_id, venue_id, event_date, league_id, sport, rating, notes, seat_location, privacy, rooting_team_id, is_neutral, outcome) VALUES
  -- NFL games
  (seed_uuid('el-ant-1'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nfl-sb'), seed_uuid('venue-caesars'), '2025-02-09', seed_uuid('league-nfl'), 'football', 5, 'Incredible atmosphere. Eagles dominated from start to finish. Best game I have ever attended.', 'Section 312, Row 8', 'show_all', seed_uuid('team-phi'), false, 'win'),
  (seed_uuid('el-ant-2'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nfl-rs1'), seed_uuid('venue-arrowhead'), '2025-09-05', seed_uuid('league-nfl'), 'football', 4, 'Season opener at Arrowhead is always electric. Chiefs fans are intense.', 'Section 103, Row 22', 'show_all', NULL, true, 'neutral'),
  (seed_uuid('el-ant-3'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nfl-rs2'), seed_uuid('venue-metlife'), '2025-09-07', seed_uuid('league-nfl'), 'football', 3, 'Giants looked rough. MetLife was half empty by the 4th quarter.', 'Section 224, Row 5', 'show_all', seed_uuid('team-nyg'), false, 'loss'),
  (seed_uuid('el-ant-4'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nfl-rs4'), seed_uuid('venue-lincoln'), '2025-09-08', seed_uuid('league-nfl'), 'football', 5, 'Monday Night Football in Philly is unreal. Hurts was on fire.', 'Section 118, Row 14', 'show_all', seed_uuid('team-phi'), false, 'win'),
  -- NBA games
  (seed_uuid('el-ant-5'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nba-1'), seed_uuid('venue-msg'), '2025-02-14', seed_uuid('league-nba'), 'basketball', 5, 'Valentine Day at MSG. Brunson went OFF. 38 points, place was rocking.', 'Section 110, Row 3', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  (seed_uuid('el-ant-6'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nba-p6'), seed_uuid('venue-msg'), '2025-05-19', seed_uuid('league-nba'), 'basketball', 5, 'ECF Game 3 at MSG. I cannot describe how loud it was. Absolutely electric.', 'Section 101, Row 8', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  (seed_uuid('el-ant-7'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nba-p8'), seed_uuid('venue-msg'), '2025-06-12', seed_uuid('league-nba'), 'basketball', 5, 'NBA Finals at the Garden. Brunson 45 points. I was screaming the entire time.', 'Section 6, Row 12', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  (seed_uuid('el-ant-8'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nba-11'), seed_uuid('venue-msg'), '2025-10-22', seed_uuid('league-nba'), 'basketball', 4, 'Season opener. Banner night at MSG.', 'Section 110, Row 5', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  (seed_uuid('el-ant-9'),  '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nba-17'), seed_uuid('venue-msg'), '2025-12-05', seed_uuid('league-nba'), 'basketball', 5, 'Brunson vs LeBron. MSG at its finest.', 'Section 108, Row 7', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  (seed_uuid('el-ant-10'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nba-14'), seed_uuid('venue-barclays'), '2025-11-05', seed_uuid('league-nba'), 'basketball', 3, 'Went to Barclays for the crosstown game. Knicks dominated.', 'Section 219, Row 3', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  -- MLB games
  (seed_uuid('el-ant-11'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-mlb-1'), seed_uuid('venue-yankee'), '2025-03-27', seed_uuid('league-mlb'), 'baseball', 5, 'Opening Day at Yankee Stadium. Judge HR in the first inning. Perfect start.', 'Section 217B, Row 9', 'show_all', seed_uuid('team-nyy'), false, 'win'),
  (seed_uuid('el-ant-12'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-mlb-7'), seed_uuid('venue-yankee'), '2025-04-18', seed_uuid('league-mlb'), 'baseball', 5, 'Judge walk-off HR vs the Sox. I lost my mind.', 'Section 103, Row 15', 'show_all', seed_uuid('team-nyy'), false, 'win'),
  (seed_uuid('el-ant-13'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-mlb-16'), seed_uuid('venue-pnc'), '2025-06-14', seed_uuid('league-mlb'), 'baseball', 5, 'PNC Park is the best stadium in baseball. Stunning views of the Pittsburgh skyline. Pirates won too.', 'Section 128, Row 1', 'show_all', seed_uuid('team-pit-mlb'), false, 'win'),
  (seed_uuid('el-ant-14'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-mlb-18'), seed_uuid('venue-yankee'), '2025-06-28', seed_uuid('league-mlb'), 'baseball', 3, 'Subway Series but Yankees lost. Mets fans were obnoxious.', 'Section 232, Row 6', 'hide_personal', seed_uuid('team-nyy'), false, 'loss'),
  (seed_uuid('el-ant-15'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-mlb-25'), seed_uuid('venue-yankee'), '2025-08-09', seed_uuid('league-mlb'), 'baseball', 4, 'Judge went yard twice. Dominating performance.', 'Section 217B, Row 9', 'show_all', seed_uuid('team-nyy'), false, 'win'),
  (seed_uuid('el-ant-16'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-mlb-p6'), seed_uuid('venue-yankee'), '2025-10-28', seed_uuid('league-mlb'), 'baseball', 5, 'Subway World Series Game 1! Incredible. Yankees win.', 'Section 019, Row 5', 'show_all', seed_uuid('team-nyy'), false, 'win'),
  -- NHL games
  (seed_uuid('el-ant-17'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nhl-1'), seed_uuid('venue-msg'), '2025-02-08', seed_uuid('league-nhl'), 'hockey', 4, 'Rangers vs Islanders at MSG. Always a great rivalry atmosphere.', 'Section 212, Row 4', 'show_all', seed_uuid('team-nyr'), false, 'win'),
  (seed_uuid('el-ant-18'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nhl-p2'), seed_uuid('venue-msg'), '2025-04-20', seed_uuid('league-nhl'), 'hockey', 5, 'Playoff hockey at MSG. Overtime win. Pure chaos.', 'Section 107, Row 10', 'show_all', seed_uuid('team-nyr'), false, 'win'),
  (seed_uuid('el-ant-19'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nhl-9'), seed_uuid('venue-msg'), '2025-10-08', seed_uuid('league-nhl'), 'hockey', 4, 'Rangers home opener. Great energy.', 'Section 212, Row 4', 'show_all', seed_uuid('team-nyr'), false, 'win'),
  (seed_uuid('el-ant-20'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nhl-19'), seed_uuid('venue-msg'), '2026-01-20', seed_uuid('league-nhl'), 'hockey', 4, 'Rangers light up Bruins. MSG was buzzing.', 'Section 107, Row 10', 'show_all', seed_uuid('team-nyr'), false, 'win'),
  -- MLS games
  (seed_uuid('el-ant-21'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-mls-4'), seed_uuid('venue-redbull'), '2025-03-15', seed_uuid('league-mls'), 'soccer', 3, 'NY derby at Red Bull Arena. Good atmosphere for MLS.', 'Section 101, Row 8', 'show_all', NULL, true, 'neutral'),
  (seed_uuid('el-ant-22'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-mls-13'), seed_uuid('venue-yankee'), '2025-07-19', seed_uuid('league-mls'), 'soccer', 3, 'NYCFC at Yankee Stadium is always a weird experience. Soccer in a baseball stadium.', 'Section 217B, Row 9', 'show_all', NULL, true, 'neutral'),
  -- PGA
  (seed_uuid('el-ant-23'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-pga-3'), seed_uuid('venue-augusta'), '2025-04-13', seed_uuid('league-pga'), 'golf', 5, 'The Masters. Augusta National is perfection. Bucket list check.', NULL, 'show_all', NULL, true, 'neutral'),
  -- More NBA
  (seed_uuid('el-ant-24'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nba-20'), seed_uuid('venue-msg'), '2026-01-10', seed_uuid('league-nba'), 'basketball', 4, 'Knicks cruise past 76ers. Easy win.', 'Section 110, Row 3', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  (seed_uuid('el-ant-25'), '00000000-0000-0000-0000-000000000001', seed_uuid('evt-nba-23'), seed_uuid('venue-united'), '2026-02-01', seed_uuid('league-nba'), 'basketball', 4, 'United Center is a great arena. Knicks got the W on the road.', 'Section 310, Row 5', 'hide_personal', seed_uuid('team-nyk'), false, 'win')
ON CONFLICT DO NOTHING;

-- ─── KYLE'S EVENT LOGS (~8 events) ───
INSERT INTO event_logs (id, user_id, event_id, venue_id, event_date, league_id, sport, rating, notes, seat_location, privacy, rooting_team_id, is_neutral, outcome) VALUES
  (seed_uuid('el-kyle-1'), '00000000-0000-0000-0000-000000000002', seed_uuid('evt-nfl-rs4'), seed_uuid('venue-lincoln'), '2025-09-08', seed_uuid('league-nfl'), 'football', 5, 'Philly on Monday Night. No better atmosphere in sports.', 'Section 122, Row 18', 'show_all', seed_uuid('team-phi'), false, 'win'),
  (seed_uuid('el-kyle-2'), '00000000-0000-0000-0000-000000000002', seed_uuid('evt-nfl-sb'), seed_uuid('venue-caesars'), '2025-02-09', seed_uuid('league-nfl'), 'football', 5, 'Eagles Super Bowl champs! Best night of my life.', 'Section 627, Row 4', 'show_all', seed_uuid('team-phi'), false, 'win'),
  (seed_uuid('el-kyle-3'), '00000000-0000-0000-0000-000000000002', seed_uuid('evt-nba-6'), seed_uuid('venue-wells'), '2025-03-19', seed_uuid('league-nba'), 'basketball', 2, 'Sixers lost to the Knicks. Frustrating.', 'Section 201, Row 8', 'show_all', seed_uuid('team-phi-nba'), false, 'loss'),
  (seed_uuid('el-kyle-4'), '00000000-0000-0000-0000-000000000002', seed_uuid('evt-mlb-8'), seed_uuid('venue-citizens'), '2025-04-25', seed_uuid('league-mlb'), 'baseball', 3, 'Phillies lost but Citizens Bank Park never disappoints.', 'Section 136, Row 15', 'show_all', seed_uuid('team-phi-mlb'), false, 'loss'),
  (seed_uuid('el-kyle-5'), '00000000-0000-0000-0000-000000000002', seed_uuid('evt-nhl-6'), seed_uuid('venue-ppg'), '2025-03-15', seed_uuid('league-nhl'), 'hockey', 3, 'Road trip to Pittsburgh. Penguins edged the Flyers.', 'Section 218, Row 5', 'show_all', seed_uuid('team-phi-nhl'), false, 'loss'),
  (seed_uuid('el-kyle-6'), '00000000-0000-0000-0000-000000000002', seed_uuid('evt-nfl-nfcc'), seed_uuid('venue-lincoln'), '2025-01-26', seed_uuid('league-nfl'), 'football', 5, 'NFC Championship game. Eagles destroyed the Commanders. Unreal.', 'Section 103, Row 5', 'show_all', seed_uuid('team-phi'), false, 'win'),
  (seed_uuid('el-kyle-7'), '00000000-0000-0000-0000-000000000002', seed_uuid('evt-mlb-39'), seed_uuid('venue-nationals'), '2025-05-10', seed_uuid('league-mlb'), 'baseball', 4, 'Phillies road trip to DC. Easy win.', 'Section 120, Row 10', 'show_all', seed_uuid('team-phi-mlb'), false, 'win'),
  (seed_uuid('el-kyle-8'), '00000000-0000-0000-0000-000000000002', seed_uuid('evt-nhl-11'), seed_uuid('venue-wells'), '2025-10-22', seed_uuid('league-nhl'), 'hockey', 3, 'Flyers lost to the Bruins. Rebuilding year.', 'Section 207, Row 12', 'show_all', seed_uuid('team-phi-nhl'), false, 'loss')
ON CONFLICT DO NOTHING;

-- ─── SARAH'S EVENT LOGS (~6 events) ───
INSERT INTO event_logs (id, user_id, event_id, venue_id, event_date, league_id, sport, rating, notes, seat_location, privacy, rooting_team_id, is_neutral, outcome) VALUES
  (seed_uuid('el-sarah-1'), '00000000-0000-0000-0000-000000000003', seed_uuid('evt-mlb-5'), seed_uuid('venue-wrigley'), '2025-04-05', seed_uuid('league-mlb'), 'baseball', 4, 'Wrigley Field on a gorgeous April afternoon. Nothing beats it.', 'Section 222, Row 6', 'show_all', seed_uuid('team-chc'), false, 'loss'),
  (seed_uuid('el-sarah-2'), '00000000-0000-0000-0000-000000000003', seed_uuid('evt-mlb-17'), seed_uuid('venue-busch'), '2025-06-21', seed_uuid('league-mlb'), 'baseball', 4, 'Cubs won in St. Louis! Great road trip.', 'Section 140, Row 8', 'show_all', seed_uuid('team-chc'), false, 'win'),
  (seed_uuid('el-sarah-3'), '00000000-0000-0000-0000-000000000003', seed_uuid('evt-mlb-26'), seed_uuid('venue-wrigley'), '2025-08-16', seed_uuid('league-mlb'), 'baseball', 5, 'Walk-off win at Wrigley against the Cardinals. Does not get better.', 'Bleachers', 'show_all', seed_uuid('team-chc'), false, 'win'),
  (seed_uuid('el-sarah-4'), '00000000-0000-0000-0000-000000000003', seed_uuid('evt-nba-4'), seed_uuid('venue-united'), '2025-03-08', seed_uuid('league-nba'), 'basketball', 3, 'Bulls lost but United Center is always fun.', 'Section 302, Row 4', 'show_all', seed_uuid('team-chi-nba'), false, 'loss'),
  (seed_uuid('el-sarah-5'), '00000000-0000-0000-0000-000000000003', seed_uuid('evt-nhl-3'), seed_uuid('venue-united'), '2025-02-22', seed_uuid('league-nhl'), 'hockey', 2, 'Blackhawks got destroyed by the Avs. Painful.', 'Section 119, Row 20', 'show_all', seed_uuid('team-chi-nhl'), false, 'loss'),
  (seed_uuid('el-sarah-6'), '00000000-0000-0000-0000-000000000003', seed_uuid('evt-mlb-33'), seed_uuid('venue-amfam'), '2025-07-05', seed_uuid('league-mlb'), 'baseball', 3, 'Weekend trip to Milwaukee. American Family Field is underrated.', 'Section 205, Row 10', 'show_all', NULL, true, 'neutral')
ON CONFLICT DO NOTHING;

-- ─── DAVE'S EVENT LOGS (~7 events) ───
INSERT INTO event_logs (id, user_id, event_id, venue_id, event_date, league_id, sport, rating, notes, seat_location, privacy, rooting_team_id, is_neutral, outcome) VALUES
  (seed_uuid('el-dave-1'), '00000000-0000-0000-0000-000000000004', seed_uuid('evt-nfl-rs8'), seed_uuid('venue-acrisure'), '2025-09-28', seed_uuid('league-nfl'), 'football', 4, 'Steelers edged the Cowboys. Acrisure was rocking.', 'Section 507, Row 12', 'show_all', seed_uuid('team-pit'), false, 'win'),
  (seed_uuid('el-dave-2'), '00000000-0000-0000-0000-000000000004', seed_uuid('evt-mlb-6'), seed_uuid('venue-pnc'), '2025-04-12', seed_uuid('league-mlb'), 'baseball', 5, 'Beautiful day at PNC Park. Best ballpark in America.', 'Section 128, Row 3', 'show_all', seed_uuid('team-pit-mlb'), false, 'win'),
  (seed_uuid('el-dave-3'), '00000000-0000-0000-0000-000000000004', seed_uuid('evt-mlb-27'), seed_uuid('venue-pnc'), '2025-08-23', seed_uuid('league-mlb'), 'baseball', 4, 'Another day at PNC. Pirates rallied late.', 'Section 116, Row 8', 'show_all', seed_uuid('team-pit-mlb'), false, 'win'),
  (seed_uuid('el-dave-4'), '00000000-0000-0000-0000-000000000004', seed_uuid('evt-nhl-6'), seed_uuid('venue-ppg'), '2025-03-15', seed_uuid('league-nhl'), 'hockey', 4, 'Pens beat Flyers. PPG Paints Arena was electric.', 'Section 108, Row 15', 'show_all', seed_uuid('team-pit-nhl'), false, 'win'),
  (seed_uuid('el-dave-5'), '00000000-0000-0000-0000-000000000004', seed_uuid('evt-mlb-16'), seed_uuid('venue-pnc'), '2025-06-14', seed_uuid('league-mlb'), 'baseball', 5, 'Pirates beat the Yankees! Great night at PNC.', 'Section 109, Row 1', 'show_all', seed_uuid('team-pit-mlb'), false, 'win'),
  (seed_uuid('el-dave-6'), '00000000-0000-0000-0000-000000000004', seed_uuid('evt-nfl-rs17'), seed_uuid('venue-huntington'), '2025-11-27', seed_uuid('league-nfl'), 'football', 3, 'Thanksgiving game in Cleveland. Steelers won.', 'Section 304, Row 7', 'show_all', seed_uuid('team-pit'), false, 'win'),
  (seed_uuid('el-dave-7'), '00000000-0000-0000-0000-000000000004', seed_uuid('evt-mlb-35'), seed_uuid('venue-gabp'), '2025-08-09', seed_uuid('league-mlb'), 'baseball', 4, 'Road trip to Cincinnati. Pirates rallied late for the win.', 'Section 113, Row 8', 'show_all', seed_uuid('team-pit-mlb'), false, 'win')
ON CONFLICT DO NOTHING;

-- ─── MIKE'S EVENT LOGS (~5 events) ───
INSERT INTO event_logs (id, user_id, event_id, venue_id, event_date, league_id, sport, rating, notes, seat_location, privacy, rooting_team_id, is_neutral, outcome) VALUES
  (seed_uuid('el-mike-1'), '00000000-0000-0000-0000-000000000005', seed_uuid('evt-nba-1'), seed_uuid('venue-msg'), '2025-02-14', seed_uuid('league-nba'), 'basketball', 5, 'Knicks crushed Celtics. MSG was on fire.', 'Section 303, Row 2', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  (seed_uuid('el-mike-2'), '00000000-0000-0000-0000-000000000005', seed_uuid('evt-nhl-1'), seed_uuid('venue-msg'), '2025-02-08', seed_uuid('league-nhl'), 'hockey', 4, 'Rangers handled the Islanders. Great rivalry game.', 'Section 225, Row 8', 'show_all', seed_uuid('team-nyr'), false, 'win'),
  (seed_uuid('el-mike-3'), '00000000-0000-0000-0000-000000000005', seed_uuid('evt-nhl-9'), seed_uuid('venue-msg'), '2025-10-08', seed_uuid('league-nhl'), 'hockey', 4, 'Rangers home opener. Electric atmosphere.', 'Section 225, Row 8', 'show_all', seed_uuid('team-nyr'), false, 'win'),
  (seed_uuid('el-mike-4'), '00000000-0000-0000-0000-000000000005', seed_uuid('evt-nba-11'), seed_uuid('venue-msg'), '2025-10-22', seed_uuid('league-nba'), 'basketball', 4, 'Opening night at MSG. What a vibe.', 'Section 303, Row 2', 'show_all', seed_uuid('team-nyk'), false, 'win'),
  (seed_uuid('el-mike-5'), '00000000-0000-0000-0000-000000000005', seed_uuid('evt-nba-17'), seed_uuid('venue-msg'), '2025-12-05', seed_uuid('league-nba'), 'basketball', 5, 'Brunson vs LeBron at MSG. Instant classic.', 'Section 105, Row 14', 'show_all', seed_uuid('team-nyk'), false, 'win')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 11. VENUE VISITS (additional manual ones for Anthony)
-- Note: The trigger already created visits for venues in event_logs.
-- These add want_to_visit entries.
-- ═══════════════════════════════════════════════════════════════

INSERT INTO venue_visits (id, user_id, venue_id, relationship) VALUES
  (seed_uuid('vv-ant-1'),  '00000000-0000-0000-0000-000000000001', seed_uuid('venue-lambeau'),    'want_to_visit'),
  (seed_uuid('vv-ant-2'),  '00000000-0000-0000-0000-000000000001', seed_uuid('venue-fenway'),     'want_to_visit'),
  (seed_uuid('vv-ant-3'),  '00000000-0000-0000-0000-000000000001', seed_uuid('venue-wrigley'),    'want_to_visit'),
  (seed_uuid('vv-ant-4'),  '00000000-0000-0000-0000-000000000001', seed_uuid('venue-dodger'),     'want_to_visit'),
  (seed_uuid('vv-ant-5'),  '00000000-0000-0000-0000-000000000001', seed_uuid('venue-pebble'),     'want_to_visit'),
  (seed_uuid('vv-ant-6'),  '00000000-0000-0000-0000-000000000001', seed_uuid('venue-climate'),    'want_to_visit'),
  (seed_uuid('vv-ant-7'),  '00000000-0000-0000-0000-000000000001', seed_uuid('venue-sofi'),       'want_to_visit')
ON CONFLICT (user_id, venue_id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 12. FOLLOWS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO follows (id, follower_id, following_id, status) VALUES
  -- Anthony follows everyone
  (seed_uuid('follow-ant-kyle'),  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'active'),
  (seed_uuid('follow-ant-sarah'), '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'active'),
  (seed_uuid('follow-ant-dave'),  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000004', 'active'),
  (seed_uuid('follow-ant-mike'),  '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'active'),
  -- Kyle follows Anthony
  (seed_uuid('follow-kyle-ant'),  '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'active'),
  -- Sarah follows Anthony and Kyle
  (seed_uuid('follow-sarah-ant'), '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'active'),
  (seed_uuid('follow-sarah-kyle'),'00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', 'active'),
  -- Dave follows Anthony
  (seed_uuid('follow-dave-ant'),  '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'active')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 13. LIKES (triggers will auto-increment like_count)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO likes (id, user_id, event_log_id) VALUES
  -- Likes on Anthony's logs
  (seed_uuid('like-1'),  '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-1')),   -- Kyle likes SB
  (seed_uuid('like-2'),  '00000000-0000-0000-0000-000000000003', seed_uuid('el-ant-1')),   -- Sarah likes SB
  (seed_uuid('like-3'),  '00000000-0000-0000-0000-000000000004', seed_uuid('el-ant-1')),   -- Dave likes SB
  (seed_uuid('like-4'),  '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-1')),   -- Mike likes SB
  (seed_uuid('like-5'),  '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-5')),   -- Kyle likes NBA Valentine
  (seed_uuid('like-6'),  '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-5')),   -- Mike likes NBA Valentine
  (seed_uuid('like-7'),  '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-7')),   -- Kyle likes Finals
  (seed_uuid('like-8'),  '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-7')),   -- Mike likes Finals
  (seed_uuid('like-9'),  '00000000-0000-0000-0000-000000000003', seed_uuid('el-ant-7')),   -- Sarah likes Finals
  (seed_uuid('like-10'), '00000000-0000-0000-0000-000000000004', seed_uuid('el-ant-7')),   -- Dave likes Finals
  (seed_uuid('like-11'), '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-11')),  -- Mike likes Opening Day
  (seed_uuid('like-12'), '00000000-0000-0000-0000-000000000004', seed_uuid('el-ant-13')),  -- Dave likes PNC Park
  (seed_uuid('like-13'), '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-13')),  -- Kyle likes PNC Park
  (seed_uuid('like-14'), '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-17')),  -- Mike likes Rangers
  (seed_uuid('like-15'), '00000000-0000-0000-0000-000000000003', seed_uuid('el-ant-23')),  -- Sarah likes Masters
  (seed_uuid('like-16'), '00000000-0000-0000-0000-000000000004', seed_uuid('el-ant-23')),  -- Dave likes Masters
  (seed_uuid('like-17'), '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-12')),  -- Kyle likes Judge walk-off
  -- Likes on Kyle's logs
  (seed_uuid('like-18'), '00000000-0000-0000-0000-000000000001', seed_uuid('el-kyle-2')),  -- Anthony likes Kyle SB
  (seed_uuid('like-19'), '00000000-0000-0000-0000-000000000003', seed_uuid('el-kyle-2')),  -- Sarah likes Kyle SB
  -- Likes on Sarah's logs
  (seed_uuid('like-20'), '00000000-0000-0000-0000-000000000001', seed_uuid('el-sarah-3')), -- Anthony likes walk-off
  (seed_uuid('like-21'), '00000000-0000-0000-0000-000000000002', seed_uuid('el-sarah-3')), -- Kyle likes walk-off
  -- Likes on Dave's logs
  (seed_uuid('like-22'), '00000000-0000-0000-0000-000000000001', seed_uuid('el-dave-5')),  -- Anthony likes Dave PNC
  (seed_uuid('like-23'), '00000000-0000-0000-0000-000000000005', seed_uuid('el-dave-2')),  -- Mike likes Dave PNC
  -- Likes on Mike's logs
  (seed_uuid('like-24'), '00000000-0000-0000-0000-000000000001', seed_uuid('el-mike-1')),  -- Anthony likes Mike Knicks
  (seed_uuid('like-25'), '00000000-0000-0000-0000-000000000002', seed_uuid('el-mike-5')),  -- Kyle likes Mike MSG
  -- Cross likes
  (seed_uuid('like-26'), '00000000-0000-0000-0000-000000000001', seed_uuid('el-kyle-1')),  -- Anthony likes Kyle Eagles
  (seed_uuid('like-27'), '00000000-0000-0000-0000-000000000004', seed_uuid('el-ant-16')),  -- Dave likes Subway WS
  (seed_uuid('like-28'), '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-16')),  -- Mike likes Subway WS
  (seed_uuid('like-29'), '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-6')),   -- Kyle likes ECF G3
  (seed_uuid('like-30'), '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-9'))    -- Mike likes Brunson vs LeBron
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 14. COMMENTS (triggers will auto-increment comment_count)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO comments (id, user_id, event_log_id, body) VALUES
  (seed_uuid('com-1'),  '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-1'),  'What a game! I was there too. Eagles dominated.'),
  (seed_uuid('com-2'),  '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-1'),  'Jealous you were there. What an experience that must have been.'),
  (seed_uuid('com-3'),  '00000000-0000-0000-0000-000000000004', seed_uuid('el-ant-1'),  'Bucket list game for sure.'),
  (seed_uuid('com-4'),  '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-5'),  'Brunson is that guy. MSG on Valentine Day is iconic.'),
  (seed_uuid('com-5'),  '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-7'),  'Finals at MSG?! That is once in a lifetime.'),
  (seed_uuid('com-6'),  '00000000-0000-0000-0000-000000000003', seed_uuid('el-ant-7'),  'So jealous. I need to get to a Knicks game at MSG.'),
  (seed_uuid('com-7'),  '00000000-0000-0000-0000-000000000004', seed_uuid('el-ant-13'), 'PNC Park is beautiful. Glad you got to experience it.'),
  (seed_uuid('com-8'),  '00000000-0000-0000-0000-000000000001', seed_uuid('el-dave-5'), 'Was great running into you at PNC! What a game.'),
  (seed_uuid('com-9'),  '00000000-0000-0000-0000-000000000001', seed_uuid('el-kyle-2'), 'Still can not believe we were both at the Super Bowl. Epic night.'),
  (seed_uuid('com-10'), '00000000-0000-0000-0000-000000000001', seed_uuid('el-sarah-3'),'Walk-offs at Wrigley hit different. Great photo.'),
  (seed_uuid('com-11'), '00000000-0000-0000-0000-000000000005', seed_uuid('el-ant-23'), 'Augusta is on my bucket list. How do you even get tickets?'),
  (seed_uuid('com-12'), '00000000-0000-0000-0000-000000000002', seed_uuid('el-ant-12'), 'Judge walk-off HRs are unmatched. Stadium must have been going crazy.'),
  (seed_uuid('com-13'), '00000000-0000-0000-0000-000000000001', seed_uuid('el-mike-5'), 'We were both at this game! What a night at MSG.'),
  (seed_uuid('com-14'), '00000000-0000-0000-0000-000000000004', seed_uuid('el-ant-16'), 'Subway World Series is the dream. So happy for you.'),
  (seed_uuid('com-15'), '00000000-0000-0000-0000-000000000003', seed_uuid('el-ant-9'),  'LeBron vs Brunson at MSG is must-see TV. Even better in person.')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 15. COMPANION TAGS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO companion_tags (id, event_log_id, tagged_user_id, display_name) VALUES
  -- Anthony tagged companions
  (seed_uuid('ct-1'), seed_uuid('el-ant-1'),  '00000000-0000-0000-0000-000000000002', '@kyle'),
  (seed_uuid('ct-2'), seed_uuid('el-ant-5'),  '00000000-0000-0000-0000-000000000005', '@mike'),
  (seed_uuid('ct-3'), seed_uuid('el-ant-7'),  '00000000-0000-0000-0000-000000000005', '@mike'),
  (seed_uuid('ct-4'), seed_uuid('el-ant-7'),  '00000000-0000-0000-0000-000000000004', '@dave'),
  (seed_uuid('ct-5'), seed_uuid('el-ant-11'), '00000000-0000-0000-0000-000000000004', '@dave'),
  (seed_uuid('ct-6'), seed_uuid('el-ant-13'), '00000000-0000-0000-0000-000000000004', '@dave'),
  (seed_uuid('ct-7'), seed_uuid('el-ant-17'), '00000000-0000-0000-0000-000000000005', '@mike'),
  (seed_uuid('ct-8'), seed_uuid('el-ant-3'),  NULL, 'my dad'),
  (seed_uuid('ct-9'), seed_uuid('el-ant-16'), '00000000-0000-0000-0000-000000000002', '@kyle'),
  (seed_uuid('ct-10'), seed_uuid('el-ant-9'), '00000000-0000-0000-0000-000000000005', '@mike')
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 16. USER LEAGUE FAVORITES (Big Four drill-through) for Anthony
-- ═══════════════════════════════════════════════════════════════

INSERT INTO user_league_favorites (id, user_id, category, league_id, team_id, is_featured) VALUES
  (seed_uuid('ulf-ant-team-nfl'), '00000000-0000-0000-0000-000000000001', 'team', seed_uuid('league-nfl'), seed_uuid('team-phi'), true),
  (seed_uuid('ulf-ant-team-nba'), '00000000-0000-0000-0000-000000000001', 'team', seed_uuid('league-nba'), seed_uuid('team-nyk'), true),
  (seed_uuid('ulf-ant-team-mlb'), '00000000-0000-0000-0000-000000000001', 'team', seed_uuid('league-mlb'), seed_uuid('team-nyy'), true),
  (seed_uuid('ulf-ant-team-nhl'), '00000000-0000-0000-0000-000000000001', 'team', seed_uuid('league-nhl'), seed_uuid('team-nyr'), true),
  (seed_uuid('ulf-ant-team-mls'), '00000000-0000-0000-0000-000000000001', 'team', seed_uuid('league-mls'), seed_uuid('team-nyc-mls'), false)
ON CONFLICT DO NOTHING;

INSERT INTO user_league_favorites (id, user_id, category, league_id, venue_id, is_featured) VALUES
  (seed_uuid('ulf-ant-venue-nba'), '00000000-0000-0000-0000-000000000001', 'venue', seed_uuid('league-nba'), seed_uuid('venue-msg'), true),
  (seed_uuid('ulf-ant-venue-mlb'), '00000000-0000-0000-0000-000000000001', 'venue', seed_uuid('league-mlb'), seed_uuid('venue-pnc'), true),
  (seed_uuid('ulf-ant-venue-nfl'), '00000000-0000-0000-0000-000000000001', 'venue', seed_uuid('league-nfl'), seed_uuid('venue-lincoln'), true),
  (seed_uuid('ulf-ant-venue-nhl'), '00000000-0000-0000-0000-000000000001', 'venue', seed_uuid('league-nhl'), seed_uuid('venue-msg'), false)
ON CONFLICT DO NOTHING;

INSERT INTO user_league_favorites (id, user_id, category, league_id, athlete_id, is_featured) VALUES
  (seed_uuid('ulf-ant-ath-nba'), '00000000-0000-0000-0000-000000000001', 'athlete', seed_uuid('league-nba'), seed_uuid('athlete-brunson'), true),
  (seed_uuid('ulf-ant-ath-mlb'), '00000000-0000-0000-0000-000000000001', 'athlete', seed_uuid('league-mlb'), seed_uuid('athlete-judge'), true),
  (seed_uuid('ulf-ant-ath-nfl'), '00000000-0000-0000-0000-000000000001', 'athlete', seed_uuid('league-nfl'), seed_uuid('athlete-hurts'), false),
  (seed_uuid('ulf-ant-ath-nhl'), '00000000-0000-0000-0000-000000000001', 'athlete', seed_uuid('league-nhl'), seed_uuid('athlete-mcdavid'), false)
ON CONFLICT DO NOTHING;

INSERT INTO user_league_favorites (id, user_id, category, league_id, event_id, is_featured) VALUES
  (seed_uuid('ulf-ant-evt-nba'), '00000000-0000-0000-0000-000000000001', 'event', seed_uuid('league-nba'), seed_uuid('evt-nba-p8'), true),
  (seed_uuid('ulf-ant-evt-mlb'), '00000000-0000-0000-0000-000000000001', 'event', seed_uuid('league-mlb'), seed_uuid('evt-mlb-16'), true),
  (seed_uuid('ulf-ant-evt-nfl'), '00000000-0000-0000-0000-000000000001', 'event', seed_uuid('league-nfl'), seed_uuid('evt-nfl-sb'), true)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 17. LIST FOLLOWS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO list_follows (id, user_id, list_id) VALUES
  (seed_uuid('lf-ant-mlb'), '00000000-0000-0000-0000-000000000001', seed_uuid('list-mlb-stadiums')),
  (seed_uuid('lf-ant-nfl'), '00000000-0000-0000-0000-000000000001', seed_uuid('list-nfl-stadiums')),
  (seed_uuid('lf-ant-nba'), '00000000-0000-0000-0000-000000000001', seed_uuid('list-nba-arenas')),
  (seed_uuid('lf-ant-nhl'), '00000000-0000-0000-0000-000000000001', seed_uuid('list-nhl-arenas')),
  (seed_uuid('lf-ant-pga'), '00000000-0000-0000-0000-000000000001', seed_uuid('list-pga-majors')),
  (seed_uuid('lf-kyle-mlb'),'00000000-0000-0000-0000-000000000002', seed_uuid('list-mlb-stadiums')),
  (seed_uuid('lf-kyle-nfl'),'00000000-0000-0000-0000-000000000002', seed_uuid('list-nfl-stadiums')),
  (seed_uuid('lf-sarah-mlb'),'00000000-0000-0000-0000-000000000003', seed_uuid('list-mlb-stadiums')),
  (seed_uuid('lf-dave-mlb'),'00000000-0000-0000-0000-000000000004', seed_uuid('list-mlb-stadiums')),
  (seed_uuid('lf-dave-nfl'),'00000000-0000-0000-0000-000000000004', seed_uuid('list-nfl-stadiums'))
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- CLEANUP: Drop the helper function
-- ═══════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS seed_uuid(text);

COMMIT;

-- ═══════════════════════════════════════════════════════════════
-- SEED COMPLETE
-- ═══════════════════════════════════════════════════════════════
