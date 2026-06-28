import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLogsFromSuggestions } from "@/lib/queries/photoLogs";
import { markVenuesVisited } from "@/lib/queries/onboarding";
import { isUuid } from "@/lib/validate";

/**
 * POST /api/photo-logs
 * Body: {
 *   picks: { eventId: string; rootingTeamId: string | null }[],
 *   visitedVenueIds?: string[]   // "Also been to these?" geofence-only confirms
 * }
 * Creates the approved logs, marks any confirmed geofence-only venues visited,
 * and returns how many games + venues were added.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const rawPicks =
    body && typeof body === "object" && Array.isArray((body as { picks?: unknown }).picks)
      ? ((body as { picks: unknown[] }).picks)
      : [];
  const rawVenueIds =
    body && typeof body === "object" && Array.isArray((body as { visitedVenueIds?: unknown }).visitedVenueIds)
      ? ((body as { visitedVenueIds: unknown[] }).visitedVenueIds)
      : [];

  const picks = rawPicks
    .filter(
      (p): p is { eventId: string; rootingTeamId: string | null } =>
        !!p &&
        typeof p === "object" &&
        isUuid((p as Record<string, unknown>).eventId) &&
        ((p as Record<string, unknown>).rootingTeamId === null ||
          isUuid((p as Record<string, unknown>).rootingTeamId))
    )
    .slice(0, 500);

  const visitedVenueIds = rawVenueIds.filter((v): v is string => isUuid(v)).slice(0, 500);

  try {
    const result = await createLogsFromSuggestions(supabase, user.id, picks);
    // Logged games already mark their venue visited via the auto_visit_venue
    // trigger; these are the geofence-only venues (no game) the user confirmed.
    if (visitedVenueIds.length) {
      await markVenuesVisited(supabase, user.id, visitedVenueIds);
    }
    return NextResponse.json({ ...result, venues: result.venues + visitedVenueIds.length });
  } catch (e) {
    // Log the detail server-side; don't echo raw PostgREST/DB text to the client.
    console.error("[photo-logs] create failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't save those logs. Please try again." }, { status: 500 });
  }
}
