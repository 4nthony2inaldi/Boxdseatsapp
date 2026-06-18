-- After the name cleanup, 22 tennis tournaments had multiple venue rows that
-- collapsed to the same name (e.g. three "Western & Southern Open" rows from
-- different seeding passes). Merge each group into one canonical venue (the
-- one with the most events), repoint that group's events, and delete the
-- extras. The dup rows have no user-data references (no logs/visits/favorites),
-- so only events need repointing.
begin;

create temp table _vd on commit drop as
with tennis_v as (
  select distinct v.id, lower(trim(v.name)) n
  from venues v
  join events e on e.venue_id = v.id
  join leagues l on l.id = e.league_id
  where l.sport = 'tennis'
),
ev as (select venue_id, count(*) c from events group by venue_id),
ranked as (
  select t.id, t.n, coalesce(ev.c, 0) c,
    row_number() over (partition by t.n order by coalesce(ev.c, 0) desc, t.id) rn
  from tennis_v t
  left join ev on ev.venue_id = t.id
  where t.n in (select n from tennis_v group by n having count(*) > 1)
)
select r.id as dup_id,
       (select id from ranked r2 where r2.n = r.n and r2.rn = 1) as canonical_id
from ranked r
where r.rn > 1;

update events e set venue_id = m.canonical_id from _vd m where e.venue_id = m.dup_id;
delete from venues where id in (select dup_id from _vd);

commit;
