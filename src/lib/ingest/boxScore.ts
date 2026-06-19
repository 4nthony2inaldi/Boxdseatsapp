import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Box-score ingestion: given an event, fetch its ESPN box score and populate
 * `athletes` + `event_athletes` so the fan can see who they watched in person.
 *
 * This is the TS port of scripts/data/ingest_boxscores.py, run lazily the first
 * time an event is logged. It is:
 *  - idempotent: an event that already has event_athletes rows is skipped, so
 *    only the first logger of a given event pays the fetch and every later
 *    logger (and the same user on any later view) gets the data for free;
 *  - finality-gated: team and soccer events are only ingested once ESPN reports
 *    the game complete, so we never write a partial line for a live game;
 *  - athlete-deduped: participants resolve to existing athletes by
 *    (sport, external_ids.espn) and only genuinely new ones are inserted.
 *
 * Tennis is intentionally unsupported (a logged day maps to many matches, so
 * attendance is ambiguous).
 */

type Sport = "baseball" | "basketball" | "football" | "hockey" | "soccer" | "golf" | "motorsports" | "tennis";

type Participant = {
  espnId: string;
  name: string | null;
  espnTeamId: string | null;
  finish: number | null;
  winner: boolean | null;
};

export type IngestResult = {
  status: "ingested" | "already" | "pending" | "skip" | "empty";
  athletesAdded?: number;
  rows?: number;
};

const SOCCER_CODE: Record<string, string> = { mls: "usa.1", nwsl: "usa.nwsl" };
const RACING: Record<string, string> = {
  "nascar-cup": "nascar-premier", "nascar-xfinity": "nascar-secondary",
  "nascar-truck": "nascar-craftsman", f1: "f1", indycar: "irl", imsa: "imsa",
};
const TEAM_PATH: Record<string, string> = {
  mlb: "baseball/mlb", nba: "basketball/nba", wnba: "basketball/wnba",
  ncaam: "basketball/mens-college-basketball", nhl: "hockey/nhl",
  nfl: "football/nfl", ncaaf: "football/college-football",
};

async function espn(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "BoxdSeats/1.0 (arinaldi@yext.com)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseTeam(d: any): Participant[] {
  const out: Participant[] = [];
  for (const t of arr(d?.boxscore?.players)) {
    const tid = t?.team?.id;
    for (const cat of arr(t?.statistics)) {
      for (const a of arr(cat?.athletes)) {
        const ath = a?.athlete || {};
        if (ath.id) out.push({ espnId: String(ath.id), name: ath.displayName ?? null, espnTeamId: tid ? String(tid) : null, finish: null, winner: null });
      }
    }
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSoccer(d: any): Participant[] {
  const out: Participant[] = [];
  for (const t of arr(d?.rosters)) {
    const tid = t?.team?.id;
    for (const r of arr(t?.roster)) {
      const ath = r?.athlete || {};
      if (ath.id) out.push({ espnId: String(ath.id), name: ath.displayName ?? null, espnTeamId: tid ? String(tid) : null, finish: null, winner: null });
    }
  }
  return out;
}

// golf / motorsports — competitor.id is the stable athlete id
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseField(d: any): Participant[] {
  const out: Participant[] = [];
  const evs = arr(d?.events).length ? arr(d?.events) : [d];
  for (const e of evs) {
    for (const comp of arr(e?.competitions)) {
      for (const c of arr(comp?.competitors)) {
        const aid = c?.id || c?.athlete?.id;
        if (aid) out.push({ espnId: String(aid), name: c?.athlete?.displayName ?? null, espnTeamId: null, finish: c?.order ?? null, winner: !!c?.winner });
      }
    }
  }
  return out;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isCompleted(d: any): boolean {
  const st = d?.header?.competitions?.[0]?.status?.type || d?.status?.type;
  return st?.completed === true || st?.state === "post";
}

/** Fetch + parse a single event. Returns null when the sport is unsupported. */
async function fetchEvent(
  sport: Sport, slug: string, espnId: string, date: string
): Promise<{ participants: Participant[]; completed: boolean } | null> {
  if (sport === "tennis") return null;
  if (sport === "soccer") {
    const code = SOCCER_CODE[slug] || slug;
    const d = await espn(`https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/summary?event=${espnId}`);
    return { participants: parseSoccer(d), completed: isCompleted(d) };
  }
  if (sport === "golf") {
    const base = espnId.split("-")[0];
    const d = await espn(`https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga&event=${base}`);
    const p = parseField(d);
    return { participants: p, completed: p.length > 0 }; // leaderboard exists -> field is final
  }
  if (sport === "motorsports") {
    const path = RACING[slug];
    if (!path) return null;
    const d = await espn(`https://site.api.espn.com/apis/site/v2/sports/racing/${path}/scoreboard?dates=${date.replace(/-/g, "")}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matched = arr((d as any)?.events).filter((x: any) => String(x.id) === espnId);
    const p = parseField({ events: matched });
    return { participants: p, completed: p.length > 0 };
  }
  const path = TEAM_PATH[slug];
  if (!path) return null;
  const d = await espn(`https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${espnId}`);
  return { participants: parseTeam(d), completed: isCompleted(d) };
}

/** Chunk helper — keeps `.in()` filters under the PostgREST list limit. */
function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

/**
 * Ingest one event's box score. `supabase` must be a service-role client
 * (writes to athletes / event_athletes bypass RLS, as the script does).
 */
export async function ingestEventBoxScore(
  supabase: SupabaseClient,
  eventId: string
): Promise<IngestResult> {
  // Idempotent: already ingested?
  const { count } = await supabase
    .from("event_athletes")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if ((count ?? 0) > 0) return { status: "already" };

  // Event meta (sport + slug + espn id + date)
  const { data: ev } = await supabase
    .from("events")
    .select("event_date, external_ids, leagues(sport, slug)")
    .eq("id", eventId)
    .single();
  if (!ev) return { status: "skip" };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const league = (ev as any).leagues as { sport: Sport | null; slug: string | null } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const espnId = ((ev as any).external_ids as Record<string, unknown> | null)?.espn;
  const sport = league?.sport;
  const slug = league?.slug;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const date = (ev as any).event_date as string;
  if (!espnId || !sport || !slug || sport === "tennis") return { status: "skip" };

  const fetched = await fetchEvent(sport, slug, String(espnId), date);
  if (!fetched) return { status: "skip" };
  if (!fetched.completed) return { status: "pending" }; // game not final — retry later

  // Dedupe participants by espn id
  const byId = new Map<string, Participant>();
  for (const p of fetched.participants) byId.set(p.espnId, p);
  const participants = [...byId.values()];
  if (participants.length === 0) return { status: "empty" };

  // Resolve existing athletes by (sport, espn id); insert the genuinely new ones.
  const espnToUuid = new Map<string, string>();
  const espnIds = participants.map((p) => p.espnId);
  for (const c of chunk(espnIds, 80)) {
    const { data } = await supabase
      .from("athletes")
      .select("id, external_ids")
      .eq("sport", sport)
      .in("external_ids->>espn", c);
    for (const a of data || []) {
      const e = (a.external_ids as Record<string, unknown> | null)?.espn;
      if (e) espnToUuid.set(String(e), a.id as string);
    }
  }
  const missing = participants.filter((p) => !espnToUuid.has(p.espnId));
  let added = 0;
  for (const c of chunk(missing, 100)) {
    const rows = c.map((p) => ({ name: p.name || "Unknown", sport, is_active: true, external_ids: { espn: p.espnId } }));
    const { data } = await supabase.from("athletes").insert(rows).select("id, external_ids");
    for (const a of data || []) {
      const e = (a.external_ids as Record<string, unknown> | null)?.espn;
      if (e) espnToUuid.set(String(e), a.id as string);
    }
    added += data?.length || 0;
  }

  // ESPN team id -> our team uuid (team sports only carry one).
  const teamMap = new Map<string, string>();
  const teamEspnIds = [...new Set(participants.map((p) => p.espnTeamId).filter((t): t is string => !!t))];
  if (teamEspnIds.length > 0) {
    const { data } = await supabase
      .from("teams")
      .select("id, external_ids")
      .in("external_ids->>espn", teamEspnIds);
    for (const t of data || []) {
      const e = (t.external_ids as Record<string, unknown> | null)?.espn;
      if (e) teamMap.set(String(e), t.id as string);
    }
  }

  const eaRows = participants
    .map((p) => {
      const athleteId = espnToUuid.get(p.espnId);
      if (!athleteId) return null;
      return {
        event_id: eventId,
        athlete_id: athleteId,
        team_id: p.espnTeamId ? teamMap.get(p.espnTeamId) ?? null : null,
        finish_position: p.finish,
        is_winner: p.winner,
      };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);

  for (const c of chunk(eaRows, 500)) {
    await supabase.from("event_athletes").insert(c);
  }

  return { status: "ingested", athletesAdded: added, rows: eaRows.length };
}
