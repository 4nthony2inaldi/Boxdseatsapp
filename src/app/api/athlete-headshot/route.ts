import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { searchAthletesEspn } from "@/lib/queries/athleteSearchEspn";

/**
 * POST /api/athlete-headshot  { athleteId }
 *
 * Lazily backfills an athlete's headshot the first time someone favorites them,
 * the same way box scores are pulled after a log. No-op if they already have one
 * or have no ESPN id. Reuses the ESPN search (by name) to read the headshot URL,
 * so it works across sports without a per-sport CDN guess.
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

  const espnId = (athlete.external_ids as Record<string, unknown> | null)?.espn;
  const name = athlete.name as string | null;
  if (!espnId || !name) return NextResponse.json({ status: "skip" });

  try {
    const hits = await searchAthletesEspn(name, athlete.sport as string | null, 20);
    const match = hits.find((h) => h.espnId === String(espnId) && h.headshotUrl);
    if (!match?.headshotUrl) return NextResponse.json({ status: "none" });
    await service.from("athletes").update({ headshot_url: match.headshotUrl }).eq("id", athleteId);
    return NextResponse.json({ status: "updated" });
  } catch {
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
