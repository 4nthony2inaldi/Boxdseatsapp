-- Same game published under both ESPN id schemes (legacy 9-digit date-style
-- and modern 400-prefixed). Keep the modern row; repoint refs; drop legacy.
WITH d AS (
  SELECT venue_id, event_date, home_team_id,
         (array_agg(id) FILTER (WHERE external_ids->>'espn' ~ '^4'))[1] AS keep_id,
         (array_agg(id) FILTER (WHERE external_ids->>'espn' !~ '^4'))[1] AS drop_id
  FROM events WHERE home_team_id IS NOT NULL
  GROUP BY 1,2,3
  HAVING count(*)=2 AND count(DISTINCT (home_score::text||'-'||away_score::text))=1
     AND count(*) FILTER (WHERE external_ids->>'espn' ~ '^4') = 1
     AND count(*) FILTER (WHERE external_ids->>'espn' !~ '^4') = 1
), mv_logs AS (
  UPDATE event_logs el SET event_id=d.keep_id FROM d WHERE el.event_id=d.drop_id
    AND NOT EXISTS (SELECT 1 FROM event_logs x WHERE x.event_id=d.keep_id AND x.user_id=el.user_id)
  RETURNING el.id
), mv_cover AS (
  UPDATE venues v SET current_cover_event_id=d.keep_id FROM d WHERE v.current_cover_event_id=d.drop_id
  RETURNING v.id
), del AS (
  DELETE FROM events e USING d WHERE e.id=d.drop_id RETURNING e.id
)
SELECT (SELECT count(*) FROM del) AS deleted, (SELECT count(*) FROM mv_logs) AS logs_moved;
