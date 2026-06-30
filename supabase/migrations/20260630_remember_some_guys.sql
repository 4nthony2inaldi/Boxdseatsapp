-- "Remember Some Guys" feed strip: sampling functions.
--
-- Two read-only SQL functions, both SECURITY INVOKER so normal RLS applies
-- (a caller can only read their own event_logs; athletes/event_athletes are
-- reference data readable by authenticated). Idempotent (create or replace).
--
-- Selection is uniform over DISTINCT players (group by athlete, then random) —
-- a guy you saw once and a guy you saw 35 times are equally likely. Only team
-- sports with a headshot qualify (faces only, each backed by an athlete page).
-- p_exclude lets the client suppress recently-shown ids so pulls don't repeat.

-- Personal: the distinct team-sport athletes THIS user has seen (appeared in the
-- box score of a game they logged), with a headshot, plus how many of their
-- games each was in (the "Nx" badge).
create or replace function public.remember_some_guys(
  p_user uuid,
  p_limit int default 12,
  p_exclude uuid[] default '{}'
) returns table (id uuid, name text, headshot_url text, sport text, seen_count bigint)
language sql stable security invoker set search_path = public as $$
  select a.id, a.name, a.headshot_url, a.sport::text, count(distinct el.event_id) as seen_count
  from event_logs el
  join event_athletes ea on ea.event_id = el.event_id
  join athletes a on a.id = ea.athlete_id
  where el.user_id = p_user
    and a.headshot_url is not null
    and a.sport in ('baseball','basketball','football','hockey','soccer','australian_football')
    and a.id <> all(coalesce(p_exclude, '{}'))
  group by a.id, a.name, a.headshot_url, a.sport
  order by random()
  limit greatest(1, least(p_limit, 50));
$$;

-- Cold start: random team-sport athletes with a headshot from the whole system,
-- for users who haven't seen enough guys yet. No seen_count (no badge).
create or replace function public.remember_some_guys_system(
  p_limit int default 12,
  p_exclude uuid[] default '{}'
) returns table (id uuid, name text, headshot_url text, sport text)
language sql stable security invoker set search_path = public as $$
  select a.id, a.name, a.headshot_url, a.sport::text
  from athletes a
  where a.headshot_url is not null
    and a.sport in ('baseball','basketball','football','hockey','soccer','australian_football')
    and a.id <> all(coalesce(p_exclude, '{}'))
  order by random()
  limit greatest(1, least(p_limit, 50));
$$;

grant execute on function public.remember_some_guys(uuid, int, uuid[]) to authenticated;
grant execute on function public.remember_some_guys_system(int, uuid[]) to authenticated;
