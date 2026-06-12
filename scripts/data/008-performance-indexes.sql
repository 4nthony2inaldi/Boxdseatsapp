-- Performance indexes for hot foreign-key query paths.
-- APPLIED TO PROD + STAGING via Management API.
-- The events table (183K rows / 91MB) was sequentially scanned on every
-- team page (home_team_id OR away_team_id). Postgres bitmap-ORs these two.
CREATE INDEX IF NOT EXISTS idx_events_home_team ON events (home_team_id) WHERE home_team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_events_away_team ON events (away_team_id) WHERE away_team_id IS NOT NULL;

-- These tables are small today but on guaranteed-growth hot paths
-- (timeline league filter, comment threads, notification actors, lookups).
CREATE INDEX IF NOT EXISTS idx_event_logs_league ON event_logs (league_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications (actor_id);
CREATE INDEX IF NOT EXISTS idx_venue_teams_venue ON venue_teams (venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_teams_team ON venue_teams (team_id);
CREATE INDEX IF NOT EXISTS idx_venue_aliases_venue ON venue_aliases (venue_id);
CREATE INDEX IF NOT EXISTS idx_list_items_list ON list_items (list_id);
CREATE INDEX IF NOT EXISTS idx_list_follows_list ON list_follows (list_id);
