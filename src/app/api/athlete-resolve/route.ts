import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/athlete-resolve  { espnId, name, sport, headshot? }
 *
 * Upserts an ESPN-only athlete (picked from the search fallback) into our table
 * and returns its uuid so it can be favorited. Keyed on (sport, external_ids.espn)
 * so it never duplicates an athlete we already hold. Writes use the service-role
 * client; athletes is public reference data with no per-user rows.
 */
export async function POST(request: Request) {
  let espnId = "", name = "", sport = "", headshot: string | null = null;
  try {
    const b = await request.json();
    espnId = String(b.espnId ?? "");
    name = String(b.name ?? "").trim();
    sport = String(b.sport ?? "");
    headshot = b.headshot ? String(b.headshot) : null;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!espnId || !sport) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  // ESPN athlete ids are numeric. Reject anything else so the id can never
  // break out of the query filter below.
  if (!/^\d+$/.test(espnId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Already have them?
  const { data: found } = await service
    .from("athletes")
    .select("id, headshot_url")
    .eq("sport", sport)
    .eq("external_ids->>espn", espnId)
    .maybeSingle();
  if (found) {
    if (!found.headshot_url && headshot) {
      await service.from("athletes").update({ headshot_url: headshot }).eq("id", found.id);
    }
    return NextResponse.json({ id: found.id });
  }

  const { data: inserted, error } = await service
    .from("athletes")
    .insert({ name: name || "Unknown", sport, is_active: true, headshot_url: headshot, external_ids: { espn: espnId } })
    .select("id")
    .single();
  if (error || !inserted) return NextResponse.json({ error: "Failed to add athlete" }, { status: 500 });
  return NextResponse.json({ id: inserted.id });
}
