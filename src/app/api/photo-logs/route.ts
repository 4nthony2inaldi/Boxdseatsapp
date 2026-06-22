import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLogsFromSuggestions } from "@/lib/queries/photoLogs";
import { isUuid } from "@/lib/validate";

/**
 * POST /api/photo-logs
 * Body: { picks: { eventId: string; rootingTeamId: string | null }[] }
 * Creates the approved logs and returns how many were created.
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
      ? ((body as { picks: unknown[] }).picks)
      : [];

  const picks = rawPicks
    .filter(
      (p): p is { eventId: string; rootingTeamId: string | null } =>
        !!p &&
        typeof p === "object" &&
        isUuid((p as Record<string, unknown>).eventId) &&
        ((p as Record<string, unknown>).rootingTeamId === null ||
          isUuid((p as Record<string, unknown>).rootingTeamId))
    )
    .slice(0, 500);

  try {
    const result = await createLogsFromSuggestions(supabase, user.id, picks);
    return NextResponse.json(result);
  } catch (e) {
    // Log the detail server-side; don't echo raw PostgREST/DB text to the client.
    console.error("[photo-logs] create failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Couldn't save those logs. Please try again." }, { status: 500 });
  }
}
