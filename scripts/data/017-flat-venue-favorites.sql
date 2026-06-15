-- Flat venue favorites. A venue belongs to a sport, not a league, and users
-- want to add many ("where have you been?"). So: allow a null league_id, and
-- replace the single (user, category, league) uniqueness with category-aware
-- rules — one pick per league for team/athlete/event, but a flat de-duped list
-- of venues for the venue category.

ALTER TABLE public.user_league_favorites ALTER COLUMN league_id DROP NOT NULL;

ALTER TABLE public.user_league_favorites
  DROP CONSTRAINT IF EXISTS user_league_favorites_user_id_category_league_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ulf_league_pick
  ON public.user_league_favorites (user_id, category, league_id)
  WHERE category <> 'venue';

CREATE UNIQUE INDEX IF NOT EXISTS uq_ulf_venue_pick
  ON public.user_league_favorites (user_id, venue_id)
  WHERE category = 'venue';
