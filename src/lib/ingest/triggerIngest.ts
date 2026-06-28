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

/**
 * Fire-and-forget headshot backfill, called when an athlete is favorited. The
 * endpoint is a no-op if they already have a headshot or no ESPN id, so it's
 * cheap to call on every athlete pick.
 */
export function triggerAthleteHeadshot(athleteId: string | null | undefined) {
  if (!athleteId) return;
  void fetch("/api/athlete-headshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ athleteId }),
    keepalive: true,
  }).catch(() => {});
}

/**
 * Bulk variant for the photo finder, which logs many games at once. Fires the
 * same per-event ingest but with bounded concurrency so we don't open ~100
 * sockets / hammer ESPN at once. Fire-and-forget: callers don't await it, and
 * anything that fails here is still caught by the ingest-sweep cron. Each call
 * is idempotent + finality-gated, so already-ingested events are cheap no-ops.
 */
export async function triggerBoxScoreIngestMany(
  eventIds: (string | null | undefined)[],
  concurrency = 4
): Promise<void> {
  const ids = [...new Set(eventIds.filter((id): id is string => !!id))];
  let next = 0;
  async function worker() {
    while (next < ids.length) {
      const id = ids[next++];
      try {
        await fetch("/api/ingest-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: id }),
          keepalive: true,
        });
      } catch {
        /* best-effort; the sweep is the safety net */
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
}
