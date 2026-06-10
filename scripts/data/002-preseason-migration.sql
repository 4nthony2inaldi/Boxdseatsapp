-- Preseason support: spring training / preseason games are real, attendable
-- events. is_postseason already exists; this adds the matching flag so the
-- fan record can optionally exclude exhibition results later.
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_preseason boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_events_preseason ON events (is_preseason) WHERE is_preseason;
