-- Around You: home city on profiles + nearby-events RPC (v2: cursor pagination)
-- APPLIED TO PRODUCTION + STAGING via Management API.
-- v2 drops the hard lookback bound: the feed carousel always fills (the
-- nearest events regardless of age) and pages backward in time via in_before.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_city text;

DROP FUNCTION IF EXISTS events_near(double precision, double precision, double precision, date, date);

CREATE OR REPLACE FUNCTION events_near(
  in_lat double precision,
  in_lng double precision,
  in_radius_m double precision,
  in_until date,                -- include events up to this date (future bound)
  in_before date DEFAULT NULL,  -- cursor: only events strictly before this date
  in_limit int DEFAULT 30
)
RETURNS TABLE (
  event_id uuid,
  event_date date,
  tournament_name text,
  home_team text,
  away_team text,
  home_logo text,
  away_logo text,
  home_score int,
  away_score int,
  league_slug text,
  sport text,
  venue_id uuid,
  venue_name text,
  venue_photo text,
  cover_photo_url text,
  tournament_id uuid,
  distance_m double precision
)
LANGUAGE sql STABLE AS $$
  SELECT e.id, e.event_date, e.tournament_name,
         ht.short_name, at.short_name, ht.logo_url, at.logo_url,
         e.home_score, e.away_score,
         l.slug, l.sport,
         v.id, v.name, v.photo_url, e.cover_photo_url, e.tournament_id,
         ST_Distance(v.location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography)
  FROM events e
  JOIN venues v ON v.id = e.venue_id
  JOIN leagues l ON l.id = e.league_id
  LEFT JOIN teams ht ON ht.id = e.home_team_id
  LEFT JOIN teams at ON at.id = e.away_team_id
  WHERE v.location IS NOT NULL
    AND ST_DWithin(v.location, ST_SetSRID(ST_MakePoint(in_lng, in_lat), 4326)::geography, in_radius_m)
    AND e.event_date <= in_until
    AND (in_before IS NULL OR e.event_date < in_before)
  ORDER BY e.event_date DESC
  LIMIT LEAST(in_limit, 60);
$$;

GRANT EXECUTE ON FUNCTION events_near(double precision, double precision, double precision, date, date, int) TO authenticated, anon;
