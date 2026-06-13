-- Stack-rank favorites within each category. Lower rank = higher priority;
-- rank 0 is the featured pick shown on the profile. Replaces the single
-- "is_featured" star with an ordered ranking per (user, category).

ALTER TABLE public.user_league_favorites
  ADD COLUMN IF NOT EXISTS rank integer;

-- Backfill: preserve each user's existing featured pick as #1, then order
-- the rest by creation time. Matching is per-category against profiles.fav_*.
WITH ranked AS (
  SELECT
    f.id,
    row_number() OVER (
      PARTITION BY f.user_id, f.category
      ORDER BY
        CASE WHEN (
              (f.category = 'team'    AND f.team_id    = p.fav_team_id)
           OR (f.category = 'venue'   AND f.venue_id   = p.fav_venue_id)
           OR (f.category = 'athlete' AND f.athlete_id = p.fav_athlete_id)
           OR (f.category = 'event'   AND f.event_id   = p.fav_event_id)
        ) THEN 0 ELSE 1 END,
        f.created_at
    ) - 1 AS rn
  FROM public.user_league_favorites f
  JOIN public.profiles p ON p.id = f.user_id
)
UPDATE public.user_league_favorites f
SET rank = ranked.rn
FROM ranked
WHERE ranked.id = f.id;

-- Any rows without a matching profile (shouldn't happen) get a stable order.
UPDATE public.user_league_favorites
SET rank = 0
WHERE rank IS NULL;
