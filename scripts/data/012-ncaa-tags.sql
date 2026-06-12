-- Tag NCAA tournament rounds for the event-list / badge system.
UPDATE events e SET event_tags =
  (SELECT array_agg(DISTINCT t) FROM unnest(
     coalesce(e.event_tags,'{}') ||
     ARRAY['march_madness']::text[] ||
     CASE WHEN e.round_or_stage ILIKE '%final four%' THEN ARRAY['final_four'] ELSE '{}'::text[] END ||
     CASE WHEN e.round_or_stage ILIKE '%national championship%'
            OR e.round_or_stage = 'CHAMPIONSHIP' OR e.round_or_stage ILIKE 'CHAMPIONSHIP AT%'
          THEN ARRAY['ncaa_championship'] ELSE '{}'::text[] END
   ) t)
FROM leagues l WHERE l.id=e.league_id AND l.slug IN ('ncaam','ncaaw');

-- Event-type system lists ("I was there" tournament milestones).
INSERT INTO lists (name, description, list_type, source, sport, is_featured, item_count)
SELECT * FROM (VALUES
  ('Final Fours', 'Attend a Final Four — the holy grail of college hoops.', 'event', 'system', 'basketball', false, 1),
  ('NCAA Title Games', 'Be in the building for a national championship.', 'event', 'system', 'basketball', false, 1)
) v(name,description,list_type,source,sport,is_featured,item_count)
WHERE NOT EXISTS (SELECT 1 FROM lists WHERE source='system' AND name=v.name);

INSERT INTO list_items (list_id, event_tag, display_name, display_order)
SELECT id, 'final_four', 'Final Four', 1 FROM lists WHERE source='system' AND name='Final Fours'
  AND NOT EXISTS (SELECT 1 FROM list_items li WHERE li.list_id=lists.id);
INSERT INTO list_items (list_id, event_tag, display_name, display_order)
SELECT id, 'ncaa_championship', 'National Championship', 1 FROM lists WHERE source='system' AND name='NCAA Title Games'
  AND NOT EXISTS (SELECT 1 FROM list_items li WHERE li.list_id=lists.id);

SELECT 'final_four' AS tag, count(*) FROM events WHERE 'final_four'=ANY(event_tags)
UNION ALL SELECT 'ncaa_championship', count(*) FROM events WHERE 'ncaa_championship'=ANY(event_tags)
UNION ALL SELECT 'march_madness', count(*) FROM events WHERE 'march_madness'=ANY(event_tags);
