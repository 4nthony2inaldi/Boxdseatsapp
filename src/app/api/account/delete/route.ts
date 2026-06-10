import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/account/delete
 * Permanently deletes the authenticated user's account.
 *
 * Auth user deletion cascades to profiles (FK on delete cascade), which
 * cascades to all user-owned rows (event_logs, follows, likes, comments,
 * lists, venue_visits, badges, notifications, ...).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json(
      { error: "Account deletion is not configured" },
      { status: 500 }
    );
  }

  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  // Best effort: remove the user's uploaded files first
  try {
    for (const bucket of ["avatars", "event-photos"]) {
      const { data: files } = await admin.storage.from(bucket).list(user.id, {
        limit: 1000,
      });
      if (files && files.length > 0) {
        // event-photos nests files one level deeper ({userId}/{logId}/file)
        const paths: string[] = [];
        for (const f of files) {
          if (f.id) {
            paths.push(`${user.id}/${f.name}`);
          } else {
            const { data: nested } = await admin.storage
              .from(bucket)
              .list(`${user.id}/${f.name}`, { limit: 1000 });
            for (const n of nested || []) {
              paths.push(`${user.id}/${f.name}/${n.name}`);
            }
          }
        }
        if (paths.length > 0) {
          await admin.storage.from(bucket).remove(paths);
        }
      }
    }
  } catch {
    // Storage cleanup is best-effort; account deletion proceeds regardless.
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
