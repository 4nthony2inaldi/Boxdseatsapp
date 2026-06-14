import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/queries/admin";

/**
 * POST /api/admin/reset-onboarding  { userId }
 * Re-arms the onboarding flow for a user (admin-only, testing tool).
 *
 * Onboarding is gated by BOTH the auth metadata flag `onboarding_completed`
 * AND profiles.fav_sport, so we clear both. This is a "light" reset — it
 * re-triggers the flow without wiping the user's other data.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let targetId: string;
  try {
    ({ userId: targetId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!targetId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "Not configured" }, { status: 500 });
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  // Clear the auth metadata flag (merge to preserve other metadata)
  const { data: target } = await admin.auth.admin.getUserById(targetId);
  const meta = { ...(target?.user?.user_metadata || {}), onboarding_completed: false };
  const { error: authErr } = await admin.auth.admin.updateUserById(targetId, { user_metadata: meta });
  // Clear the secondary indicator
  const { error: profErr } = await admin.from("profiles").update({ fav_sport: null }).eq("id", targetId);

  if (authErr || profErr) {
    return NextResponse.json({ error: "Failed to reset onboarding." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
