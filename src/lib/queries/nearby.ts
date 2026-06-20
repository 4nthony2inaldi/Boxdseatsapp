import { SupabaseClient } from "@supabase/supabase-js";
import { metroFromKey, METROS } from "@/lib/metros";

export type NearbyEvent = {
  event_id: string;
  event_date: string;
  tournament_name: string | null;
  home_team: string | null;
  away_team: string | null;
  home_logo: string | null;
  away_logo: string | null;
  home_score: number | null;
  away_score: number | null;
  league_slug: string | null;
  sport: string | null;
  venue_id: string;
  venue_name: string;
  venue_photo: string | null;
  cover_photo_url: string | null;
  tournament_id: string | null;
  distance_m: number;
};

export type NearbyPage = {
  events: NearbyEvent[];
  /** Cursor for the next page (oldest event date loaded), null when exhausted */
  before: string | null;
};

// Max reach (~100mi), so a marquee venue just outside the metro can surface —
// BUT only if this metro is the event's nearest one. That nearest-metro gate is
// what lets the U.S. Open (≈134km, no closer metro) show for NYC while keeping
// Philadelphia's games (closer to Philly) out of the NYC feed, even though both
// are ~130km away — a plain radius can't tell them apart.
const RADIUS_M = 161_000;
const DAYS_AHEAD = 7;
const PAGE_SIZE = 30;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function haversineM(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Collapse multi-day tournament rows to the day nearest today. */
function collapseTournaments(rows: NearbyEvent[], seenTournaments: Set<string>): NearbyEvent[] {
  const today = ymd(new Date());
  const dist = (e: NearbyEvent) =>
    Math.abs(new Date(e.event_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime());
  const byTournament = new Map<string, NearbyEvent>();
  const out: NearbyEvent[] = [];
  for (const e of rows) {
    if (!e.tournament_id) {
      out.push(e);
      continue;
    }
    if (seenTournaments.has(e.tournament_id)) continue;
    const cur = byTournament.get(e.tournament_id);
    if (!cur || dist(e) < dist(cur)) byTournament.set(e.tournament_id, e);
  }
  for (const [tid, e] of byTournament) {
    seenTournaments.add(tid);
    out.push(e);
  }
  return out;
}

/**
 * First page: nearest events regardless of age (the carousel never renders
 * empty), sorted so today leads, then upcoming, then backward in time.
 */
export async function fetchNearbyEvents(
  supabase: SupabaseClient,
  metroKey: string,
  before?: string | null
): Promise<NearbyPage> {
  const metro = metroFromKey(metroKey);
  if (!metro) return { events: [], before: null };

  const until = ymd(new Date(Date.now() + DAYS_AHEAD * 86400_000));

  // Competing metros — any other metro close enough that it could "own" an
  // event within our reach (an event ≤RADIUS from us can only be nearer to a
  // metro within 2×RADIUS of us). We query the same window for each and keep an
  // event only if no competitor is closer to it than we are.
  const competitors = METROS.filter(
    (m) => m.key !== metro.key && haversineM(metro.lat, metro.lng, m.lat, m.lng) <= 2 * RADIUS_M
  );
  const near = (lat: number, lng: number, limit: number) =>
    supabase.rpc("events_near", {
      in_lat: lat, in_lng: lng, in_radius_m: RADIUS_M, in_until: until,
      in_before: before ?? null, in_limit: limit,
    });

  const [primaryRes, ...compRes] = await Promise.all([
    near(metro.lat, metro.lng, PAGE_SIZE),
    ...competitors.map((c) => near(c.lat, c.lng, 60)),
  ]);
  if (primaryRes.error || !primaryRes.data) return { events: [], before: null };

  const rows = primaryRes.data as NearbyEvent[];
  const nextBefore = rows.length === PAGE_SIZE ? rows[rows.length - 1].event_date : null;

  // Per-competitor distance maps (event_id -> distance from that metro).
  const compMaps = compRes.map((r, i) => ({
    metro: competitors[i],
    dist: new Map(((r.data as NearbyEvent[] | null) ?? []).map((e) => [e.event_id, e.distance_m])),
  }));

  // The venue's state lets us prefer a same-state metro over a closer one in a
  // neighboring state — Shinnecock (NY) is nearer Hartford (CT) by straight
  // line, but the U.S. Open belongs to NYC. Long Island Sound makes raw
  // distance lie; state is the cheap correction.
  const venueIds = [...new Set(rows.map((r) => r.venue_id))];
  const venueState = new Map<string, string | null>();
  if (venueIds.length) {
    const { data: vs } = await supabase.from("venues").select("id, state").in("id", venueIds);
    for (const v of vs || []) venueState.set(v.id as string, (v.state as string | null) ?? null);
  }

  // An event is "owned" by the nearest metro in its own state (if any is within
  // reach), else the nearest metro overall. Show it here only if we're that one.
  const owned = rows.filter((r) => {
    const state = venueState.get(r.venue_id) ?? null;
    const contenders = [{ metro, dist: r.distance_m }];
    for (const cm of compMaps) {
      const d = cm.dist.get(r.event_id);
      if (d !== undefined) contenders.push({ metro: cm.metro, dist: d });
    }
    const inState = state ? contenders.filter((c) => c.metro.state === state) : [];
    const pool = inState.length ? inState : contenders;
    let owner = pool[0];
    for (const c of pool) if (c.dist < owner.dist) owner = c;
    return owner.metro.key === metro.key;
  });

  const seen = new Set<string>();
  const events = collapseTournaments(owned, seen);

  if (!before) {
    // initial page: today first, then nearest upcoming/recent, then older
    const today = ymd(new Date());
    const dist = (e: NearbyEvent) =>
      Math.abs(new Date(e.event_date + "T00:00:00").getTime() - new Date(today + "T00:00:00").getTime());
    events.sort((a, b) => {
      const da = dist(a);
      const db = dist(b);
      if (da !== db) return da - db;
      if (a.event_date !== b.event_date) return a.event_date < b.event_date ? 1 : -1;
      return a.distance_m - b.distance_m;
    });
  }
  return { events, before: nextBefore };
}
