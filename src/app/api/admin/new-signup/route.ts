import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

/**
 * POST /api/admin/new-signup
 * Called by a Supabase database webhook when a row is inserted into `profiles`
 * (i.e. a new account is created). Inserts a notification addressed to each
 * admin so the existing notifications -> /api/push pipeline pushes it to their
 * device. Intentionally a webhook + insert (not a DB trigger on the signup
 * path) so a failure here can never block account creation.
 *
 * Auth: Bearer PUSH_WEBHOOK_SECRET (shared with the push webhook). Fail closed.
 */
export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const record: { id?: string; username?: string | null } | undefined = body?.record;
  if (!record?.id) {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: admins } = await supabase.from("admin_users").select("user_id");
  // Don't notify the new account about itself (e.g. if an admin is re-created).
  const adminIds = (admins || []).map((a) => a.user_id as string).filter((id) => id !== record.id);
  if (adminIds.length === 0) {
    return NextResponse.json({ skipped: "no admins" });
  }

  // Reuse the existing notification/push pipeline: the push title is the
  // actor's name (the new user) and the body is the message, so this reads as
  // "@username · just created an account" with no new notification type or
  // changes to /api/push.
  const rows = adminIds.map((uid) => ({
    user_id: uid,
    type: "friend_activity" as const,
    actor_id: record.id!,
    message: "just created an account",
  }));

  const { error } = await supabase.from("notifications").insert(rows);
  if (error) {
    console.error("[new-signup] notification insert failed:", error.message);
    return NextResponse.json({ error: "insert failed" }, { status: 500 });
  }

  return NextResponse.json({ notified: adminIds.length });
}
