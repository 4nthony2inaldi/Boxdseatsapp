import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncUpcomingGolf } from "@/lib/sync/upcomingFieldEvents";

/**
 * GET/POST /api/sync-events
 * Keeps team-sport events fresh from ESPN's public scoreboards:
 *  - ingests upcoming/scheduled games (so fans can log from the venue),
 *  - attaches final scores once games complete,
 *  - corrects dates for postponed games,
 *  - removes games ESPN has dropped (cancelled / unnecessary "if necessary"
 *    playoff games) that were never played and that nobody logged.
 *
 * Runs on a Vercel Cron (see vercel.json). Requires CRON_SECRET bearer auth.
 * Query params: ?days=10 (lookback), ?ahead=2 (lookahead), ?dryRun=1
 */

const LEAGUE_PATHS: Record<string, string> = {
  nfl: "football/nfl",
  nba: "basketball/nba",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
  wnba: "basketball/wnba",
  mls: "soccer/usa.1",
  nwsl: "soccer/usa.nwsl",
  "eng.1": "soccer/eng.1",
  "esp.1": "soccer/esp.1",
  "ger.1": "soccer/ger.1",
  "ita.1": "soccer/ita.1",
  "fra.1": "soccer/fra.1",
  "fifa.world": "soccer/fifa.world",
};

const LEAGUE_SPORTS: Record<string, string> = {
  nfl: "football",
  nba: "basketball",
  mlb: "baseball",
  nhl: "hockey",
  wnba: "basketball",
  mls: "soccer",
  nwsl: "soccer",
  "eng.1": "soccer",
  "esp.1": "soccer",
  "ger.1": "soccer",
  "ita.1": "soccer",
  "fra.1": "soccer",
  "fifa.world": "soccer",
};

type EspnEvent = {
  id: string;
  date: string;
  name: string;
  season?: { year?: number; type?: number };
  competitions?: Array<{
    type?: { abbreviation?: string };
    venue?: {
      id?: string;
      fullName?: string;
      address?: { city?: string; state?: string; country?: string };
    };
    competitors?: Array<{
      homeAway?: string;
      score?: string;
      team?: { id?: string };
    }>;
    status?: { type?: { completed?: boolean } };
  }>;
  status?: { type?: { completed?: boolean; name?: string } };
};

const normName = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** ESPN dates are UTC; shift 5h toward US-local so late games keep their local date. */
function localDate(espnIso: string): string {
  const d = new Date(new Date(espnIso).getTime() - 5 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function handleSync(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: a missing secret must NOT open this service-role write endpoint.
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  // Lookback is generous (default 10d) so a final that posts late — or a cron
  // run that missed the game's day — still gets its score backfilled instead of
  // falling permanently out of the window with a stale/empty score.
  const lookback = Math.min(parseInt(url.searchParams.get("days") || "10", 10), 21);
  const lookahead = Math.min(parseInt(url.searchParams.get("ahead") || "2", 10), 7);
  const dryRun = url.searchParams.get("dryRun") === "1";

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const from = new Date(Date.now() - lookback * 86400 * 1000);
  const to = new Date(Date.now() + lookahead * 86400 * 1000);
  const dateRange = `${fmtDate(from)}-${fmtDate(to)}`;
  const fromDate = from.toISOString().slice(0, 10);
  const toDate = to.toISOString().slice(0, 10);

  const { data: leagues } = await supabase
    .from("leagues")
    .select("id, slug")
    .in("slug", Object.keys(LEAGUE_PATHS));
  const leagueIds = new Map((leagues || []).map((l) => [l.slug, l.id]));

  // Venue lookup: by espn id and by normalized name.
  // Page past the 1,000-row cap — the venues table is already >1,500, so a
  // single select would hide venues from the matcher and spawn duplicates.
  const venues: { id: string; name: string; external_ids: Record<string, unknown> }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page } = await supabase
      .from("venues")
      .select("id, name, external_ids")
      .range(from, from + 999);
    if (!page || page.length === 0) break;
    venues.push(...(page as typeof venues));
    if (page.length < 1000) break;
  }
  const venueByEspn = new Map<string, string>();
  const venueByName = new Map<string, string>();
  for (const v of venues || []) {
    const espn = (v.external_ids as Record<string, string>)?.espn;
    if (espn) venueByEspn.set(String(espn), v.id);
    venueByName.set(normName(v.name), v.id);
  }

  const report: Record<string, Record<string, number>> = {};

  for (const [slug, path] of Object.entries(LEAGUE_PATHS)) {
    const leagueId = leagueIds.get(slug);
    if (!leagueId) continue;
    const stats = {
      inserted: 0,
      scoresUpdated: 0,
      dateCorrected: 0,
      removed: 0,
      skipped: 0,
      venuesCreated: 0,
    };
    report[slug] = stats;

    // Teams in this league, by ESPN id
    const { data: teams } = await supabase
      .from("teams")
      .select("id, external_ids")
      .eq("league_id", leagueId);
    const teamByEspn = new Map<string, string>();
    for (const t of teams || []) {
      const espn = (t.external_ids as Record<string, string>)?.espn;
      if (espn) teamByEspn.set(String(espn), t.id);
    }

    // Existing events in the window, by ESPN id
    const { data: existing } = await supabase
      .from("events")
      .select("id, event_date, home_score, away_score, external_ids")
      .eq("league_id", leagueId)
      .gte("event_date", fromDate)
      .lte("event_date", toDate);
    const existingByEspn = new Map<
      string,
      { id: string; event_date: string; home_score: number | null; away_score: number | null }
    >();
    for (const e of existing || []) {
      const espn = (e.external_ids as Record<string, string>)?.espn;
      if (espn) existingByEspn.set(String(espn), e);
    }

    let payload: { events?: EspnEvent[] };
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${path}/scoreboard?dates=${dateRange}&limit=1000`,
        { signal: AbortSignal.timeout(20000) }
      );
      if (!res.ok) throw new Error(`ESPN ${res.status}`);
      payload = await res.json();
    } catch {
      stats.skipped = -1; // signals fetch failure for this league
      continue;
    }

    // Every game ESPN returns for this window — anything we hold that's NOT in
    // here may have been dropped by ESPN (cancelled / unnecessary playoff game).
    const seenEspnIds = new Set<string>();

    for (const ev of payload.events || []) {
      seenEspnIds.add(String(ev.id));
      const comp = ev.competitions?.[0];
      if (!comp) continue;
      // Exhibitions (All-Star etc.) are excluded — same policy as the seeder
      if (["ALLSTAR", "QRR"].includes(comp.type?.abbreviation || "")) {
        stats.skipped++;
        continue;
      }
      const home = comp.competitors?.find((c) => c.homeAway === "home");
      const away = comp.competitors?.find((c) => c.homeAway === "away");

      // Season typing: 1 = preseason (kept, labeled), 2 = regular,
      // 3 = postseason, 4 = offseason (skipped).
      const seasonType = ev.season?.type;
      if (seasonType === 4) {
        stats.skipped++;
        continue;
      }
      const isPreseason = seasonType === 1;

      const completed =
        comp.status?.type?.completed === true ||
        ev.status?.type?.completed === true;
      const homeScore = completed && home?.score != null ? parseInt(home.score, 10) : null;
      const awayScore = completed && away?.score != null ? parseInt(away.score, 10) : null;
      const eventDate = localDate(ev.date);

      // Existing event: refresh its score/date. We matched it by ESPN event id,
      // so this needs no team resolution — which matters for leagues whose teams
      // aren't keyed by a plain ESPN id (national teams are stored as "fifa:478"
      // while ESPN's scoreboard returns "478"). Resolving teams first here would
      // skip every World Cup game and leave scores stuck at their seeded value.
      const found = existingByEspn.get(String(ev.id));
      if (found) {
        const updates: Record<string, unknown> = {};
        if (completed && homeScore !== null && (found.home_score !== homeScore || found.away_score !== awayScore)) {
          updates.home_score = homeScore;
          updates.away_score = awayScore;
          updates.is_draw = homeScore === awayScore;
        }
        if (found.event_date !== eventDate) {
          updates.event_date = eventDate;
        }
        if (Object.keys(updates).length > 0) {
          if (!dryRun) {
            await supabase.from("events").update(updates).eq("id", found.id);
          }
          if (updates.home_score !== undefined) stats.scoresUpdated++;
          if (updates.event_date !== undefined) stats.dateCorrected++;
        }
        continue;
      }

      // New event: inserting it needs our home/away team ids. (Unmatched teams
      // are exhibitions/foreign sides we don't carry — skip.)
      const homeId = teamByEspn.get(String(home?.team?.id ?? ""));
      const awayId = teamByEspn.get(String(away?.team?.id ?? ""));
      if (!homeId || !awayId) {
        stats.skipped++;
        continue;
      }

      // Resolve venue: espn id, then name, then create
      let venueId: string | undefined;
      const espnVenueId = comp.venue?.id ? String(comp.venue.id) : null;
      if (espnVenueId) venueId = venueByEspn.get(espnVenueId);
      if (!venueId && comp.venue?.fullName) {
        venueId = venueByName.get(normName(comp.venue.fullName));
      }
      if (!venueId && comp.venue?.fullName) {
        if (dryRun) {
          stats.venuesCreated++;
          stats.inserted++;
          continue;
        }
        const { data: newVenue } = await supabase
          .from("venues")
          .insert({
            name: comp.venue.fullName,
            city: comp.venue.address?.city || "Unknown",
            state: comp.venue.address?.state || null,
            country: comp.venue.address?.country || "US",
            status: "active",
            primary_sport: LEAGUE_SPORTS[slug] || null,
            external_ids: espnVenueId ? { espn: espnVenueId } : {},
          })
          .select("id")
          .single();
        if (!newVenue) {
          stats.skipped++;
          continue;
        }
        venueId = newVenue.id;
        if (espnVenueId) venueByEspn.set(espnVenueId, venueId!);
        venueByName.set(normName(comp.venue.fullName), venueId!);
        stats.venuesCreated++;
      }
      if (!venueId) {
        stats.skipped++; // no venue data — same policy as the seeder
        continue;
      }

      if (!dryRun) {
        const { error } = await supabase.from("events").insert({
          league_id: leagueId,
          venue_id: venueId,
          event_date: eventDate,
          event_template: "match",
          home_team_id: homeId,
          away_team_id: awayId,
          home_score: homeScore,
          away_score: awayScore,
          is_draw: completed && homeScore !== null && homeScore === awayScore,
          season: ev.season?.year ?? new Date(eventDate).getFullYear(),
          is_postseason: seasonType === 3,
          is_preseason: isPreseason,
          round_or_stage: isPreseason
            ? slug === "mlb"
              ? "Spring Training"
              : "Preseason"
            : null,
          external_ids: { espn: String(ev.id) },
        });
        if (error) {
          stats.skipped++;
          continue;
        }
      }
      stats.inserted++;
    }

    // Reconcile cancellations. A game we hold in this window that ESPN no longer
    // lists, is already past, and was never played (no score) is almost always a
    // cancelled or unnecessary "if necessary" playoff game — nobody could have
    // attended it. Remove those so they stop showing in the feed, but never
    // delete one a user has logged. Guarded on a non-empty ESPN response so a
    // transient empty fetch can't trigger a mass delete.
    if ((payload.events?.length ?? 0) > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const orphans = (existing || []).filter((e) => {
        const espn = (e.external_ids as Record<string, string>)?.espn;
        return (
          !!espn &&
          !seenEspnIds.has(String(espn)) &&
          e.home_score === null &&
          e.away_score === null &&
          e.event_date < todayStr
        );
      });
      if (orphans.length > 0) {
        const ids = orphans.map((o) => o.id);
        const { data: withLogs } = await supabase
          .from("event_logs")
          .select("event_id")
          .in("event_id", ids);
        const logged = new Set((withLogs || []).map((l) => l.event_id as string));
        const removable = ids.filter((id) => !logged.has(id));
        if (removable.length > 0 && !dryRun) {
          await supabase.from("events").delete().in("id", removable);
        }
        stats.removed = removable.length;
      }
    }
  }

  // Individual-sport events that are upcoming / in progress (not yet final), so
  // fans can log them and they show in "happening around you" while they're on.
  // Skipped on dry runs since it writes.
  let upcoming: unknown = null;
  if (!dryRun) {
    try {
      upcoming = { golf: await syncUpcomingGolf(supabase) };
    } catch {
      upcoming = { error: true };
    }
  }

  return NextResponse.json({ success: true, dryRun, range: dateRange, report, upcoming });
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
