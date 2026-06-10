import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET/POST /api/sync-events
 * Keeps team-sport events fresh from ESPN's public scoreboards:
 *  - ingests upcoming/scheduled games (so fans can log from the venue),
 *  - attaches final scores once games complete,
 *  - corrects dates for postponed games.
 *
 * Runs on a Vercel Cron (see vercel.json). Requires CRON_SECRET bearer auth.
 * Query params: ?days=3 (lookback), ?ahead=2 (lookahead), ?dryRun=1
 */

const LEAGUE_PATHS: Record<string, string> = {
  nfl: "football/nfl",
  nba: "basketball/nba",
  mlb: "baseball/mlb",
  nhl: "hockey/nhl",
  mls: "soccer/usa.1",
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
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const lookback = Math.min(parseInt(url.searchParams.get("days") || "3", 10), 14);
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

  // Venue lookup: by espn id and by normalized name
  const { data: venues } = await supabase
    .from("venues")
    .select("id, name, external_ids");
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

    for (const ev of payload.events || []) {
      const comp = ev.competitions?.[0];
      if (!comp) continue;
      // Exhibitions (All-Star etc.) are excluded — same policy as the seeder
      if (["ALLSTAR", "QRR"].includes(comp.type?.abbreviation || "")) {
        stats.skipped++;
        continue;
      }
      const home = comp.competitors?.find((c) => c.homeAway === "home");
      const away = comp.competitors?.find((c) => c.homeAway === "away");
      const homeId = teamByEspn.get(String(home?.team?.id ?? ""));
      const awayId = teamByEspn.get(String(away?.team?.id ?? ""));
      if (!homeId || !awayId) {
        stats.skipped++; // unknown teams = exhibition/foreign side
        continue;
      }

      const completed =
        comp.status?.type?.completed === true ||
        ev.status?.type?.completed === true;
      const homeScore = completed && home?.score != null ? parseInt(home.score, 10) : null;
      const awayScore = completed && away?.score != null ? parseInt(away.score, 10) : null;
      const eventDate = localDate(ev.date);

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
          is_postseason: ev.season?.type === 3,
          external_ids: { espn: String(ev.id) },
        });
        if (error) {
          stats.skipped++;
          continue;
        }
      }
      stats.inserted++;
    }
  }

  return NextResponse.json({ success: true, dryRun, range: dateRange, report });
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
