-- Rebuild Grounds lists from each league's single most-recent season.
DO $$
DECLARE lg record; vr record; new_list uuid; ord int; cnt int; maxseason int;
BEGIN
  -- clear prior attempts
  DELETE FROM list_items WHERE list_id IN (SELECT id FROM lists WHERE source='system' AND name LIKE '% Grounds' AND sport='soccer');
  DELETE FROM lists WHERE source='system' AND name LIKE '% Grounds' AND sport='soccer';

  -- Domestic leagues with stable home grounds get a "Grounds" challenge list.
  -- (Tournaments and knockout cups -- World Cup, Euros, Champions/Europa League,
  -- the FA Cup, etc. -- are excluded: their venues change every edition and
  -- finals are at neutral sites, so "visit them all" isn't a meaningful list.)
  FOR lg IN SELECT id, slug, name FROM leagues WHERE slug IN
    ('eng.1','esp.1','ger.1','ita.1','fra.1','mex.1','eng.2','por.1','ned.1','sco.1') LOOP
    SELECT max(season) INTO maxseason FROM events WHERE league_id = lg.id;
    INSERT INTO lists (name, description, list_type, source, sport, league_id, is_featured, item_count)
    VALUES (lg.name || ' Grounds', 'Visit every ' || lg.name || ' ground from the latest season.', 'venue', 'system', 'soccer', lg.id, false, 0)
    RETURNING id INTO new_list;
    ord := 0;
    FOR vr IN
      SELECT DISTINCT v.id AS vid, v.name AS vname
      FROM events e JOIN venues v ON v.id = e.venue_id
      WHERE e.league_id = lg.id AND e.season = maxseason
      ORDER BY v.name
    LOOP
      ord := ord + 1;
      INSERT INTO list_items (list_id, venue_id, display_name, display_order) VALUES (new_list, vr.vid, vr.vname, ord);
    END LOOP;
    SELECT count(*) INTO cnt FROM list_items WHERE list_id = new_list;
    UPDATE lists SET item_count = cnt WHERE id = new_list;
  END LOOP;
END $$;
SELECT name, item_count FROM lists WHERE source='system' AND name LIKE '% Grounds' AND sport='soccer' ORDER BY name;
