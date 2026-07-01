-- Leaderboards — read-only aggregation function + supporting indexes.
-- Design: docs/leaderboards.md. No new tables.
--
-- RLS scopes a normal user's reads to their own/visible rows, so we can't rank
-- across all public users as the caller. This SECURITY DEFINER function does the
-- aggregation and enforces the privacy rules itself: Global/My City list public
-- profiles only; Following includes private accounts the caller actively follows
-- (approved); blocked users (either direction) are excluded; the caller always
-- sees their own row. Only public-safe fields are returned.

-- Filter-column indexes (idempotent).
create index if not exists idx_event_logs_sport on public.event_logs (sport);
create index if not exists idx_event_logs_venue on public.event_logs (venue_id);
create index if not exists idx_events_home_team on public.events (home_team_id);
create index if not exists idx_events_away_team on public.events (away_team_id);
create index if not exists idx_profiles_is_private on public.profiles (is_private);
create index if not exists idx_profiles_home_city on public.profiles (home_city);

create or replace function public.leaderboard(
  p_scope text default 'global',   -- 'global' | 'city' | 'following'
  p_sport text default null,       -- sport_type value, e.g. 'baseball'
  p_team uuid default null,        -- team id (either side of the game)
  p_venue uuid default null,       -- venue id
  p_since date default null,       -- null = all-time; else event_date >= p_since
  p_limit int default 100
) returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  my_city text;
  lim int := least(greatest(coalesce(p_limit, 100), 1), 200);
  out jsonb;
begin
  if me is null then
    return jsonb_build_object('rows', '[]'::jsonb, 'me', null, 'total', 0);
  end if;
  select home_city into my_city from public.profiles where id = me;

  with blocked as (
    select blocked_id as uid from public.blocks where blocker_id = me
    union
    select blocker_id from public.blocks where blocked_id = me
  ),
  elig as (
    -- users eligible to appear for this scope, minus anyone blocked
    select p.id
    from public.profiles p
    where p.id <> all (array(select uid from blocked))
      and (
        (p_scope = 'global' and p.is_private = false)
        or (p_scope = 'city' and p.is_private = false and my_city is not null and p.home_city = my_city)
        or (p_scope = 'following' and exists (
              select 1 from public.follows f
              where f.follower_id = me and f.following_id = p.id and f.status = 'active'))
      )
    union
    select me   -- always let the caller see their own row/rank
  ),
  counts as (
    select el.user_id, count(*)::int as games
    from public.event_logs el
    where el.user_id in (select id from elig)
      and (p_since is null or el.event_date >= p_since)
      and (p_sport is null or el.sport::text = p_sport)
      and (p_venue is null or el.venue_id = p_venue)
      and (p_team is null or exists (
            select 1 from public.events e
            where e.id = el.event_id and (e.home_team_id = p_team or e.away_team_id = p_team)))
    group by el.user_id
  ),
  ranked as (
    select c.user_id, c.games,
           rank() over (order by c.games desc) as rnk,                       -- ties share rank
           row_number() over (order by c.games desc, lower(pr.username)) as ord  -- display order, alpha tiebreak
    from counts c
    join public.profiles pr on pr.id = c.user_id
  )
  select jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'rank', r.rnk, 'games', r.games,
               'user_id', pr.id, 'username', pr.username,
               'display_name', pr.display_name, 'avatar_url', pr.avatar_url
             ) order by r.ord)
      from ranked r
      join public.profiles pr on pr.id = r.user_id
      where r.ord <= lim
    ), '[]'::jsonb),
    'me', (
      select jsonb_build_object('rank', r.rnk, 'games', r.games)
      from ranked r where r.user_id = me
    ),
    'total', (select count(*) from counts)
  ) into out;

  return out;
end;
$$;

revoke all on function public.leaderboard(text, text, uuid, uuid, date, int) from public, anon;
grant execute on function public.leaderboard(text, text, uuid, uuid, date, int) to authenticated;
