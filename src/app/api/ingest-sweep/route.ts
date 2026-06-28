import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { ingestEventBoxScore } from "@/lib/ingest/boxScore";

/**
 * GET/POST /api/ingest-sweep
 *
 * Reconciliation pass for box-score ingestion. The log flow and onboarding fire
 * a best-effort ingest on save, but that can miss: a game logged before it went
 * final, a fire-and-forget that failed, or any future insert path that forgets.
 * This sweep is the catch-all — it finds events that have been logged but have
 * no event_athletes yet and ingests them, so correctness doesn't depend on
 * every insert site remembering to trigger.
 *
 * It only touches events someone actually logged (not whole leagues), reuses
 * ingestEventBoxScore (idempotent + finality-gated), and processes at most
 * `limit` per run so it stays well within the function budget. Runs on a Vercel
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

  // Distinct event_ids that have been logged.
  const loggedIds = new Set<string>();
  for (let from = 0; ; from += 1000) {
    const { data } = await supabase
      .from("event_logs")
      .select("event_id")
      .not("event_id", "is", null)
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) if (r.event_id) loggedIds.add(r.event_id as string);
    if (data.length < 1000) break;
  }

  // Which of those already have athletes. event_athletes holds ~dozens of rows
  // per event, so a plain .in() over a chunk blows past the 1000-row cap and
  // silently under-reports — page through each chunk's rows explicitly.
  const ids = [...loggedIds];
  const done = new Set<string>();
  for (let i = 0; i < ids.length; i += 300) {
    const chunk = ids.slice(i, i + 300);
    for (let from = 0; ; from += 1000) {
      const { data } = await supabase
        .from("event_athletes")
        .select("event_id")
        .in("event_id", chunk)
        .order("event_id", { ascending: true })
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      for (const r of data) if (r.event_id) done.add(r.event_id as string);
      if (data.length < 1000) break;
    }
  }

  const candidates = ids.filter((id) => !done.has(id));
  // Shuffle before taking the batch. Some candidates can never gain athletes
  // (not-yet-final games, events with no ESPN id, unsupported comps, empty box
  // scores) and would otherwise sit at the front of this stable list and get
  // re-processed every run — starving the ingestable games behind them. A random
  // sample each run guarantees forward progress instead of a permanent stall.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const batch = candidates.slice(0, limit);

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      logged: ids.length,
      withAthletes: done.size,
      candidates: candidates.length,
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
    logged: ids.length,
    withAthletes: done.size,
    candidates: candidates.length,
    processed: batch.length,
    remaining: Math.max(0, candidates.length - batch.length),
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
