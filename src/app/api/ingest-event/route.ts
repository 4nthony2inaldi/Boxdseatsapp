import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ingestEventBoxScore } from "@/lib/ingest/boxScore";

/**
 * POST /api/ingest-event  { eventId }
 *
 * Lazily populates an event's box score (athletes + event_athletes) the first
 * time it's logged. Fired non-blocking from the log flow, so it never slows the
 * save. Idempotent and finality-gated (see ingestEventBoxScore).
 *
 * Authz: requires a signed-in user (so it can't be used as an open ESPN proxy).
 * The actual writes use the service-role client, mirroring the ingest script —
 * athletes / event_athletes are public reference data with no per-user rows.
 */
export async function POST(request: Request) {
  let eventId: string | undefined;
  try {
    ({ eventId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!eventId || typeof eventId !== "string") {
    return NextResponse.json({ error: "Missing eventId" }, { status: 400 });
  }

  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only ingest events the caller actually logged. This keeps the endpoint
  // from being used to drive arbitrary ESPN fetches / writes for any event id.
  const { data: logRow } = await auth
    .from("event_logs")
    .select("id")
    .eq("user_id", user.id)
    .eq("event_id", eventId)
    .limit(1)
    .maybeSingle();
  if (!logRow) return NextResponse.json({ status: "forbidden" }, { status: 403 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const result = await ingestEventBoxScore(service, eventId);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
