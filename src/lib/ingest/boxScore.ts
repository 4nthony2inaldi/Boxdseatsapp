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

type Sport = "baseball" | "basketball" | "football" | "hockey" | "soccer" | "golf" | "motorsports" | "tennis" | "australian_football";

// stat_line is per-category because sports report wildly different lines
// (baseball batting/pitching, basketball PTS/REB/AST, football passing/rushing,
// hockey G/A/TOI). Each category maps an ESPN stat label to its value as given.
type StatLine = Record<string, Record<string, string>>;

type Participant = {
  espnId: string;
  name: string | null;
  espnTeamId: string | null;
  finish: number | null;
  winner: boolean | null;
  statLine: StatLine | null;
  headshot: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const headshotOf = (ath: any): string | null =>
  (typeof ath?.headshot?.href === "string" && ath.headshot.href) ||
  (typeof ath?.headshot === "string" && ath.headshot) ||
  null;

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
  ncaam: "basketball/mens-college-basketball",
  ncaaw: "basketball/womens-college-basketball",
  nhl: "hockey/nhl",
  nfl: "football/nfl", ncaaf: "football/college-football",
  // AFL box scores use the same summary->boxscore.players shape as the other
  // team sports, so parseTeam handles them; just register the ESPN path.
  afl: "australian-football/afl",
  // International baseball tournaments — same summary->boxscore.players shape.
  wbc: "baseball/world-baseball-classic",
  "caribbean-series": "baseball/caribbean-series",
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
  // One participant per athlete, merging the stat categories they appear in
  // (e.g. a baseball player who both batted and pitched). Each category zips
  // ESPN's labels to that athlete's aligned stat values.
  const byId = new Map<string, Participant>();
  for (const t of arr(d?.boxscore?.players)) {
    const tid = t?.team?.id ? String(t.team.id) : null;
    for (const cat of arr(t?.statistics)) {
      const labels = (arr(cat?.labels).length ? arr(cat?.labels) : arr(cat?.names)).map((x: unknown) => String(x));
      const catName = String(cat?.name || cat?.type || "stats");
      for (const a of arr(cat?.athletes)) {
        const ath = a?.athlete || {};
        if (!ath.id) continue;
        const id = String(ath.id);
        let p = byId.get(id);
        if (!p) {
          p = { espnId: id, name: ath.displayName ?? null, espnTeamId: tid, finish: null, winner: null, statLine: {}, headshot: headshotOf(ath) };
          byId.set(id, p);
        }
        const vals = arr(a?.stats);
        if (labels.length && vals.length && p.statLine) {
          const row: Record<string, string> = {};
          for (let i = 0; i < labels.length; i++) {
            const v = vals[i];
            if (v !== undefined && v !== null && v !== "") row[labels[i]] = String(v);
          }
          if (Object.keys(row).length) p.statLine[catName] = row;
        }
      }
    }
  }
  return [...byId.values()].map((p) => ({
    ...p,
    statLine: p.statLine && Object.keys(p.statLine).length ? p.statLine : null,
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseSoccer(d: any): Participant[] {
  const out: Participant[] = [];
  for (const t of arr(d?.rosters)) {
    const tid = t?.team?.id;
    for (const r of arr(t?.roster)) {
      const ath = r?.athlete || {};
      if (!ath.id) continue;
      // ESPN soccer gives a flat per-player stat array (goals G, assists A,
      // saves SV, shots on goal SOG, …); keep it all under one category, keyed
      // by abbreviation, the way the other sports key by label.
      const row: Record<string, string> = {};
      for (const s of arr(r?.stats)) {
        const k = s?.abbreviation ? String(s.abbreviation) : null;
        const v = s?.displayValue ?? s?.value;
        if (k && v !== undefined && v !== null && v !== "") row[k] = String(v);
      }
      const statLine = Object.keys(row).length ? { stats: row } : null;
      out.push({ espnId: String(ath.id), name: ath.displayName ?? null, espnTeamId: tid ? String(tid) : null, finish: null, winner: null, statLine, headshot: headshotOf(ath) });
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
        if (aid) out.push({ espnId: String(aid), name: c?.athlete?.displayName ?? null, espnTeamId: null, finish: c?.order ?? null, winner: !!c?.winner, statLine: null, headshot: headshotOf(c?.athlete) });
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

// A walk-off = the home team won having been tied or trailing entering the
// bottom of the final inning (9th or later) — i.e. they took the lead in their
// last at-bat. Derived from the per-inning linescores in the game summary.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isWalkoff(d: any): boolean {
  const cs = arr(d?.header?.competitions?.[0]?.competitors);
  const home = cs.find((c: any) => c?.homeAway === "home"); // eslint-disable-line @typescript-eslint/no-explicit-any
  const away = cs.find((c: any) => c?.homeAway === "away"); // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!home || !away) return false;
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const homeFinal = n(home.score);
  const awayFinal = n(away.score);
  if (homeFinal <= awayFinal) return false; // home must win
  const homeLines = arr(home.linescores);
  const awayLines = arr(away.linescores);
  const innings = Math.max(homeLines.length, awayLines.length);
  if (innings < 9) return false; // 9th or later
  const lastHome = n(homeLines[innings - 1]?.value ?? homeLines[innings - 1]);
  // homeFinal - lastHome = home's runs entering the bottom of the final inning;
  // if that was <= the away total, the home team was tied/behind and won there.
  return homeFinal - lastHome <= awayFinal;
}

/** Fetch + parse a single event. Returns null when the sport is unsupported. */
async function fetchEvent(
  sport: Sport, slug: string, espnId: string, date: string
): Promise<{ participants: Participant[]; completed: boolean; walkoff?: boolean } | null> {
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
    // The leaderboard/field is populated before play, so "field exists" is not
    // "final". Gate on the tournament's actual status so an upcoming event a fan
    // logs early isn't ingested with non-final positions and marked done.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gev = arr((d as any)?.events).find((e: any) => String(e.id) === base) ?? arr((d as any)?.events)[0];
    const st = gev?.status?.type;
    return { participants: p, completed: st?.completed === true || st?.state === "post" };
  }
  if (sport === "motorsports") {
    const path = RACING[slug];
    if (!path) return null;
    const d = await espn(`https://site.api.espn.com/apis/site/v2/sports/racing/${path}/scoreboard?dates=${date.replace(/-/g, "")}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matched = arr((d as any)?.events).filter((x: any) => String(x.id) === espnId);
    const p = parseField({ events: matched });
    // Gate on the race's status (the entry list exists pre-race). Fall back to
    // field-present only if ESPN omits a status, so this never regresses a real
    // completed race that lacks the field.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const st = (matched[0] as any)?.status?.type;
    return { participants: p, completed: st ? (st.completed === true || st.state === "post") : p.length > 0 };
  }
  const path = TEAM_PATH[slug];
  if (!path) return null;
  const d = await espn(`https://site.api.espn.com/apis/site/v2/sports/${path}/summary?event=${espnId}`);
  return { participants: parseTeam(d), completed: isCompleted(d), walkoff: sport === "baseball" && isWalkoff(d) };
}

/** Chunk helper — keeps `.in()` filters under the PostgREST list limit. */
function chunk<T>(a: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < a.length; i += n) out.push(a.slice(i, i + n));
  return out;
}

/**
 * Cache the box-score outcome on the event so the ingest sweep can find the
 * events that still need work with a single indexed query, instead of
 * re-deriving "what's missing" by scanning every logged event each run.
 *   pending = logged, still needs a box score (retry).
 *   done    = athletes ingested (or already present).
 *   skip    = terminal: no ESPN id, unsupported sport/comp, or a final game
 *             ESPN has no lineup for — never worth re-attempting.
 * Best-effort: a state-write failure must never break the ingest itself.
 */
async function setBoxScoreState(
  supabase: SupabaseClient,
  eventId: string,
  state: "pending" | "done" | "skip"
): Promise<void> {
  try {
    await supabase.from("events").update({ box_score_state: state }).eq("id", eventId);
  } catch {
    /* observability only */
  }
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
  if ((count ?? 0) > 0) { await setBoxScoreState(supabase, eventId, "done"); return { status: "already" }; }

  // Event meta (sport + slug + espn id + date)
  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("event_date, external_ids, league_id, event_tags, leagues(sport, slug)")
    .eq("id", eventId)
    .single();
  // Distinguish a transient read error from a genuinely-missing row. On an error
  // we leave the event pending so the next sweep retries it; only a true
  // not-found is marked skip, so a deleted/absent event can't churn the sweep
  // (re-selected as pending) forever.
  if (evErr) return { status: "skip" };
  if (!ev) { await setBoxScoreState(supabase, eventId, "skip"); return { status: "skip" }; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const league = (ev as any).leagues as { sport: Sport | null; slug: string | null } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const leagueId = (ev as any).league_id as string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const espnId = ((ev as any).external_ids as Record<string, unknown> | null)?.espn;
  const sport = league?.sport;
  const slug = league?.slug;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const date = (ev as any).event_date as string;
  if (!espnId || !sport || !slug || sport === "tennis") { await setBoxScoreState(supabase, eventId, "skip"); return { status: "skip" }; }

  const fetched = await fetchEvent(sport, slug, String(espnId), date);
  if (!fetched) { await setBoxScoreState(supabase, eventId, "skip"); return { status: "skip" }; } // unsupported sport/comp — terminal
  if (!fetched.completed) { await setBoxScoreState(supabase, eventId, "pending"); return { status: "pending" }; } // game not final — retry later

  // Tag walk-off wins (baseball) off the linescore we just fetched. Independent
  // of the lineup below, so a walk-off with no box-score lineup still gets it.
  if (fetched.walkoff) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tags = ((ev as any).event_tags as string[] | null) ?? [];
    if (!tags.includes("walkoff")) {
      try {
        await supabase.from("events").update({ event_tags: [...tags, "walkoff"] }).eq("id", eventId);
      } catch { /* best-effort; the badge is a nicety, not core ingest */ }
    }
  }

  // Dedupe participants by espn id
  const byId = new Map<string, Participant>();
  for (const p of fetched.participants) byId.set(p.espnId, p);
  const participants = [...byId.values()];
  if (participants.length === 0) { await setBoxScoreState(supabase, eventId, "skip"); return { status: "empty" }; } // final, but ESPN has no lineup

  // Resolve existing athletes by (sport, espn id); insert the genuinely new ones.
  const espnToUuid = new Map<string, string>();
  // Existing athletes that have no headshot yet -> their uuid, so we can backfill
  // one when this box score carries it (fills the players-seen grid over time).
  const needHeadshot = new Map<string, string>();
  const espnIds = participants.map((p) => p.espnId);
  for (const c of chunk(espnIds, 80)) {
    const { data } = await supabase
      .from("athletes")
      .select("id, external_ids, headshot_url")
      .eq("sport", sport)
      .in("external_ids->>espn", c);
    for (const a of data || []) {
      const e = (a.external_ids as Record<string, unknown> | null)?.espn;
      if (!e) continue;
      espnToUuid.set(String(e), a.id as string);
      if (!a.headshot_url) needHeadshot.set(String(e), a.id as string);
    }
  }
  // Backfill headshots for already-known athletes that were missing one.
  for (const p of participants) {
    const uuid = p.headshot ? needHeadshot.get(p.espnId) : undefined;
    if (uuid) await supabase.from("athletes").update({ headshot_url: p.headshot }).eq("id", uuid);
  }
  const missing = participants.filter((p) => !espnToUuid.has(p.espnId));
  let added = 0;
  for (const c of chunk(missing, 100)) {
    const rows = c.map((p) => ({ name: p.name || "Unknown", sport, is_active: true, headshot_url: p.headshot ?? null, external_ids: { espn: p.espnId } }));
    const { data } = await supabase.from("athletes").insert(rows).select("id, external_ids");
    for (const a of data || []) {
      const e = (a.external_ids as Record<string, unknown> | null)?.espn;
      if (e) espnToUuid.set(String(e), a.id as string);
    }
    added += data?.length || 0;
  }

  // ESPN team id -> our team uuid (team sports only carry one). ESPN reuses the
  // same numeric team id across sports (e.g. id 10 is both the NY Yankees and
  // the Houston Rockets), so scope the lookup to this event's league or the
  // wrong-sport team can win.
  const teamMap = new Map<string, string>();
  const teamEspnIds = [...new Set(participants.map((p) => p.espnTeamId).filter((t): t is string => !!t))];
  if (teamEspnIds.length > 0) {
    let teamQuery = supabase
      .from("teams")
      .select("id, external_ids")
      .in("external_ids->>espn", teamEspnIds);
    if (leagueId) teamQuery = teamQuery.eq("league_id", leagueId);
    const { data } = await teamQuery;
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
        // stat_line is a text column; store the per-category line as JSON.
        stat_line: p.statLine ? JSON.stringify(p.statLine) : null,
      };
    })
    .filter((r): r is NonNullable<typeof r> => !!r);

  for (const c of chunk(eaRows, 500)) {
    await supabase.from("event_athletes").insert(c);
  }

  await setBoxScoreState(supabase, eventId, "done");
  return { status: "ingested", athletesAdded: added, rows: eaRows.length };
}
