-- Read-only app-wide "fan passport" aggregate for the admin console.
--
-- Returns one jsonb blob: totals (fans, games, venues, events), distinct
-- cities, per-sport game counts, top venues, most-seen athletes, and every
-- visited venue's coordinates + game count for the map. All SELECT-only.
--
-- Locked to service_role: the admin page calls it with the service key. It is
-- NOT granted to anon/authenticated, so a logged-in user can't call the RPC and
-- pull app-wide data. Idempotent (create or replace); safe to re-run.

create or replace function public.admin_global_passport()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'totals', (
      select jsonb_build_object(
        'fans',   count(distinct user_id),
        'games',  count(*),
        'venues', count(distinct venue_id) filter (where venue_id is not null),
        'events', count(distinct event_id) filter (where event_id is not null)
      )
      from event_logs
    ),
    'cities', (
      select count(*)
      from (
        select distinct v.city, v.state
        from event_logs el
        join venues v on v.id = el.venue_id
        where v.city is not null
      ) c
    ),
    'sports', (
      select coalesce(
        jsonb_agg(jsonb_build_object('sport', sport, 'games', c) order by c desc),
        '[]'::jsonb
      )
      from (
        select sport, count(*)::int as c
        from event_logs
        where sport is not null
        group by sport
      ) s
    ),
    'topVenues', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select v.id as venue_id, v.name, v.city,
               v.primary_sport as sport, v.photo_url,
               count(*)::int as games
        from event_logs el
        join venues v on v.id = el.venue_id
        group by v.id, v.name, v.city, v.primary_sport, v.photo_url
        order by count(*) desc
        limit 12
      ) t
    ),
    'topAthletes', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select a.id, a.name, a.sport::text as sport, a.headshot_url,
               count(*)::int as seen
        from event_logs el
        join event_athletes ea on ea.event_id = el.event_id
        join athletes a on a.id = ea.athlete_id
        group by a.id, a.name, a.sport, a.headshot_url
        order by count(*) desc
        limit 18
      ) t
    ),
    'mapVenues', (
      select coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      from (
        select v.id as venue_id, v.name,
               round(extensions.ST_Y(v.location::extensions.geometry)::numeric, 4)::float8 as lat,
               round(extensions.ST_X(v.location::extensions.geometry)::numeric, 4)::float8 as lng,
               count(*)::int as games
        from event_logs el
        join venues v on v.id = el.venue_id
        where v.location is not null
        group by v.id, v.name, v.location
      ) t
    )
  );
$$;

revoke all on function public.admin_global_passport() from public, anon, authenticated;
grant execute on function public.admin_global_passport() to service_role;
