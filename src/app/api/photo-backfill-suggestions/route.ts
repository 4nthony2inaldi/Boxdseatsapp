import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPhotoBackfill } from "@/lib/queries/photoBackfill";
import { isUuid, isIsoDate } from "@/lib/validate";

/**
 * POST /api/photo-backfill-suggestions
 * Body: { items: { venueId, date }[] } — (venue, date) pairs resolved on-device
 * from the user's photos. Returns the games they already logged WITHOUT a photo
 * at those pairs, to bulk-attach photos to.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const rawItems =
    body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)
      ? (body as { items: unknown[] }).items
      : [];

  // venueId/date are interpolated into a PostgREST `.or()` filter downstream, so
  // require exact shapes (uuid + YYYY-MM-DD) to rule out filter injection — same
  // guard as /api/photo-suggestions.
  const items = rawItems
    .filter(
      (i): i is { venueId: string; date: string } =>
        !!i &&
        typeof i === "object" &&
        isUuid((i as Record<string, unknown>).venueId) &&
        isIsoDate((i as Record<string, unknown>).date)
    )
    .slice(0, 1000);

  try {
    const suggestions = await fetchPhotoBackfill(supabase, user.id, items);
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error("[photo-backfill-suggestions] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't find your games. Please try again." }, { status: 500 });
  }
}
