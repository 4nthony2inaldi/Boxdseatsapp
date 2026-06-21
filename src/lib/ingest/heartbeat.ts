import type { SupabaseClient } from "@supabase/supabase-js";

export type HeartbeatStatus = "ok" | "degraded" | "error";

/**
 * Record an ingest job's heartbeat (see migration 20260621_ingest_heartbeats and
 * /api/ingest-health, the dead-man's switch that reads these rows).
 *
 * `last_success_at` is advanced only when status is "ok" — i.e. the run did
 * useful work. On "degraded"/"error" we still bump `last_run_at` (so we know the
 * job is alive) but leave `last_success_at` untouched, so the health check ages
 * it out: a job that keeps running while every upstream fetch fails is not
 * healthy. PostgREST upsert only writes the columns present in the payload, so
 * omitting `last_success_at` here preserves its prior value on conflict.
 *
 * Best-effort: never let a heartbeat failure break the sync that called it.
 */
export async function recordHeartbeat(
  supabase: SupabaseClient,
  job: string,
  status: HeartbeatStatus,
  detail?: Record<string, unknown>,
): Promise<void> {
  const now = new Date().toISOString();
  const row: Record<string, unknown> = {
    job,
    last_run_at: now,
    last_status: status,
    detail: detail ?? null,
    updated_at: now,
  };
  if (status === "ok") row.last_success_at = now;
  try {
    await supabase.from("ingest_heartbeats").upsert(row, { onConflict: "job" });
  } catch {
    // Swallow — the heartbeat is observability, not part of the sync's job.
  }
}
