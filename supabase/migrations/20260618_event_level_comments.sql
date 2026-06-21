-- Event-level discussion rooms: a comment can attach to an EVENT (one shared
-- room per game) in addition to the existing per-log comments. Until now
-- comments were keyed only on event_log_id, so each attendee's check-in had its
-- own thread and there was no single place to discuss the game.
--
-- The comment_count trigger updates event_logs WHERE id = new.event_log_id,
-- which is a harmless no-op when event_log_id is null, so no trigger change is
-- needed. RLS policies are log-scoped, so add additive policies for event-level
-- read/insert (delete/update already key on user_id = auth.uid()).

alter table comments alter column event_log_id drop not null;
alter table comments add column if not exists event_id uuid references events(id) on delete cascade;
alter table comments add constraint comments_target_chk
  check (num_nonnulls(event_log_id, event_id) = 1);
create index if not exists idx_comments_event on comments (event_id, created_at desc);

drop policy if exists "Event comments are readable" on comments;
create policy "Event comments are readable"
  on comments for select using (
    event_id is not null
    and not exists (
      select 1 from blocks
      where blocks.blocker_id = comments.user_id and blocks.blocked_id = auth.uid()
    )
  );

drop policy if exists "Users can insert event comments" on comments;
create policy "Users can insert event comments"
  on comments for insert with check (
    user_id = auth.uid() and event_id is not null
  );
