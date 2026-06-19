import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchAthletes } from "@/lib/queries/onboarding";
import { searchAthletesEspn } from "@/lib/queries/athleteSearchEspn";
import type { Database } from "@/lib/database.types";

type SportEnum = Database["public"]["Enums"]["sport_type"];

/**
 * POST /api/athlete-search  { q, sport? }
 *
 * Powers the favorites picker. Searches our own athletes first; when that's
 * thin (e.g. a retired player we haven't ingested), it augments with ESPN's
 * search so the fan can still find them. ESPN-only hits come back with an
 * `espnId` and no `id` — selecting one calls /api/athlete-resolve to upsert it.
 */

type Hit = { id: string | null; espnId: string | null; name: string; sport: string | null; headshot: string | null };

const LOCAL_ENOUGH = 5; // skip the ESPN call when we already have solid local coverage

export async function POST(request: Request) {
  let q = "", sport: string | null = null;
  try {
    const body = await request.json();
    q = String(body.q ?? "").trim();
    sport = body.sport ? String(body.sport) : null;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!q) return NextResponse.json({ results: [] });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const local = await searchAthletes(supabase, q, 10, sport);
  const results: Hit[] = local.map((a) => ({ id: a.id, espnId: null, name: a.name, sport: a.sport, headshot: null }));
  const localIds = new Set(results.map((r) => r.id));

  if (results.length < LOCAL_ENOUGH) {
    const espn = await searchAthletesEspn(q, sport, 10);
    if (espn.length > 0) {
      // Fold in any ESPN hit we already hold (match by sport + espn id) as a
      // local pick; surface the rest as resolve-on-select ESPN hits.
      const bySport = new Map<string, string[]>();
      for (const e of espn) {
        const list = bySport.get(e.sport) ?? [];
        list.push(e.espnId);
        bySport.set(e.sport, list);
      }
      const existing = new Map<string, string>(); // `${sport}:${espnId}` -> uuid
      for (const [sp, ids] of bySport) {
        const { data } = await supabase
          .from("athletes")
          .select("id, external_ids")
          .eq("sport", sp as SportEnum)
          .filter("external_ids->>espn", "in", `(${ids.join(",")})`);
        for (const a of data || []) {
          const eid = (a.external_ids as Record<string, unknown> | null)?.espn;
          if (eid) existing.set(`${sp}:${eid}`, a.id as string);
        }
      }
      for (const e of espn) {
        if (results.length >= 10) break;
        const uuid = existing.get(`${e.sport}:${e.espnId}`);
        if (uuid) {
          if (!localIds.has(uuid)) { results.push({ id: uuid, espnId: null, name: e.name, sport: e.sport, headshot: e.headshotUrl }); localIds.add(uuid); }
        } else {
          results.push({ id: null, espnId: e.espnId, name: e.name, sport: e.sport, headshot: e.headshotUrl });
        }
      }
    }
  }

  return NextResponse.json({ results });
}
