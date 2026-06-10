-- 001-external-ids-migration.sql
-- Adds an `external_ids` jsonb column to reference tables so rows can be
-- correlated with external data providers (currently ESPN; keyed as
-- {"espn": "<id>"}). Idempotent: safe to run multiple times.
--
-- Apply with:
--   psql "$DATABASE_URL" -f scripts/data/001-external-ids-migration.sql

begin;

alter table public.teams    add column if not exists external_ids jsonb not null default '{}'::jsonb;
alter table public.venues   add column if not exists external_ids jsonb not null default '{}'::jsonb;
alter table public.events   add column if not exists external_ids jsonb not null default '{}'::jsonb;
alter table public.athletes add column if not exists external_ids jsonb not null default '{}'::jsonb;

-- GIN indexes for containment queries (e.g. external_ids @> '{"espn":"123"}')
create index if not exists idx_teams_external_ids    on public.teams    using gin (external_ids);
create index if not exists idx_venues_external_ids   on public.venues   using gin (external_ids);
create index if not exists idx_events_external_ids   on public.events   using gin (external_ids);
create index if not exists idx_athletes_external_ids on public.athletes using gin (external_ids);

-- Uniqueness guards: an ESPN id may map to at most one row.
-- (ESPN team ids are only unique within a league; event ids likewise scoped
--  per league to be safe. Venue ids are global in ESPN's model.)
create unique index if not exists uq_teams_espn_id
  on public.teams (league_id, (external_ids->>'espn'))
  where external_ids ? 'espn';

create unique index if not exists uq_venues_espn_id
  on public.venues ((external_ids->>'espn'))
  where external_ids ? 'espn';

create unique index if not exists uq_events_espn_id
  on public.events (league_id, (external_ids->>'espn'))
  where external_ids ? 'espn';

commit;
