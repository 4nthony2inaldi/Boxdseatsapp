-- ═══════════════════════════════════════════════════════════════
-- NOTIFICATION GENERATION TRIGGERS
-- Run in Supabase Dashboard → SQL Editor (after photos-migration.sql)
--
-- The notification UI (src/components/notifications/NotificationList.tsx)
-- links like/comment/companion_tag notifications to /event/[target_id],
-- so target_id stores the events.id (null for manual log entries),
-- and follow-type notifications link to the actor's profile.
-- ═══════════════════════════════════════════════════════════════

-- ─── New enum value for incoming follow requests ───
-- (Must run outside an explicit transaction on PG < 12; safe on Supabase.)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'follow_request';

-- ─── Helper: resolve the public event id for an event log ───
CREATE OR REPLACE FUNCTION notification_event_target(p_event_log_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_id FROM event_logs WHERE id = p_event_log_id
$$;

-- ═══════════════════════════════════════════════════════════════
-- LIKES
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_event_id uuid;
BEGIN
  SELECT user_id, event_id INTO v_owner, v_event_id
  FROM event_logs WHERE id = NEW.event_log_id;

  IF v_owner IS NULL OR v_owner = NEW.user_id THEN
    RETURN NEW; -- no self-notifications
  END IF;

  -- Avoid duplicates if the user toggles like repeatedly
  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = v_owner AND actor_id = NEW.user_id
      AND type = 'like' AND target_type = 'event_log_like'
      AND target_id IS NOT DISTINCT FROM v_event_id
      AND created_at > now() - interval '1 day'
  ) THEN
    INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, message)
    VALUES (v_owner, 'like', NEW.user_id, v_event_id, 'event_log_like', 'liked your event log');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_like ON likes;
CREATE TRIGGER trg_notify_like
  AFTER INSERT ON likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- Remove the unread notification when a like is withdrawn
CREATE OR REPLACE FUNCTION denotify_on_unlike()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_event_id uuid;
BEGIN
  SELECT user_id, event_id INTO v_owner, v_event_id
  FROM event_logs WHERE id = OLD.event_log_id;

  DELETE FROM notifications
  WHERE user_id = v_owner AND actor_id = OLD.user_id
    AND type = 'like' AND target_type = 'event_log_like'
    AND target_id IS NOT DISTINCT FROM v_event_id
    AND is_read = false;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_denotify_unlike ON likes;
CREATE TRIGGER trg_denotify_unlike
  AFTER DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION denotify_on_unlike();

-- ═══════════════════════════════════════════════════════════════
-- PHOTO LIKES
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_on_photo_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_event_id uuid;
BEGIN
  SELECT user_id, event_id INTO v_owner, v_event_id
  FROM event_logs WHERE id = NEW.event_log_id;

  IF v_owner IS NULL OR v_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_id = v_owner AND actor_id = NEW.user_id
      AND type = 'like' AND target_type = 'photo_like'
      AND target_id IS NOT DISTINCT FROM v_event_id
      AND created_at > now() - interval '1 day'
  ) THEN
    INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, message)
    VALUES (v_owner, 'like', NEW.user_id, v_event_id, 'photo_like', 'liked your photo');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_photo_like ON photo_likes;
CREATE TRIGGER trg_notify_photo_like
  AFTER INSERT ON photo_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_photo_like();

-- ═══════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_event_id uuid;
BEGIN
  SELECT user_id, event_id INTO v_owner, v_event_id
  FROM event_logs WHERE id = NEW.event_log_id;

  IF v_owner IS NULL OR v_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, message)
  VALUES (v_owner, 'comment', NEW.user_id, v_event_id, 'event_log_comment', 'commented on your event log');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- ═══════════════════════════════════════════════════════════════
-- FOLLOWS (new follower / follow request / request approved)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO notifications (user_id, type, actor_id, target_type, message)
    VALUES (NEW.following_id, 'follow', NEW.follower_id, 'follow', 'started following you');
  ELSIF NEW.status = 'pending' THEN
    INSERT INTO notifications (user_id, type, actor_id, target_type, message)
    VALUES (NEW.following_id, 'follow_request', NEW.follower_id, 'follow_request', 'requested to follow you');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- Request accepted: tell the requester, clean up the request notification
CREATE OR REPLACE FUNCTION notify_on_follow_accept()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'active' THEN
    INSERT INTO notifications (user_id, type, actor_id, target_type, message)
    VALUES (NEW.follower_id, 'follow_request_approved', NEW.following_id, 'follow', 'accepted your follow request');

    -- The pending-request notification has been handled
    DELETE FROM notifications
    WHERE user_id = NEW.following_id AND actor_id = NEW.follower_id
      AND type = 'follow_request';

    -- The accepted requester is now a follower
    INSERT INTO notifications (user_id, type, actor_id, target_type, message)
    VALUES (NEW.following_id, 'follow', NEW.follower_id, 'follow', 'started following you');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follow_accept ON follows;
CREATE TRIGGER trg_notify_follow_accept
  AFTER UPDATE ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow_accept();

-- Unfollow / cancelled or declined request: remove stale notifications
CREATE OR REPLACE FUNCTION denotify_on_unfollow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' THEN
    DELETE FROM notifications
    WHERE user_id = OLD.following_id AND actor_id = OLD.follower_id
      AND type = 'follow_request';
  ELSE
    DELETE FROM notifications
    WHERE user_id = OLD.following_id AND actor_id = OLD.follower_id
      AND type = 'follow' AND is_read = false;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_denotify_unfollow ON follows;
CREATE TRIGGER trg_denotify_unfollow
  AFTER DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION denotify_on_unfollow();

-- ═══════════════════════════════════════════════════════════════
-- COMPANION TAGS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_on_companion_tag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_event_id uuid;
BEGIN
  IF NEW.tagged_user_id IS NULL THEN
    RETURN NEW; -- free-text companion, nobody to notify
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

DROP TRIGGER IF EXISTS trg_notify_companion_tag ON companion_tags;
CREATE TRIGGER trg_notify_companion_tag
  AFTER INSERT ON companion_tags
  FOR EACH ROW EXECUTE FUNCTION notify_on_companion_tag();

-- ═══════════════════════════════════════════════════════════════
-- BADGES
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION notify_on_badge()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_list_name text;
BEGIN
  SELECT name INTO v_list_name FROM lists WHERE id = NEW.list_id;

  INSERT INTO notifications (user_id, type, target_id, target_type, message)
  VALUES (
    NEW.user_id, 'badge_earned', NEW.list_id, 'badge',
    'You earned the ' || coalesce(v_list_name, 'list completion') || ' badge!'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_badge ON badges;
CREATE TRIGGER trg_notify_badge
  AFTER INSERT ON badges
  FOR EACH ROW EXECUTE FUNCTION notify_on_badge();

-- ═══════════════════════════════════════════════════════════════
-- REAL-TIME
-- Expose notifications over Supabase Realtime so the in-app bell
-- updates instantly (RLS still applies to the subscription).
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- already added
  WHEN undefined_object THEN NULL;  -- publication doesn't exist (non-Supabase env)
END $$;
