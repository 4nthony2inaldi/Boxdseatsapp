import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { resolveAthleteHeadshot } from "@/lib/ingest/athleteHeadshot";

/**
 * POST /api/headshot-backfill
 *
 * Backfills headshots for the signed-in user's favorited athletes that are still
 * missing one — so athletes chosen before lazy-fetch existed (e.g. an old
 * favorite) fill in when the owner next opens their profile. Bounded per call;
 * best-effort. Returns how many were updated so the client can refresh.
 */
export async function POST() {
  const auth = await createClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // The user's favorited athlete ids (RLS-scoped read).
  const { data: favs } = await auth
    .from("user_league_favorites")
    .select("athlete_id")
    .eq("user_id", user.id)
    .not("athlete_id", "is", null);
  const ids = [...new Set((favs || []).map((f) => f.athlete_id as string).filter(Boolean))];
  if (!ids.length) return NextResponse.json({ updated: 0 });

  const service = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: athletes } = await service
    .from("athletes")
    .select("id, name, sport, external_ids")
    .in("id", ids)
    .is("headshot_url", null);
  // Cap the work per request — a profile load shouldn't fan out unbounded.
  const targets = (athletes || []).slice(0, 12);
  if (!targets.length) return NextResponse.json({ updated: 0 });

  let updated = 0;
  for (let i = 0; i < targets.length; i += 4) {
    const batch = targets.slice(i, i + 4);
    await Promise.all(
      batch.map(async (a) => {
        const name = a.name as string | null;
        if (!name) return;
        const espnId = (a.external_ids as Record<string, unknown> | null)?.espn;
        const url = await resolveAthleteHeadshot({
          name,
          sport: (a.sport as string | null) ?? null,
          espnId: espnId ? String(espnId) : null,
        });
        if (!url) return;
        const { error } = await service.from("athletes").update({ headshot_url: url }).eq("id", a.id);
        if (!error) updated++;
      })
    );
  }
  return NextResponse.json({ updated });
}
