import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/nextjs";
import { INGEST_JOBS } from "@/lib/ingest/jobs";

/**
 * GET/POST /api/ingest-health — the ingest dead-man's switch.
 *
 * Reads the ingest_heartbeats table (written by the syncs) and alerts when a job
 * that was previously alive has stopped succeeding. Each known job has a max age
 * for its last *successful* run, generous enough to absorb a missed cron tick.
 *
 * Why watch job health and not event recency: in the offseason a league
 * legitimately produces no new events for weeks, so "no new rows" is not a
 * failure. A stale last_success_at is — it means the job stopped running, or it
 * keeps running while every upstream fetch fails (sync-events records that case
 * as "degraded", which does not advance last_success_at).
 *
 * A job with no heartbeat row yet is treated as "unseen" (not yet deployed, or
 * the GitHub Actions arm's secrets aren't set) and never alerts — the switch
 * watches jobs that were alive and went quiet, not ones that never started.
 *
 * Alerts go to Sentry via captureMessage (no-op unless SENTRY_DSN is set). The
 * response always carries the full per-job status so a manual hit or the Vercel
 * cron log shows health even without Sentry. Runs on a Vercel cron (see
 * vercel.json); requires CRON_SECRET bearer auth.
 */
export const maxDuration = 30;

type HeartbeatRow = {
  job: string;
  last_run_at: string | null;
  last_success_at: string | null;
  last_status: string | null;
  detail: Record<string, unknown> | null;
};

async function handle(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: a missing secret must NOT open this service-role endpoint.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("ingest_heartbeats")
    .select("job, last_run_at, last_success_at, last_status, detail");

  if (error) {
    // Table missing (migration not yet applied) or transient read failure: don't
    // throw, and don't false-alarm. Report it so the cron log shows the reason.
    return NextResponse.json({ healthy: null, reason: "heartbeats unavailable", error: error.message });
  }

  const byJob = new Map<string, HeartbeatRow>();
  for (const r of (data || []) as HeartbeatRow[]) byJob.set(r.job, r);

  const now = Date.now();
  const jobs: Array<Record<string, unknown>> = [];
  const stale: string[] = [];

  for (const [job, spec] of Object.entries(INGEST_JOBS)) {
    const row = byJob.get(job);
    if (!row) {
      jobs.push({ job, label: spec.label, state: "unseen" });
      continue;
    }
    const successAt = row.last_success_at ? Date.parse(row.last_success_at) : null;
    const ageMinutes =
      successAt != null ? Math.round((now - successAt) / 60000) : null;
    // Unhealthy if it has run but never succeeded, or its last success is older
    // than the allowed window.
    const unhealthy = ageMinutes == null || ageMinutes > spec.maxAgeMinutes;
    const entry = {
      job,
      label: spec.label,
      state: unhealthy ? "stale" : "healthy",
      lastSuccessAt: row.last_success_at,
      lastRunAt: row.last_run_at,
      lastStatus: row.last_status,
      ageMinutes,
      maxAgeMinutes: spec.maxAgeMinutes,
      detail: row.detail,
    };
    jobs.push(entry);
    if (unhealthy) {
      stale.push(
        `${job} (${spec.label}): last success ${ageMinutes == null ? "never" : `${ageMinutes}m ago`}, allowed ${spec.maxAgeMinutes}m`
      );
    }
  }

  if (stale.length > 0) {
    Sentry.captureMessage(`Ingest stalled: ${stale.join("; ")}`, {
      level: "error",
      extra: { jobs },
    });
  }

  return NextResponse.json({ healthy: stale.length === 0, stale, jobs });
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
