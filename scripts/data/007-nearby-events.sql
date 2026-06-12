-- Around You: home city on profiles + nearby-events RPC over venue coordinates
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS home_city text;

CREATE OR REPLACE FUNCTION events_near(
  in_lat double precision,
  in_lng double precision,
  in_radius_m double precision,
  in_from date,
  in_to date
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
    AND e.event_date BETWEEN in_from AND in_to
  ORDER BY e.event_date DESC
  LIMIT 60;
$$;

GRANT EXECUTE ON FUNCTION events_near(double precision, double precision, double precision, date, date) TO authenticated, anon;
