-- 004: venues.primary_sport
-- APPLIED TO PRODUCTION 2026-06-11 via Management API.
--
-- Venue search previously derived each venue's sport icon at request time
-- from venue_teams + an events tally capped at 400 rows across all venues,
-- which nondeterministically starved some venues (USTA Billie Jean King,
-- Steinbrenner Field, Nassau Coliseum showed the generic stadium icon).
-- This precomputes the dominant sport per venue from its event history.
-- src/app/api/sync-events/route.ts sets it for venues it creates.

ALTER TABLE venues ADD COLUMN IF NOT EXISTS primary_sport text;

-- Most-frequent league sport across all events at the venue
WITH tally AS (
  SELECT e.venue_id, l.sport, count(*) AS n,
         row_number() OVER (PARTITION BY e.venue_id ORDER BY count(*) DESC) AS rk
  FROM events e JOIN leagues l ON l.id = e.league_id
  GROUP BY e.venue_id, l.sport
)
UPDATE venues v SET primary_sport = t.sport
FROM tally t WHERE t.venue_id = v.id AND t.rk = 1;

-- Venues with no events: primary tenant's league sport
UPDATE venues v SET primary_sport = l.sport
FROM venue_teams vt
JOIN teams t ON t.id = vt.team_id
JOIN leagues l ON l.id = t.league_id
WHERE vt.venue_id = v.id AND vt.is_primary AND v.primary_sport IS NULL;

-- 7 orphans (no events, no team links — leftovers from deleted preseason
-- pseudo-team games) were set by hand: Mediolanum Forum, Ulker Sports
-- Arena, Bizkaia Arena, WiZink Center -> basketball; BB&T Ballpark,
-- Southwest University Park -> baseball; Aloha Stadium -> football.
