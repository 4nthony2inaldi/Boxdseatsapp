-- Align event-room comment visibility with the per-log block semantics.
--
-- The per-log comment SELECT policy filters blocks BOTH ways: a reader sees
-- neither comments from users who blocked them nor comments from users they
-- themselves blocked. The original event-room SELECT policy
-- (20260618_event_level_comments.sql) only filtered the first direction, so a
-- reader still saw event-room comments from people they had blocked. This
-- closes that gap, keeping block-based moderation consistent across the per-log
-- and shared-room threads (App Store Guideline 1.2).
--
-- INSERT is intentionally unchanged: a shared discussion room has no single
-- owner, so there's no per-owner block to gate posting on (unlike a per-log
-- thread). The bidirectional read filter is what enforces the block for both
-- parties in a shared room.
--
-- DDL (RLS policy) — apply via the Supabase SQL editor / CLI; it can't go
-- through the PostgREST path the data scripts use.

drop policy if exists "Event comments are readable" on comments;
create policy "Event comments are readable"
  on comments for select using (
    event_id is not null
    and not exists (
      select 1 from blocks
      where blocks.blocker_id = comments.user_id and blocks.blocked_id = auth.uid()
    )
    and not exists (
      select 1 from blocks
      where blocks.blocker_id = auth.uid() and blocks.blocked_id = comments.user_id
    )
  );
