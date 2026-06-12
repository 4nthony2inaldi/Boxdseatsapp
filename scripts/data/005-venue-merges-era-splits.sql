CREATE OR REPLACE FUNCTION pg_temp.merge_venue(old_id uuid, new_id uuid, nat text) RETURNS void AS $$
DECLARE old_name text; old_photo text; old_espn text;
BEGIN
  IF old_id IS NULL OR new_id IS NULL THEN RAISE EXCEPTION 'merge_venue: null id'; END IF;
  SELECT name, photo_url, external_ids->>'espn' INTO old_name, old_photo, old_espn FROM venues WHERE id=old_id;
  UPDATE events SET venue_id=new_id, venue_name_at_time=COALESCE(venue_name_at_time, nat, old_name) WHERE venue_id=old_id;
  UPDATE event_logs SET venue_id=new_id WHERE venue_id=old_id;
  UPDATE venue_visits SET venue_id=new_id WHERE venue_id=old_id
    AND NOT EXISTS (SELECT 1 FROM venue_visits x WHERE x.venue_id=new_id AND x.user_id=venue_visits.user_id);
  DELETE FROM venue_visits WHERE venue_id=old_id;
  UPDATE profiles SET fav_venue_id=new_id WHERE fav_venue_id=old_id;
  UPDATE user_league_favorites SET venue_id=new_id WHERE venue_id=old_id;
  UPDATE list_items SET venue_id=new_id WHERE venue_id=old_id
    AND NOT EXISTS (SELECT 1 FROM list_items x WHERE x.venue_id=new_id AND x.list_id=list_items.list_id);
  DELETE FROM list_items WHERE venue_id=old_id;
  UPDATE venue_teams SET venue_id=new_id WHERE venue_id=old_id
    AND NOT EXISTS (SELECT 1 FROM venue_teams x WHERE x.venue_id=new_id AND x.team_id=venue_teams.team_id);
  DELETE FROM venue_teams WHERE venue_id=old_id;
  UPDATE venue_aliases SET venue_id=new_id WHERE venue_id=old_id
    AND NOT EXISTS (SELECT 1 FROM venue_aliases x WHERE x.venue_id=new_id AND x.alias_name=venue_aliases.alias_name);
  DELETE FROM venue_aliases WHERE venue_id=old_id;
  INSERT INTO venue_aliases (venue_id, alias_name) VALUES (new_id, btrim(old_name)) ON CONFLICT DO NOTHING;
  UPDATE venues SET photo_url=COALESCE(photo_url, old_photo),
                    external_ids = external_ids || jsonb_build_object('espn_legacy',
                      COALESCE(external_ids->'espn_legacy','[]'::jsonb) || to_jsonb(ARRAY[old_espn]))
    WHERE id=new_id AND old_espn IS NOT NULL;
  DELETE FROM venues WHERE id=old_id;
END $$ LANGUAGE plpgsql;

-- Clearwater: one park, three eras
SELECT pg_temp.merge_venue(
  (SELECT id FROM venues WHERE name='Spectrum Field'),
  (SELECT id FROM venues WHERE name='BayCare Ballpark'), 'Spectrum Field');
UPDATE events SET venue_name_at_time='Bright House Field'
WHERE venue_id=(SELECT id FROM venues WHERE name='BayCare Ballpark') AND event_date < '2017-01-01';
UPDATE events SET venue_name_at_time='Spectrum Field'
WHERE venue_id=(SELECT id FROM venues WHERE name='BayCare Ballpark')
  AND event_date >= '2017-01-01' AND event_date < '2021-01-01';

-- RFK spelling variants (prod has two 'RFK Memorial Stadium' rows)
DO $do$ DECLARE r record; tgt uuid;
BEGIN
  SELECT id INTO tgt FROM venues WHERE name='RFK Stadium';
  FOR r IN SELECT id FROM venues WHERE name IN ('RFK Memorial Stadium','R.F.K. Stadium') LOOP
    PERFORM pg_temp.merge_venue(r.id, tgt, 'RFK Stadium');
  END LOOP;
END $do$;

-- Frisco: Pizza Hut Park -> Toyota Stadium (2012 rename)
SELECT pg_temp.merge_venue(
  (SELECT id FROM venues WHERE name='Pizza Hut Park'),
  (SELECT id FROM venues WHERE name='Toyota Stadium' AND city='Frisco'), 'Pizza Hut Park');

-- Miami: Marlins Park -> loanDepot park (2021 rename)
SELECT pg_temp.merge_venue(
  (SELECT id FROM venues WHERE name='Marlins Park'),
  (SELECT id FROM venues WHERE name='loanDepot Park'), NULL);
UPDATE events SET venue_name_at_time='Marlins Park'
WHERE venue_id=(SELECT id FROM venues WHERE name='loanDepot Park') AND event_date < '2021-01-01';

-- Milwaukee: Miller Park -> American Family Field (2021 rename)
SELECT pg_temp.merge_venue(
  (SELECT id FROM venues WHERE name='Miller Park'),
  (SELECT id FROM venues WHERE name='American Family Field'), NULL);
UPDATE events SET venue_name_at_time='Miller Park'
WHERE venue_id=(SELECT id FROM venues WHERE name='American Family Field') AND event_date < '2021-01-01';

-- San Francisco: Monster Park was Candlestick 2004-08
SELECT pg_temp.merge_venue(
  (SELECT id FROM venues WHERE name='Monster Park'),
  (SELECT id FROM venues WHERE name='Candlestick Park'), 'Monster Park');
UPDATE events SET venue_name_at_time='Monster Park'
WHERE venue_id=(SELECT id FROM venues WHERE name='Candlestick Park')
  AND event_date >= '2004-09-01' AND event_date < '2009-01-01' AND venue_name_at_time IS NULL;

-- Cubs 2014 spring homes carried Hohokam's ESPN id but were played at the new park
UPDATE events SET venue_id=(SELECT id FROM venues WHERE name='Sloan Park'), venue_name_at_time='Cubs Park'
WHERE venue_id=(SELECT id FROM venues WHERE name='Hohokam Stadium')
  AND is_preseason AND event_date >= '2014-01-01'
  AND home_team_id=(SELECT id FROM teams WHERE name='Chicago Cubs');

-- Montreal Expos home: mis-resolved to Berlin's Olympiastadion
UPDATE venues SET name='Olympic Stadium', city='Montreal', state='QC', country='CA', primary_sport='baseball'
WHERE name='Olympic Stadium Berlin';
INSERT INTO venue_aliases (venue_id, alias_name)
  SELECT id, 'Stade Olympique' FROM venues WHERE name='Olympic Stadium' AND city='Montreal' ON CONFLICT DO NOTHING;

-- Name hygiene
UPDATE venues SET name=btrim(name) WHERE name <> btrim(name);
UPDATE venues SET city='Santa Clara', state='CA' WHERE name='Buck Shaw Stadium' AND city='Unknown';
UPDATE venues SET city='Kansas City', state='KS' WHERE name='Community America Ballpark' AND city='Unknown';

-- Duplicate-event check (same venue+date+home team twice)
SELECT 'DUPES', count(*) FROM (
  SELECT venue_id, event_date, home_team_id FROM events WHERE home_team_id IS NOT NULL
  GROUP BY 1,2,3 HAVING count(*) > 1
) d;
