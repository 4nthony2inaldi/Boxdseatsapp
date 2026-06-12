DO $$
DECLARE l1 uuid; l2 uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lists WHERE source='system' AND name='Final Fours') THEN
    INSERT INTO lists (name, description, list_type, source, sport, is_featured, item_count)
    VALUES ('Final Fours','Attend a Final Four — the holy grail of college hoops.','event','system','basketball',false,1)
    RETURNING id INTO l1;
    INSERT INTO list_items (list_id, event_tag, display_name, display_order) VALUES (l1,'final_four','Final Four',1);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM lists WHERE source='system' AND name='NCAA Title Games') THEN
    INSERT INTO lists (name, description, list_type, source, sport, is_featured, item_count)
    VALUES ('NCAA Title Games','Be in the building for a national championship.','event','system','basketball',false,1)
    RETURNING id INTO l2;
    INSERT INTO list_items (list_id, event_tag, display_name, display_order) VALUES (l2,'ncaa_championship','National Championship',1);
  END IF;
END $$;
SELECT name, item_count FROM lists WHERE source='system' AND name IN ('Final Fours','NCAA Title Games');
