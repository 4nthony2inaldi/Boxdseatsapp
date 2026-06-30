-- Opening Day tagging (MLB).
--
-- "Opening Day" has no direct flag: MLB has no single league-wide date (the
-- international Seoul/Tokyo/London openers, the occasional Sunday-night opener,
-- and rainouts all shift it per team), so it's derived. Definition: a team's
-- FIRST regular-season game of the season, home or away. An event earns the tag
-- if its date is the opener date for EITHER of its two teams that season.
--
-- event_tags ['opening-day'], same mechanism as the All-Star tag, so the badge
-- layer reads it the same way. Full recompute (clear MLB tags, then re-tag) so
-- it is safe to re-run any time — each spring once the new openers land, or
-- after a historical backfill. Wrap in BEGIN/ROLLBACK for a dry run.

-- 1) Clear existing Opening Day tags on MLB events so this is a clean recompute.
update events e
set event_tags = array_remove(e.event_tags, 'opening-day')
from leagues l
where l.id = e.league_id
  and l.slug = 'mlb'
  and e.event_tags @> array['opening-day'];

-- 2) Re-tag: each team's earliest regular-season game (home or away) per season.
with mlb_reg as (
  select e.id, e.season, e.event_date, e.home_team_id, e.away_team_id
  from events e
  join leagues l on l.id = e.league_id
  where l.slug = 'mlb'
    and e.is_postseason = false
    and e.is_preseason = false
    and e.home_team_id is not null
    and e.away_team_id is not null
),
openers as (
  select season, team_id, min(event_date) as opener_date
  from (
    select season, home_team_id as team_id, event_date from mlb_reg
    union all
    select season, away_team_id as team_id, event_date from mlb_reg
  ) s
  group by season, team_id
),
opening_day as (
  select distinct m.id
  from mlb_reg m
  join openers o
    on o.season = m.season
   and o.opener_date = m.event_date
   and (o.team_id = m.home_team_id or o.team_id = m.away_team_id)
)
update events e
set event_tags = coalesce(e.event_tags, array[]::text[]) || array['opening-day']
where e.id in (select id from opening_day)
  and not (coalesce(e.event_tags, array[]::text[]) @> array['opening-day']);

-- Verify: tagged Opening Day games per season (≈ half of 30 teams, since most
-- games pair two opening teams, plus the early international/marquee openers).
\echo '=== Opening Day games per season ==='
select e.season, count(*) as opening_day_games
from events e
join leagues l on l.id = e.league_id
where l.slug = 'mlb' and e.event_tags @> array['opening-day']
group by e.season
order by e.season;

\echo '=== total Opening Day games tagged ==='
select count(*) as total
from events e
join leagues l on l.id = e.league_id
where l.slug = 'mlb' and e.event_tags @> array['opening-day'];
