import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLogsFromSuggestions } from "@/lib/queries/photoLogs";

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
        typeof (p as Record<string, unknown>).eventId === "string" &&
        ((p as Record<string, unknown>).rootingTeamId === null ||
          typeof (p as Record<string, unknown>).rootingTeamId === "string")
    )
    .slice(0, 500);

  try {
    const result = await createLogsFromSuggestions(supabase, user.id, picks);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 });
  }
}
