-- ═══════════════════════════════════════════════════════════════
-- SYSTEM LIST EXPANSION — new sports' challenges
-- Idempotent: guarded by list name. Memberships are derived from real
-- event data (current circuits = venues hosting events in season >= 2025).
-- Run after the field-sport + preseason data is loaded.
-- ═══════════════════════════════════════════════════════════════

-- ─── Venue lists from current circuits ───

DO $$
DECLARE
  spec RECORD;
  v_list_id uuid;
  v_count int;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('NASCAR Cup Tracks',
       'Take the checkered flag at every track on the current NASCAR Cup Series schedule.',
       'nascar-cup', 'motorsports'::sport_type),
      ('IndyCar Tracks',
       'From the Brickyard to the streets: visit every circuit on the current IndyCar calendar.',
       'indycar', 'motorsports'::sport_type),
      ('Formula 1 Circuits',
       'A world tour — attend a Grand Prix at every circuit on the current F1 calendar.',
       'f1', 'motorsports'::sport_type)
    ) AS t(list_name, descr, league_slug, sport)
  LOOP
    IF EXISTS (SELECT 1 FROM lists WHERE name = spec.list_name) THEN CONTINUE; END IF;

    INSERT INTO lists (name, description, list_type, source, sport, league_id, item_count)
    VALUES (spec.list_name, spec.descr, 'venue', 'system', spec.sport,
            (SELECT id FROM leagues WHERE slug = spec.league_slug), 0)
    RETURNING id INTO v_list_id;

    INSERT INTO list_items (list_id, venue_id, display_name, display_order)
    SELECT v_list_id, v.id, v.name,
           row_number() OVER (ORDER BY v.name)
    FROM venues v
    WHERE v.id IN (
      SELECT DISTINCT e.venue_id FROM events e
      JOIN leagues l ON l.id = e.league_id
      WHERE l.slug = spec.league_slug AND e.season >= 2025
    )
    AND v.status = 'active';

    SELECT count(*) INTO v_count FROM list_items WHERE list_id = v_list_id;
    UPDATE lists SET item_count = v_count WHERE id = v_list_id;
  END LOOP;
END $$;

-- ─── All MLS Stadiums (primary home grounds of active clubs) ───

DO $$
DECLARE
  v_list_id uuid;
  v_count int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lists WHERE name = 'All MLS Stadiums') THEN
    INSERT INTO lists (name, description, list_type, source, sport, league_id, item_count)
    VALUES ('All MLS Stadiums',
            'Visit the home ground of every active Major League Soccer club.',
            'venue', 'system', 'soccer',
            (SELECT id FROM leagues WHERE slug = 'mls'), 0)
    RETURNING id INTO v_list_id;

    INSERT INTO list_items (list_id, venue_id, display_name, display_order)
    SELECT v_list_id, v.id, v.name, row_number() OVER (ORDER BY v.name)
    FROM venues v
    WHERE v.id IN (
      SELECT DISTINCT vt.venue_id FROM venue_teams vt
      JOIN teams t ON t.id = vt.team_id
      JOIN leagues l ON l.id = t.league_id
      WHERE l.slug = 'mls' AND vt.is_primary AND t.is_active
    )
    AND v.status = 'active';

    SELECT count(*) INTO v_count FROM list_items WHERE list_id = v_list_id;
    UPDATE lists SET item_count = v_count WHERE id = v_list_id;
  END IF;
END $$;

-- ─── Spring training: Cactus League (AZ) & Grapefruit League (FL) ───
-- Threshold of 8+ recent spring games filters out one-off exhibition sites.

DO $$
DECLARE
  spec RECORD;
  v_list_id uuid;
  v_count int;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('Cactus League Parks', 'AZ',
       'Soak up the Arizona sun at every Cactus League spring training park.'),
      ('Grapefruit League Parks', 'FL',
       'Catch spring baseball at every Grapefruit League park across Florida.')
    ) AS t(list_name, st, descr)
  LOOP
    IF EXISTS (SELECT 1 FROM lists WHERE name = spec.list_name) THEN CONTINUE; END IF;

    INSERT INTO lists (name, description, list_type, source, sport, league_id, item_count)
    VALUES (spec.list_name, spec.descr, 'venue', 'system', 'baseball',
            (SELECT id FROM leagues WHERE slug = 'mlb'), 0)
    RETURNING id INTO v_list_id;

    INSERT INTO list_items (list_id, venue_id, display_name, display_order)
    SELECT v_list_id, v.id, v.name, row_number() OVER (ORDER BY v.name)
    FROM venues v
    WHERE v.status = 'active' AND v.state = spec.st AND v.id IN (
      SELECT e.venue_id FROM events e
      JOIN leagues l ON l.id = e.league_id
      WHERE l.slug = 'mlb' AND e.is_preseason AND e.season >= 2025
      GROUP BY e.venue_id
      HAVING count(*) >= 8
    );

    SELECT count(*) INTO v_count FROM list_items WHERE list_id = v_list_id;
    UPDATE lists SET item_count = v_count WHERE id = v_list_id;
  END LOOP;
END $$;

-- ─── NASCAR Crown Jewels (event-type, tag-driven like Grand Slams) ───

-- Tag the qualifying races (idempotent appends)
UPDATE events SET event_tags = coalesce(event_tags, '{}') || '{nascar_daytona_500,nascar_crown_jewel}'
WHERE tournament_name ILIKE '%Daytona 500%'
  AND tournament_name NOT ILIKE '%Duel%'
  AND NOT ('nascar_daytona_500' = ANY(coalesce(event_tags, '{}')));

-- ESPN names most Cup races generically ("NASCAR Cup Series at Charlotte"),
-- so the remaining jewels are identified by venue + calendar window.

UPDATE events SET event_tags = coalesce(event_tags, '{}') || '{nascar_coca_cola_600,nascar_crown_jewel}'
WHERE league_id = (SELECT id FROM leagues WHERE slug = 'nascar-cup')
  AND venue_id IN (SELECT id FROM venues WHERE name ILIKE '%Charlotte Motor Speedway%')
  AND to_char(event_date, 'MM-DD') BETWEEN '05-20' AND '06-02'
  AND NOT ('nascar_coca_cola_600' = ANY(coalesce(event_tags, '{}')));

UPDATE events SET event_tags = coalesce(event_tags, '{}') || '{nascar_southern_500,nascar_crown_jewel}'
WHERE league_id = (SELECT id FROM leagues WHERE slug = 'nascar-cup')
  AND venue_id IN (SELECT id FROM venues WHERE name ILIKE '%Darlington%')
  AND to_char(event_date, 'MM-DD') BETWEEN '08-28' AND '09-10'
  AND NOT ('nascar_southern_500' = ANY(coalesce(event_tags, '{}')));

UPDATE events SET event_tags = coalesce(event_tags, '{}') || '{nascar_brickyard_400,nascar_crown_jewel}'
WHERE league_id = (SELECT id FROM leagues WHERE slug = 'nascar-cup')
  AND venue_id IN (SELECT id FROM venues WHERE name ILIKE '%Indianapolis Motor Speedway%')
  AND extract(month FROM event_date) = 7
  AND season >= 2024  -- 2023 ran the IMS road course (not the Brickyard 400)
  AND NOT ('nascar_brickyard_400' = ANY(coalesce(event_tags, '{}')));

DO $$
DECLARE
  v_list_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM lists WHERE name = 'NASCAR Crown Jewels') THEN
    INSERT INTO lists (name, description, list_type, source, sport, league_id, item_count)
    VALUES ('NASCAR Crown Jewels',
            'Attend the four biggest races on the NASCAR calendar: the Daytona 500, Coca-Cola 600, Southern 500, and Brickyard 400.',
            'event', 'system', 'motorsports',
            (SELECT id FROM leagues WHERE slug = 'nascar-cup'), 4)
    RETURNING id INTO v_list_id;

    INSERT INTO list_items (list_id, event_tag, display_name, display_order) VALUES
      (v_list_id, 'nascar_daytona_500',   'Daytona 500',    1),
      (v_list_id, 'nascar_coca_cola_600', 'Coca-Cola 600',  2),
      (v_list_id, 'nascar_southern_500',  'Southern 500',   3),
      (v_list_id, 'nascar_brickyard_400', 'Brickyard 400',  4);
  END IF;
END $$;
