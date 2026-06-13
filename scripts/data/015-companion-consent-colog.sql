-- ═══════════════════════════════════════════════════════════════
-- Companion tag CONSENT + co-logging shared memories
--   Phase 1: a real-account tag is pending until the tagged user
--            accepts or declines it.
--   Phase 2: "accept & add to profile" clones a linked log onto the
--            tagged user's profile, joined by a shared memory_id.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Tag status ──────────────────────────────────────────────
ALTER TABLE public.companion_tags
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'accepted', 'declined'));

-- Grandfather every existing tag as accepted (they were created under the
-- old always-on model; retro-pending them would surprise people).
UPDATE public.companion_tags SET status = 'accepted' WHERE status = 'pending';

-- One tag per (log, user) so a re-tag is idempotent, not a second ping.
CREATE UNIQUE INDEX IF NOT EXISTS uq_companion_tag_log_user
  ON public.companion_tags (event_log_id, tagged_user_id)
  WHERE tagged_user_id IS NOT NULL;

-- Free-text companions have nobody to confirm → auto-accepted on insert.
CREATE OR REPLACE FUNCTION public.companion_tag_defaults()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tagged_user_id IS NULL THEN
    NEW.status := 'accepted';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_companion_tag_defaults ON public.companion_tags;
CREATE TRIGGER trg_companion_tag_defaults
  BEFORE INSERT ON public.companion_tags
  FOR EACH ROW EXECUTE FUNCTION public.companion_tag_defaults();

-- Only ping for a fresh pending real-account tag.
CREATE OR REPLACE FUNCTION public.notify_on_companion_tag()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_event_id uuid;
BEGIN
  IF NEW.tagged_user_id IS NULL OR NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT user_id, event_id INTO v_owner, v_event_id
  FROM event_logs WHERE id = NEW.event_log_id;

  IF v_owner IS NULL OR v_owner = NEW.tagged_user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, message)
  VALUES (NEW.tagged_user_id, 'companion_tag', v_owner, v_event_id, 'companion_tag', 'tagged you as a companion');

  RETURN NEW;
END;
$$;

-- ── 2. Shared-memory link across co-attendees' logs ─────────────
ALTER TABLE public.event_logs
  ADD COLUMN IF NOT EXISTS memory_id uuid;
CREATE INDEX IF NOT EXISTS idx_event_logs_memory
  ON public.event_logs (memory_id) WHERE memory_id IS NOT NULL;

-- ── 3. The tagged user can always read their own tags ───────────
-- (even while pending, and even if the owner's log is otherwise hidden,
--  so they can act on the request).
DROP POLICY IF EXISTS "Tagged users can see their own tags" ON public.companion_tags;
CREATE POLICY "Tagged users can see their own tags"
  ON public.companion_tags FOR SELECT USING (tagged_user_id = auth.uid());

-- ── 4. Resolve my pending/handled tags for the notifications UI ──
-- SECURITY DEFINER so the join to the owner's (possibly hidden) log works.
CREATE OR REPLACE FUNCTION public.my_companion_tags()
RETURNS TABLE(tag_id uuid, owner_id uuid, event_id uuid, status text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT ct.id, el.user_id, el.event_id, ct.status
  FROM companion_tags ct
  JOIN event_logs el ON el.id = ct.event_log_id
  WHERE ct.tagged_user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.my_companion_tags() TO authenticated;

-- ── 5. Accept / decline ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.respond_to_companion_tag(p_tag_id uuid, p_action text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tag companion_tags%rowtype;
BEGIN
  SELECT * INTO v_tag FROM companion_tags WHERE id = p_tag_id;
  IF v_tag.id IS NULL THEN RAISE EXCEPTION 'tag not found'; END IF;
  IF v_tag.tagged_user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'not authorized'; END IF;

  IF p_action = 'accept' THEN
    UPDATE companion_tags SET status = 'accepted' WHERE id = p_tag_id;
  ELSIF p_action = 'decline' THEN
    DELETE FROM companion_tags WHERE id = p_tag_id;
  ELSE
    RAISE EXCEPTION 'invalid action';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.respond_to_companion_tag(uuid, text) TO authenticated;

-- ── 6. Accept & add to profile (co-log) ─────────────────────────
-- Confirms the tag, anchors a shared memory on the owner's log, and creates
-- the caller's own linked log (neutral/unrated — they finish rooting/rating
-- in the editor). Idempotent: re-clicking returns the already-linked log.
CREATE OR REPLACE FUNCTION public.accept_companion_and_colog(p_tag_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tag companion_tags%rowtype;
  v_el event_logs%rowtype;
  v_memory uuid;
  v_existing uuid;
  v_new uuid;
BEGIN
  SELECT * INTO v_tag FROM companion_tags WHERE id = p_tag_id;
  IF v_tag.id IS NULL THEN RAISE EXCEPTION 'tag not found'; END IF;
  IF v_tag.tagged_user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'not authorized'; END IF;

  SELECT * INTO v_el FROM event_logs WHERE id = v_tag.event_log_id;
  IF v_el.id IS NULL THEN RAISE EXCEPTION 'log not found'; END IF;

  UPDATE companion_tags SET status = 'accepted' WHERE id = p_tag_id;

  -- Anchor a shared memory on the owner's log.
  v_memory := v_el.memory_id;
  IF v_memory IS NULL THEN
    v_memory := gen_random_uuid();
    UPDATE event_logs SET memory_id = v_memory WHERE id = v_el.id;
  END IF;

  -- Already part of this memory? Return that log (idempotent).
  SELECT id INTO v_existing FROM event_logs
    WHERE user_id = v_uid AND memory_id = v_memory LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  -- Already logged this same event independently? Link it instead of duplicating.
  IF v_el.event_id IS NOT NULL THEN
    SELECT id INTO v_existing FROM event_logs
      WHERE user_id = v_uid AND event_id = v_el.event_id LIMIT 1;
    IF v_existing IS NOT NULL THEN
      UPDATE event_logs SET memory_id = v_memory WHERE id = v_existing;
      RETURN v_existing;
    END IF;
  END IF;

  -- Otherwise create the caller's own linked log.
  INSERT INTO event_logs (
    user_id, event_id, venue_id, event_date, league_id, sport,
    privacy, is_neutral, outcome, is_manual, manual_title, manual_description, memory_id
  ) VALUES (
    v_uid, v_el.event_id, v_el.venue_id, v_el.event_date, v_el.league_id, v_el.sport,
    'show_all', true, 'neutral', v_el.is_manual, v_el.manual_title, v_el.manual_description, v_memory
  ) RETURNING id INTO v_new;

  RETURN v_new;
END;
$$;
GRANT EXECUTE ON FUNCTION public.accept_companion_and_colog(uuid) TO authenticated;
