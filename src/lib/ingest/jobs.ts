export type IngestJobSpec = { maxAgeMinutes: number; label: string };

/**
 * Known ingest jobs and how stale their last *successful* run may get before
 * the dead-man's switch (/api/ingest-health) and the admin panel call them
 * stale. Shared so the alert threshold and the UI never drift apart.
 *
 * sync-events runs hourly (vercel.json) — 180m absorbs two missed ticks.
 * event-sync runs every 6h (GitHub Actions) — 840m (14h) absorbs one miss + slack.
 */
export const INGEST_JOBS: Record<string, IngestJobSpec> = {
  "sync-events": { maxAgeMinutes: 180, label: "Vercel hourly event sync" },
  "event-sync": { maxAgeMinutes: 840, label: "GitHub Actions college + individual-sport sync" },
};
