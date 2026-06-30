-- Correct soccer regular-season games wrongly flagged is_postseason.
--
-- The seeder's old soccer classifier treated only slug == 'regular-season' as
-- regular season; ESPN uses year-suffixed slugs for some leagues/eras (MLS
-- 'regular-season-2016'), which fell through to the postseason catch-all. The
-- result: regular-season games with is_postseason = true and a round_or_stage
-- that literally reads "Regular Season YYYY". (The seeder is fixed going
-- forward; this corrects the rows already written. The hourly cron classifies
-- soccer by ESPN season.type, not slug, so it never produced these.)
--
-- Clear the flag and the bogus round on the affected rows. Idempotent; wrap in
-- BEGIN/ROLLBACK to dry-run (the BEFORE/AFTER/target counts still print).

\echo '=== Soccer postseason rounds BEFORE (full landscape) ==='
select coalesce(round_or_stage, '(null)') as round, count(*) as games
from events e join leagues l on l.id = e.league_id
where l.sport = 'soccer' and e.is_postseason
group by round order by games desc;

\echo '=== Rows this fix targets (regular-season mislabeled) ==='
select coalesce(round_or_stage, '(null)') as round, count(*) as games
from events e join leagues l on l.id = e.league_id
where l.sport = 'soccer' and e.is_postseason and e.round_or_stage ~* '^regular[ -]?season'
group by round order by games desc;

update events e
set is_postseason = false, round_or_stage = null
from leagues l
where l.id = e.league_id
  and l.sport = 'soccer'
  and e.is_postseason
  and e.round_or_stage ~* '^regular[ -]?season';

\echo '=== Soccer postseason rounds AFTER ==='
select coalesce(round_or_stage, '(null)') as round, count(*) as games
from events e join leagues l on l.id = e.league_id
where l.sport = 'soccer' and e.is_postseason
group by round order by games desc;
