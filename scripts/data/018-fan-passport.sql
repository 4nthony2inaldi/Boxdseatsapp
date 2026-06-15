-- Fan Passport: a shareable overview page.
--  - passport_config holds the user's choices (which list "rings" to feature,
--    which sections to show). Null = sensible defaults.
--  - passport_venues returns a user's visited venues with coordinates + the
--    number of games they've logged there, for the heat-bubble map. It runs as
--    the CALLER (security invoker) so venue_visits/event_logs RLS enforces
--    privacy automatically — a public profile's venues are visible to anyone,
--    a private profile's are not.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS passport_config jsonb;

CREATE OR REPLACE FUNCTION public.passport_venues(p_user uuid)
RETURNS TABLE (
  venue_id uuid,
  name text,
  city text,
  state text,
  sport text,
  photo_url text,
  lat double precision,
  lng double precision,
  games bigint
)
LANGUAGE sql STABLE
SET search_path = public, extensions
AS $$
  SELECT v.id, v.name, v.city, v.state, v.primary_sport, v.photo_url,
         ST_Y(v.location::geometry), ST_X(v.location::geometry),
         count(e.id)
  FROM venue_visits vv
  JOIN venues v ON v.id = vv.venue_id
  LEFT JOIN event_logs e ON e.venue_id = v.id AND e.user_id = p_user
  WHERE vv.user_id = p_user
    AND vv.relationship = 'visited'
    AND v.location IS NOT NULL
  GROUP BY v.id;
$$;

GRANT EXECUTE ON FUNCTION public.passport_venues(uuid) TO anon, authenticated;
