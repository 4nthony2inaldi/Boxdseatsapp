import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolveAthleteHeadshot } from "@/lib/ingest/athleteHeadshot";

/**
 * POST /api/athlete-headshot  { athleteId }
 *
 * Lazily backfills one athlete's headshot the first time someone favorites them,
 * the same way box scores are pulled after a log. No-op if they already have
 * one. Resolves via ESPN (by id) then a Wikipedia lead-photo fallback, so it
 * works across sports — favorites only, never from box-score ingest.
 *
 * Authz: requires a signed-in user (so it can't be an open ESPN proxy). The
 * write uses the service-role client — athletes is public reference data.
 */
export async function POST(request: Request) {
  let athleteId = "";
  try {
    athleteId = String((await request.json())?.athleteId ?? "");
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!athleteId) return NextResponse.json({ error: "Missing athleteId" }, { status: 400 });

  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: athlete } = await service
    .from("athletes")
    .select("id, name, sport, headshot_url, external_ids")
    .eq("id", athleteId)
    .maybeSingle();
  if (!athlete) return NextResponse.json({ status: "skip" });
  if (athlete.headshot_url) return NextResponse.json({ status: "already" });

  const name = athlete.name as string | null;
  if (!name) return NextResponse.json({ status: "skip" });
  const espnId = (athlete.external_ids as Record<string, unknown> | null)?.espn;

  try {
    const url = await resolveAthleteHeadshot({
      name,
      sport: (athlete.sport as string | null) ?? null,
      espnId: espnId ? String(espnId) : null,
    });
    if (!url) return NextResponse.json({ status: "none" });
    await service.from("athletes").update({ headshot_url: url }).eq("id", athleteId);
    return NextResponse.json({ status: "updated" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
