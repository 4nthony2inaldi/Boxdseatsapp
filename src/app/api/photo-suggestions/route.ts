import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPhotoSuggestions } from "@/lib/queries/photoSuggestions";
import { isUuid, isIsoDate } from "@/lib/validate";

/**
 * POST /api/photo-suggestions
 * Body: { items: { venueId: string; date: "YYYY-MM-DD" }[] }
 *
 * The native photo scan geofences each photo against the bundled venue list
 * on-device and posts only (venue, date) pairs — no coordinates or images. We
 * return the games the user was likely at, with rooting pre-filled.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const rawItems =
    body && typeof body === "object" && Array.isArray((body as { items?: unknown }).items)
      ? ((body as { items: unknown[] }).items)
      : [];

  // venueId/date are interpolated into a PostgREST `.or()` filter downstream,
  // so require exact shapes (uuid + YYYY-MM-DD) — not just "is a string" — to
  // rule out filter injection from a crafted client.
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
    const result = await fetchPhotoSuggestions(supabase, user.id, items);
    return NextResponse.json(result);
  } catch (e) {
    // Log server-side; don't echo raw PostgREST/DB text to the client.
    console.error("[photo-suggestions] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't find your games. Please try again." }, { status: 500 });
  }
}
