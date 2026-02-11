import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { processClosedVoting } from "@/lib/queries/coverPhotos";

/**
 * POST /api/cover-photos
 * Process all events where voting has closed and select cover photos.
 *
 * This endpoint should be called by a scheduled job (e.g., Vercel Cron)
 * or can be triggered manually.
 *
 * Requires the CRON_SECRET header for authentication.
 */
export async function POST(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use service role client for admin operations
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const result = await processClosedVoting(supabase);

  return NextResponse.json({
    success: true,
    ...result,
  });
}
