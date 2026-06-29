-- Per-event box-score ingest state, so the reconciliation sweep
-- (/api/ingest-sweep) can read its work list off a single indexed column
-- instead of paging every logged event and every event_athletes row each run
-- to re-derive what's still missing.
--
-- States:
--   pending = logged, still owed a box score (the sweep should attempt it).
--   done    = athletes ingested, or the event already had them.
--   skip    = terminal: no ESPN id, an unsupported sport/competition (tennis),
--             or a final game ESPN has no lineup for. Never worth re-attempting.
--   null    = not logged by anyone, so no box score is owed. The vast majority
--             of events; left out of the work list entirely.
--
-- ingestEventBoxScore writes this column on every outcome; the trigger below
-- seeds it when an event is first logged. Backfill at the bottom classifies the
-- existing rows.

alter table public.events add column if not exists box_score_state text;

-- The sweep only ever queries pending rows, so index just those. Partial index
-- stays tiny (a handful of rows) and the planner uses it for the work-list scan.
create index if not exists events_box_score_pending_idx
  on public.events (event_date desc)
  where box_score_state = 'pending';

-- When an event is logged for the first time, mark it pending so the sweep picks
-- it up. Only set it when it's null: a done/skip event that gets logged again
-- must not be dragged back into the work list, and a still-pending one needn't
-- be rewritten. SECURITY DEFINER so the insert succeeds under the logger's RLS
-- (the events row isn't theirs to update) without weakening events' policies.
create or replace function public.mark_event_pending_on_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.event_id is not null then
    update public.events
      set box_score_state = 'pending'
      where id = new.event_id
        and box_score_state is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_mark_event_pending_on_log on public.event_logs;
create trigger trg_mark_event_pending_on_log
  after insert on public.event_logs
  for each row
  execute function public.mark_event_pending_on_log();

-- Backfill the existing events.
-- 1) done: anything that already has athletes.
update public.events e
  set box_score_state = 'done'
  where box_score_state is null
    and exists (select 1 from public.event_athletes ea where ea.event_id = e.id);

-- 2) skip: logged, no athletes, and structurally un-ingestable — no ESPN id, or a
--    sport we don't ingest box scores for (tennis). Saves the sweep from ever
--    attempting these.
update public.events e
  set box_score_state = 'skip'
  where box_score_state is null
    and exists (select 1 from public.event_logs el where el.event_id = e.id)
    and (
      (e.external_ids->>'espn') is null
      or exists (
        select 1 from public.leagues l
        where l.id = e.league_id and l.sport = 'tennis'
      )
    );

-- 3) pending: everything else that's been logged but has no athletes yet.
update public.events e
  set box_score_state = 'pending'
  where box_score_state is null
    and exists (select 1 from public.event_logs el where el.event_id = e.id);
