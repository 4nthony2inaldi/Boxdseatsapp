-- Ingest dead-man's switch: one heartbeat row per ingest job. Each sync writes
-- its heartbeat after a run; the /api/ingest-health cron reads these and alerts
-- (via Sentry) when a job that was previously alive stops reporting or stops
-- succeeding. We watch job health (last successful run), not event recency, so
-- the offseason — when a league legitimately has no new games — never trips it.
--
-- last_run_at      bumped on every run (success, degraded, or error).
-- last_success_at  bumped only on a run that did useful work; this is what the
--                  health check ages out. If a job runs but every upstream fetch
--                  fails, last_run_at advances while last_success_at goes stale,
--                  so a silent "running but producing nothing" failure is caught.
--
-- Service-role only: the syncs write with the service key (bypasses RLS). RLS is
-- enabled with no policies, so anon/authenticated clients get nothing.
create table if not exists public.ingest_heartbeats (
  job text primary key,
  last_run_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_status text,
  detail jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ingest_heartbeats enable row level security;
