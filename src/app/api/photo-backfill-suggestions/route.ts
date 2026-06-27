import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchPhotoBackfill } from "@/lib/queries/photoBackfill";

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

  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];

  const suggestions = await fetchPhotoBackfill(supabase, user.id, items);
  return NextResponse.json({ suggestions });
}
