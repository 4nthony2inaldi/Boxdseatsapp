-- Individual-sport leagues (ATP, WTA, PGA, NASCAR, IndyCar, F1) have no
-- teams, so the "team" favorite slot for those leagues stores an athlete.
-- Relax check_category_fk: category 'team' holds exactly one of
-- team_id / athlete_id; other categories unchanged.

ALTER TABLE public.user_league_favorites
  DROP CONSTRAINT check_category_fk;

ALTER TABLE public.user_league_favorites
  ADD CONSTRAINT check_category_fk CHECK (
    CASE category
      WHEN 'team' THEN (
        ((team_id IS NOT NULL)::int + (athlete_id IS NOT NULL)::int) = 1
        AND venue_id IS NULL AND event_id IS NULL
      )
      WHEN 'athlete' THEN (
        athlete_id IS NOT NULL
        AND team_id IS NULL AND venue_id IS NULL AND event_id IS NULL
      )
      WHEN 'venue' THEN (
        venue_id IS NOT NULL
        AND team_id IS NULL AND athlete_id IS NULL AND event_id IS NULL
      )
      WHEN 'event' THEN (
        event_id IS NOT NULL
        AND team_id IS NULL AND athlete_id IS NULL AND venue_id IS NULL
      )
      ELSE NULL::boolean
    END
  );
