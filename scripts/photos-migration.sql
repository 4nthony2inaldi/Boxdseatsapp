-- ═══════════════════════════════════════════════════════════════════
-- BoxdSeats Photo System Migration
-- Adds: verified photos, event gallery, photo likes, cover photos
-- ═══════════════════════════════════════════════════════════════════

-- ─── PHASE A: Verified Photos ───

-- Add photo capture metadata to event_logs
ALTER TABLE event_logs
  ADD COLUMN IF NOT EXISTS photo_capture_method text CHECK (photo_capture_method IN ('camera', 'upload')),
  ADD COLUMN IF NOT EXISTS photo_captured_at timestamptz,
  ADD COLUMN IF NOT EXISTS photo_is_verified boolean NOT NULL DEFAULT false;

-- Index for querying verified photos
CREATE INDEX IF NOT EXISTS idx_event_logs_verified_photos
  ON event_logs (event_id, photo_is_verified)
  WHERE photo_url IS NOT NULL;

-- ─── PHASE B: Photo Likes ───

-- Add photo like count to event_logs
ALTER TABLE event_logs
  ADD COLUMN IF NOT EXISTS photo_like_count integer NOT NULL DEFAULT 0;

-- Photo likes table
CREATE TABLE IF NOT EXISTS photo_likes (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_log_id    uuid NOT NULL REFERENCES event_logs(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_log_id, user_id)
);

-- Index for querying likes by user
CREATE INDEX IF NOT EXISTS idx_photo_likes_user ON photo_likes (user_id);

-- Triggers: auto-increment/decrement photo_like_count
CREATE OR REPLACE FUNCTION increment_photo_like_count()
RETURNS trigger AS $$
BEGIN
  UPDATE event_logs SET photo_like_count = photo_like_count + 1 WHERE id = NEW.event_log_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_photo_like_count()
RETURNS trigger AS $$
BEGIN
  UPDATE event_logs SET photo_like_count = photo_like_count - 1 WHERE id = OLD.event_log_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_photo_like_insert ON photo_likes;
CREATE TRIGGER trg_photo_like_insert
  AFTER INSERT ON photo_likes
  FOR EACH ROW EXECUTE FUNCTION increment_photo_like_count();

DROP TRIGGER IF EXISTS trg_photo_like_delete ON photo_likes;
CREATE TRIGGER trg_photo_like_delete
  AFTER DELETE ON photo_likes
  FOR EACH ROW EXECUTE FUNCTION decrement_photo_like_count();

-- RLS for photo_likes
ALTER TABLE photo_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all photo likes"
  ON photo_likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own photo likes"
  ON photo_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own photo likes"
  ON photo_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ─── PHASE C: Cover Photos ───

-- Add cover photo fields to events
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS cover_photo_event_log_id uuid REFERENCES event_logs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cover_photo_url text,
  ADD COLUMN IF NOT EXISTS voting_closes_at timestamptz;

-- Add current cover event to venues
ALTER TABLE venues
  ADD COLUMN IF NOT EXISTS current_cover_event_id uuid REFERENCES events(id) ON DELETE SET NULL;

-- Index for cover photo queries
CREATE INDEX IF NOT EXISTS idx_events_voting_closes ON events (voting_closes_at)
  WHERE voting_closes_at IS NOT NULL AND cover_photo_event_log_id IS NULL;

-- Add cover photo count to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS cover_photo_count integer NOT NULL DEFAULT 0;

-- ─── STORAGE: Event Photos Bucket ───

-- Create the event-photos bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('event-photos', 'event-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for event-photos bucket
CREATE POLICY "Users can upload event photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'event-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their event photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'event-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read access for event photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'event-photos');
