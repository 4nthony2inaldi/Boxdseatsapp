import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { applyRooting, type RootingPick } from "@/lib/queries/rooting";
import { isUuid } from "@/lib/validate";

/**
 * POST /api/rooting-logs
 * Body: { picks: { logId: string; rootingTeamId: string }[] }
 *
 * Sets a rooting team on already-logged neutral games and recomputes win/loss
 * from the stored score. Each pick is validated server-side against the actual
 * game, and only the caller's own logs are updated.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => null);
  const rawPicks =
    body && typeof body === "object" && Array.isArray((body as { picks?: unknown }).picks)
      ? (body as { picks: unknown[] }).picks
      : [];

  const picks: RootingPick[] = rawPicks
    .filter(
      (p): p is RootingPick =>
        !!p &&
        typeof p === "object" &&
        isUuid((p as Record<string, unknown>).logId) &&
        isUuid((p as Record<string, unknown>).rootingTeamId)
    )
    .slice(0, 1000);

  try {
    const result = await applyRooting(supabase, user.id, picks);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[rooting-logs] failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't save those picks. Please try again." }, { status: 500 });
  }
}
