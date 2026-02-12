import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/queries/social";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const offset = parseInt(searchParams.get("offset") || "0", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);

  const { entries, hasMore } = await fetchFeed(supabase, user.id, limit, offset);

  return NextResponse.json({ entries, hasMore });
}
