import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPhotoSuggestions } from "@/lib/queries/photoSuggestions";

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

  const items = rawItems
    .filter(
      (i): i is { venueId: string; date: string } =>
        !!i &&
        typeof i === "object" &&
        typeof (i as Record<string, unknown>).venueId === "string" &&
        typeof (i as Record<string, unknown>).date === "string"
    )
    .slice(0, 1000);

  const result = await fetchPhotoSuggestions(supabase, user.id, items);
  return NextResponse.json(result);
}
