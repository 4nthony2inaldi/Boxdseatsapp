-- Per-league ingest freshness for the admin panel (/admin/ingest). One row per
-- league with: how many events we hold, how many are still upcoming, the date of
-- the most recent event, and when we last *created* a row for it. The admin page
-- reads this with the service-role client.
--
-- "upcoming_events > 0" is the offseason-aware signal: a league with games still
-- on the calendar is active and we expect ongoing ingest; a league with none is
-- simply out of season and shouldn't look alarming. last_ingested_at is the max
-- created_at, i.e. the newest game row we added — informational, since schedules
-- are released in chunks so it's lumpy by nature.
--
-- SECURITY DEFINER so it can aggregate events regardless of the caller's RLS, but
-- execute is granted only to service_role (the admin page's client). Revoked from
-- anon/authenticated so it can't be called from the browser.
create or replace function public.ingest_league_freshness()
returns table (
  league_id text,
  slug text,
  name text,
  sport text,
  total_events bigint,
  upcoming_events bigint,
  last_event_date date,
  last_ingested_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id::text,
    l.slug,
    l.name,
    l.sport,
    count(e.id),
    count(e.id) filter (where e.event_date >= current_date),
    max(e.event_date),
    max(e.created_at)
  from leagues l
  left join events e on e.league_id = l.id
  group by l.id, l.slug, l.name, l.sport;
$$;

revoke all on function public.ingest_league_freshness() from anon, authenticated, public;
grant execute on function public.ingest_league_freshness() to service_role;
