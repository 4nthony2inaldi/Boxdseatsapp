/**
 * ESPN athlete search — the fallback behind the favorites picker so a fan can
 * always find a real player by name, even one we haven't ingested yet (a
 * retired star like Gilbert Arenas, say). ESPN's search returns the athlete's
 * id, sport (from the clubhouse link), and headshot; when the fan picks one of
 * these, /api/athlete-resolve upserts it into our table, so the pool fills in
 * with exactly the players people actually look for.
 */

export type EspnAthleteHit = {
  espnId: string;
  name: string;
  sport: string;
  headshotUrl: string | null;
};

// ESPN clubhouse path segment -> our sport_type enum.
const PATH_SPORT: Record<string, string> = {
  mlb: "baseball",
  nba: "basketball", wnba: "basketball",
  "mens-college-basketball": "basketball", "womens-college-basketball": "basketball",
  nfl: "football", "college-football": "football",
  nhl: "hockey",
  soccer: "soccer",
  golf: "golf",
  tennis: "tennis",
  racing: "motorsports",
};

type EspnSearchPayload = { results?: { type?: string; contents?: unknown[] }[] };

/** Pure parse of ESPN's search/v2 payload into athlete hits (sport-filtered). */
export function parseEspnSearch(
  payload: EspnSearchPayload,
  sport?: string | null,
  limit = 10
): EspnAthleteHit[] {
  const out: EspnAthleteHit[] = [];
  const seen = new Set<string>();
  for (const sec of payload.results ?? []) {
    if (sec?.type !== "player") continue;
    for (const raw2 of sec.contents ?? []) {
      const it = raw2 as {
        displayName?: string;
        uid?: string;
        image?: { default?: string } | null;
        link?: { web?: string } | null;
      };
      const web = it.link?.web ?? "";
      const m = web.match(/espn\.com\/([^/]+)\/(?:player|driver)\/_\/id\/(\d+)/);
      const pathSeg = m?.[1];
      const id = m?.[2] || String(it.uid ?? "").match(/a:(\d+)/)?.[1];
      if (!id) continue;
      const sp = pathSeg ? PATH_SPORT[pathSeg] : undefined;
      if (!sp) continue; // unknown / unsupported sport path
      if (sport && sp !== sport) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ espnId: id, name: it.displayName ?? "", sport: sp, headshotUrl: it.image?.default ?? null });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export async function searchAthletesEspn(
  query: string,
  sport?: string | null,
  limit = 10
): Promise<EspnAthleteHit[]> {
  const raw = query.trim();
  if (raw.length < 2) return [];
  try {
    const res = await fetch(
      `https://site.web.api.espn.com/apis/search/v2?query=${encodeURIComponent(raw)}&limit=20`,
      { headers: { "User-Agent": "BoxdSeats/1.0 (arinaldi@yext.com)" }, signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return [];
    return parseEspnSearch(await res.json(), sport, limit);
  } catch {
    return [];
  }
}
