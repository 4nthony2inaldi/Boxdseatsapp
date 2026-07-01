-- Two independent, low-risk database changes from the full-app audit.
--
-- 1) Index on event_logs(user_id, event_date desc). The profile pages run
--    several per-user scans of event_logs (achievements, activity chart,
--    summary counts) and frequently order by event_date; this index backs
--    those. Idempotent (if not exists); a plain create is fine at current
--    table size (brief lock, no CONCURRENTLY needed).
--
-- 2) An ADDITIVE lists SELECT policy so active followers of a private creator
--    can read that creator's lists — mirroring the follows branch event_logs
--    and venue_visits already have. Today a follower sees the same user's
--    timeline, venues, and badges but an empty lists page. This is a separate
--    permissive policy (Postgres ORs permissive SELECT policies together), so
--    it only widens access in the intended way and never disturbs the existing
--    policy's grants. Drop-if-exists first so it is safe to re-run.

create index if not exists idx_event_logs_user_date
  on public.event_logs (user_id, event_date desc);

drop policy if exists "lists_followers_of_creator_select" on public.lists;
create policy "lists_followers_of_creator_select"
  on public.lists for select
  to authenticated
  using (
    exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid()
        and f.following_id = lists.created_by
        and f.status = 'active'
    )
  );
