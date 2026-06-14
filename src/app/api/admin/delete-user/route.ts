import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/queries/admin";

/**
 * POST /api/admin/delete-user  { userId }
 * Permanently deletes another user's account. Admin-only.
 *
 * Authorization is re-checked here from the caller's session (never trusts the
 * client). Deleting the auth user cascades to profiles and all owned rows;
 * storage is purged best-effort. Guards: can't delete yourself or another admin.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  if (!(await isAdmin(supabase, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let targetId: string;
  try {
    ({ userId: targetId } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (!targetId || typeof targetId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }
  if (targetId === user.id) {
    return NextResponse.json(
      { error: "You can't delete your own account here — use Settings." },
      { status: 400 }
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  const admin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );

  // Don't allow deleting another admin (remove their admin row first, deliberately).
  if (await isAdmin(admin, targetId)) {
    return NextResponse.json(
      { error: "That account is an admin. Revoke admin before deleting." },
      { status: 400 }
    );
  }

  // Best-effort storage cleanup (DB cascade doesn't touch buckets).
  try {
    for (const bucket of ["avatars", "event-photos"]) {
      const { data: files } = await admin.storage.from(bucket).list(targetId, { limit: 1000 });
      if (files && files.length > 0) {
        const paths: string[] = [];
        for (const f of files) {
          if (f.id) {
            paths.push(`${targetId}/${f.name}`);
          } else {
            const { data: nested } = await admin.storage
              .from(bucket)
              .list(`${targetId}/${f.name}`, { limit: 1000 });
            for (const n of nested || []) paths.push(`${targetId}/${f.name}/${n.name}`);
          }
        }
        if (paths.length > 0) await admin.storage.from(bucket).remove(paths);
      }
    }
  } catch {
    // proceed regardless
  }

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    return NextResponse.json({ error: "Failed to delete user." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
