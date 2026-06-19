/**
 * Fire-and-forget trigger for lazy box-score ingestion. Call after any client
 * save path that logs an event so the "Players you've seen" data fills in. The
 * /api/ingest-event endpoint is idempotent and finality-gated, so a known event
 * is a cheap no-op and a not-yet-final game is simply retried later (by the log
 * flow or the ingest sweep). Never awaited — the save never waits on it.
 */
export function triggerBoxScoreIngest(eventId: string | null | undefined) {
  if (!eventId) return;
  void fetch("/api/ingest-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventId }),
    keepalive: true,
  }).catch(() => {});
}
