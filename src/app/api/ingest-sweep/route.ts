import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ingestEventBoxScore } from "@/lib/ingest/boxScore";

/**
 * GET/POST /api/ingest-sweep
 *
 * Reconciliation pass for box-score ingestion. The log flow and onboarding fire
 * a best-effort ingest on save, but that can miss: a game logged before it went
 * final, a fire-and-forget that failed, or any future insert path that forgets.
 * This sweep is the catch-all — it finds events still owed a box score and
 * ingests them, so correctness doesn't depend on every insert site remembering
 * to trigger.
 *
 * It reads the work list straight off events.box_score_state = 'pending', an
 * indexed column kept current by a trigger on event_logs (a new log marks its
 * event pending) and by ingestEventBoxScore itself (which flips each event to
 * done/skip/pending as it resolves). That replaces the old approach of paging
 * every logged event and every event_athletes row each run to re-derive what
 * was missing: now the sweep only ever looks at the handful of events that
 * actually still need work.
 *
 * Reuses ingestEventBoxScore (idempotent + finality-gated) and processes at
 * most `limit` per run so it stays within the function budget. Runs on a Vercel
 * cron (see vercel.json); requires CRON_SECRET bearer auth.
 * Query params: ?limit=25 (max 50), ?dryRun=1
 */
export const maxDuration = 60;

async function handle(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: a missing secret must NOT open this service-role endpoint.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "25", 10) || 25, 50);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // How many events are owed a box score, for reporting. Head-only count so it
  // stays O(1) regardless of backlog size.
  const { count: pendingCount } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("box_score_state", "pending");

  // The work list: pending events, newest first so a fresh round of logs gets
  // box scores before we grind through any older backlog.
  const { data: batchRows } = await supabase
    .from("events")
    .select("id")
    .eq("box_score_state", "pending")
    .order("event_date", { ascending: false })
    .limit(limit);
  const batch = (batchRows ?? []).map((r) => r.id as string);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      pending: pendingCount ?? 0,
      wouldProcess: batch.length,
    });
  }

  const tally: Record<string, number> = {};
  let athletesAdded = 0, rows = 0;
  for (const id of batch) {
    try {
      const r = await ingestEventBoxScore(supabase, id);
      tally[r.status] = (tally[r.status] || 0) + 1;
      athletesAdded += r.athletesAdded || 0;
      rows += r.rows || 0;
    } catch {
      tally.error = (tally.error || 0) + 1;
    }
    await new Promise((res) => setTimeout(res, 200)); // be gentle on ESPN
  }

  return NextResponse.json({
    pending: pendingCount ?? 0,
    processed: batch.length,
    remaining: Math.max(0, (pendingCount ?? 0) - batch.length),
    tally,
    athletesAdded,
    eventAthleteRows: rows,
  });
}

export async function GET(request: Request) {
  return handle(request);
}
export async function POST(request: Request) {
  return handle(request);
}
