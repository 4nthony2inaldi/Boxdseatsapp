-- Rare game-feat tagging, derived from stored box-score stat lines
-- (event_athletes.stat_line, captured the first time a game is logged).
-- These are the "I was there for history" badges.
--
-- Derivable from the per-player lines we already store:
--   no-hitter    (baseball)        — a side held to 0 hits over a full game
--   perfect-game (baseball)        — that side also went 27 AB / 0 BB / 0 H
--                                     (27 up, 27 down — separates it from a
--                                      walk- or error-marred no-hitter)
--   multi-hr     (baseball)        — a batter with 3+ HR; four-hr for 4+
--   hat-trick-hockey / -soccer     — a player with 3+ goals (this game, not YTD)
--   pts-40/50/60 (basketball)      — a player scoring 40 / 50 / 60+
--   pass-5-td    (football)        — a player with 5+ passing TDs
--
-- NOT derivable: cycles — ESPN's stored batting line carries H but not 2B/3B,
-- so a single can't be told from a double. That one needs a curated list.
--
-- Coverage: only LOGGED games have box scores, so this tags the logged
-- population. Re-run after new games are logged. Idempotent full recompute
-- (clear the managed tags, then re-tag). Wrap in BEGIN/ROLLBACK for a dry run.

-- 1) Clear the managed feat tags everywhere, preserving any other tags + order.
update events e
set event_tags = coalesce((
  select array_agg(t order by ord)
  from unnest(e.event_tags) with ordinality as u(t, ord)
  where t <> all (array['no-hitter','perfect-game','multi-hr','four-hr','hat-trick','hat-trick-hockey','hat-trick-soccer','pts-40','pts-50','pts-60','pass-5-td'])
), array[]::text[])
where e.event_tags && array['no-hitter','perfect-game','multi-hr','four-hr','hat-trick','hat-trick-hockey','hat-trick-soccer','pts-40','pts-50','pts-60','pass-5-td'];

-- 2) Re-tag from the box scores.
with ea as (
  select ea.event_id, ea.team_id, l.sport, ea.stat_line::jsonb as sl
  from event_athletes ea
  join events e on e.id = ea.event_id
  join leagues l on l.id = e.league_id
  where ea.stat_line is not null
),
bat as ( -- per (event, team) baseball batting aggregates
  select event_id, team_id,
         count(*) filter (where sl ? 'batting') as batters,
         sum(case when (sl->'batting'->>'H')  ~ '^[0-9]+$' then (sl->'batting'->>'H')::int  else 0 end) as hits,
         sum(case when (sl->'batting'->>'AB') ~ '^[0-9]+$' then (sl->'batting'->>'AB')::int else 0 end) as ab,
         sum(case when (sl->'batting'->>'BB') ~ '^[0-9]+$' then (sl->'batting'->>'BB')::int else 0 end) as bb
  from ea
  where sport = 'baseball' and team_id is not null
  group by event_id, team_id
),
feats as (
  -- no-hitter: a side held hitless with a real (9+) lineup that actually batted
  select distinct event_id, 'no-hitter'::text as tag from bat where batters >= 9 and ab >= 20 and hits = 0
  union
  -- perfect game: that side went exactly 27 AB, 0 hits, 0 walks
  select distinct event_id, 'perfect-game' from bat where hits = 0 and bb = 0 and ab = 27
  union
  select distinct event_id, 'multi-hr' from ea
    where sport = 'baseball' and (sl->'batting'->>'HR') ~ '^[0-9]+$' and (sl->'batting'->>'HR')::int >= 3
  union
  select distinct event_id, 'four-hr' from ea
    where sport = 'baseball' and (sl->'batting'->>'HR') ~ '^[0-9]+$' and (sl->'batting'->>'HR')::int >= 4
  union
  -- hockey hat trick: goals (this game = 'G', not YTD) under the skater group
  select distinct event_id, 'hat-trick-hockey' from ea
    where sport = 'hockey'
      and coalesce(sl->'forwards'->>'G', sl->'defenses'->>'G', sl->'skaters'->>'G') ~ '^[0-9]+$'
      and coalesce(sl->'forwards'->>'G', sl->'defenses'->>'G', sl->'skaters'->>'G')::int >= 3
  union
  -- soccer hat trick
  select distinct event_id, 'hat-trick-soccer' from ea
    where sport = 'soccer' and (sl->'stats'->>'G') ~ '^[0-9]+$' and (sl->'stats'->>'G')::int >= 3
  union
  select distinct event_id, 'pts-40' from ea where sport = 'basketball' and (sl->'stats'->>'PTS') ~ '^[0-9]+$' and (sl->'stats'->>'PTS')::int >= 40
  union
  select distinct event_id, 'pts-50' from ea where sport = 'basketball' and (sl->'stats'->>'PTS') ~ '^[0-9]+$' and (sl->'stats'->>'PTS')::int >= 50
  union
  select distinct event_id, 'pts-60' from ea where sport = 'basketball' and (sl->'stats'->>'PTS') ~ '^[0-9]+$' and (sl->'stats'->>'PTS')::int >= 60
  union
  -- 5+ passing TDs by a QB (football: NFL + college)
  select distinct event_id, 'pass-5-td' from ea
    where sport = 'football' and (sl->'passing'->>'TD') ~ '^[0-9]+$' and (sl->'passing'->>'TD')::int >= 5
)
update events e
set event_tags = coalesce(e.event_tags, array[]::text[]) || agg.tags
from (select event_id, array_agg(distinct tag) as tags from feats group by event_id) agg
where agg.event_id = e.id;

\echo '=== Feat tags (logged games only) ==='
select tag, count(*) as games
from (select unnest(event_tags) as tag from events) s
where tag in ('no-hitter','perfect-game','multi-hr','four-hr','hat-trick-hockey','hat-trick-soccer','pts-40','pts-50','pts-60','pass-5-td')
group by tag order by tag;
