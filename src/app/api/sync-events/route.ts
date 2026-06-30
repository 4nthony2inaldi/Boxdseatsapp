import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { syncUpcomingGolf } from "@/lib/sync/upcomingFieldEvents";
import { recordHeartbeat } from "@/lib/ingest/heartbeat";

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

// The leagues are processed sequentially (one ESPN scoreboard fetch + its DB
// work apiece), and we now carry ~40 of them, so the run needs well more than
// the platform default function timeout. Sequential is deliberate: it lets each
// venue insert populate the in-memory cache before the next league reads it, so
// a venue shared across competitions (Wembley hosts the FA Cup and League Cup
// finals and England games) isn't created twice. 60s leaves comfortable head.
export const maxDuration = 60;

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
  "mex.1": "soccer/mex.1",
  "fifa.world": "soccer/fifa.world",
  "uefa.euro": "soccer/uefa.euro",
  // UEFA club + nations competitions
  "uefa.champions": "soccer/uefa.champions",
  "uefa.europa": "soccer/uefa.europa",
  "uefa.europa.conf": "soccer/uefa.europa.conf",
  "uefa.nations": "soccer/uefa.nations",
  // Domestic cups
  "eng.fa": "soccer/eng.fa",
  "eng.league_cup": "soccer/eng.league_cup",
  "esp.copa_del_rey": "soccer/esp.copa_del_rey",
  "ita.coppa_italia": "soccer/ita.coppa_italia",
  "ger.dfb_pokal": "soccer/ger.dfb_pokal",
  "fra.coupe_de_france": "soccer/fra.coupe_de_france",
  // More domestic leagues
  "eng.2": "soccer/eng.2",
  "por.1": "soccer/por.1",
  "ned.1": "soccer/ned.1",
  "sco.1": "soccer/sco.1",
  // North America
  "concacaf.leagues.cup": "soccer/concacaf.leagues.cup",
  "concacaf.champions": "soccer/concacaf.champions",
  // International + South America
  "conmebol.america": "soccer/conmebol.america",
  "concacaf.gold": "soccer/concacaf.gold",
  "conmebol.libertadores": "soccer/conmebol.libertadores",
  "fifa.cwc": "soccer/fifa.cwc",
  // Australian rules football
  afl: "australian-football/afl",
  // International baseball tournaments
  wbc: "baseball/world-baseball-classic",
  "caribbean-series": "baseball/caribbean-series",
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
  "mex.1": "soccer",
  "fifa.world": "soccer",
  "uefa.euro": "soccer",
  "uefa.champions": "soccer",
  "uefa.europa": "soccer",
  "uefa.europa.conf": "soccer",
  "uefa.nations": "soccer",
  "eng.fa": "soccer",
  "eng.league_cup": "soccer",
  "esp.copa_del_rey": "soccer",
  "ita.coppa_italia": "soccer",
  "ger.dfb_pokal": "soccer",
  "fra.coupe_de_france": "soccer",
  "eng.2": "soccer",
  "por.1": "soccer",
  "ned.1": "soccer",
  "sco.1": "soccer",
  "concacaf.leagues.cup": "soccer",
  "concacaf.champions": "soccer",
  "conmebol.america": "soccer",
  "concacaf.gold": "soccer",
  "conmebol.libertadores": "soccer",
  "fifa.cwc": "soccer",
  afl: "australian_football",
  wbc: "baseball",
  "caribbean-series": "baseball",
};

// All-Star games are ingested as team-less, tagged 'field' events (their ad-hoc
// squads aren't real teams) — same shape and titles as the seeder backfill.
const ALLSTAR_TITLES: Record<string, string> = {
  nfl: "Pro Bowl",
  nba: "NBA All-Star Game",
  mlb: "MLB All-Star Game",
  nhl: "NHL All-Star Game",
  wnba: "WNBA All-Star Game",
};
// Weekend side-events are out of scope (just the game). Not on this API today,
// but guard by name in case ESPN ever surfaces one through the All-Star path.
const ALLSTAR_SIDE_EVENT_RE =
  /rising stars|celebrity|skills|home run derby|dunk|three-point|3-point|4 nations/i;

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
      team?: { id?: string; displayName?: string };
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
  const venues: { id: string; name: string; primary_sport: string | null; external_ids: Record<string, unknown> }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data: page } = await supabase
      .from("venues")
      .select("id, name, primary_sport, external_ids")
      .range(from, from + 999);
    if (!page || page.length === 0) break;
    venues.push(...(page as typeof venues));
    if (page.length < 1000) break;
  }
  // ESPN venue ids are not unique across sports, so the espn-id map is keyed by
  // {id, sport} and only trusted when the sport matches the league being synced
  // (else a new league's venue id can collide with an existing other-sport
  // venue — that's how AFL games once attached to MLB ballparks). A cross-sport
  // or unknown-sport id falls through to the name map / creation.
  const venueByEspn = new Map<string, { id: string; sport: string | null }>();
  const venueByName = new Map<string, string>();
  for (const v of venues || []) {
    const espn = (v.external_ids as Record<string, string>)?.espn;
    if (espn) venueByEspn.set(String(espn), { id: v.id, sport: v.primary_sport });
    venueByName.set(normName(v.name), v.id);
  }

  // Shared soccer team lookup, by ESPN id, across every soccer league we carry.
  // A club plays the same fixtures-worth of competitions from one home base:
  // Arsenal is in eng.1, the Champions League, and the FA Cup. Teams are stored
  // once (under their domestic league) and reused, so resolving a cup or
  // continental fixture must look across all soccer leagues — a per-league map
  // would miss Arsenal when syncing the Champions League and skip the game.
  // Built once and shared by every soccer league in the loop. ESPN club ids are
  // unique within soccer, so there's no cross-sport collision; non-soccer
  // leagues keep their own per-league map below.
  const soccerLeagueIds: string[] = [];
  for (const [slug, id] of leagueIds) {
    if (LEAGUE_SPORTS[slug] === "soccer") soccerLeagueIds.push(id);
  }
  const soccerTeamByEspn = new Map<string, string>();
  if (soccerLeagueIds.length > 0) {
    for (let from = 0; ; from += 1000) {
      const { data: page } = await supabase
        .from("teams")
        .select("id, external_ids")
        .in("league_id", soccerLeagueIds)
        .range(from, from + 999);
      if (!page || page.length === 0) break;
      for (const t of page) {
        const espn = (t.external_ids as Record<string, string>)?.espn;
        if (espn) soccerTeamByEspn.set(String(espn), t.id);
      }
      if (page.length < 1000) break;
    }
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

    // Teams, by ESPN id. Soccer leagues share one cross-league map (so cup and
    // continental fixtures resolve clubs that live under their domestic league);
    // every other sport keeps a per-league map.
    let teamByEspn: Map<string, string>;
    if (LEAGUE_SPORTS[slug] === "soccer") {
      teamByEspn = soccerTeamByEspn;
    } else {
      const { data: teams } = await supabase
        .from("teams")
        .select("id, external_ids")
        .eq("league_id", leagueId);
      teamByEspn = new Map<string, string>();
      for (const t of teams || []) {
        const espn = (t.external_ids as Record<string, string>)?.espn;
        if (espn) teamByEspn.set(String(espn), t.id);
      }
    }

    // Existing events in the window, by ESPN id
    const { data: existing } = await supabase
      .from("events")
      .select("id, event_date, home_score, away_score, home_team_id, away_team_id, external_ids")
      .eq("league_id", leagueId)
      .gte("event_date", fromDate)
      .lte("event_date", toDate);
    const existingByEspn = new Map<
      string,
      { id: string; event_date: string; home_score: number | null; away_score: number | null; home_team_id: string | null; away_team_id: string | null }
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
      const compType = comp.type?.abbreviation || "";
      // 4 Nations round robin and the like stay excluded outright.
      if (compType === "QRR") {
        stats.skipped++;
        continue;
      }
      // Season typing: 1 = preseason (kept, labeled), 2 = regular,
      // 3 = postseason, 4 = offseason (skipped).
      const seasonType = ev.season?.type;
      if (seasonType === 4) {
        stats.skipped++;
        continue;
      }
      const isPreseason = seasonType === 1;
      // The All-Star game is kept, ingested as a team-less 'field' event (below).
      // ESPN also (mis)labels some preseason games compType ALLSTAR, so exclude
      // those and the weekend side-events; only the real game is left.
      const isAllStar =
        compType === "ALLSTAR" &&
        !isPreseason &&
        !ALLSTAR_SIDE_EVENT_RE.test(ev.name || "");
      if (compType === "ALLSTAR" && !isAllStar) {
        stats.skipped++;
        continue;
      }
      const home = comp.competitors?.find((c) => c.homeAway === "home");
      const away = comp.competitors?.find((c) => c.homeAway === "away");

      const completed =
        comp.status?.type?.completed === true ||
        ev.status?.type?.completed === true;
      // Guard parseInt: a non-numeric ESPN score must become null, not NaN
      // (NaN would flow into is_draw/outcome and a NaN write to an int column).
      const toScore = (s: string | null | undefined): number | null => {
        if (s == null) return null;
        const n = parseInt(s, 10);
        return Number.isFinite(n) ? n : null;
      };
      const homeScore = completed ? toScore(home?.score) : null;
      const awayScore = completed ? toScore(away?.score) : null;
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
        // A game logged while it was scheduled/in-progress saved with a null
        // outcome; now that the final score is in, fill the fan W/L for those
        // logs (otherwise the passport record silently undercounts).
        if (!dryRun && updates.home_score !== undefined && found.home_team_id && found.away_team_id) {
          const homeOutcome = homeScore! > awayScore! ? "win" : homeScore! < awayScore! ? "loss" : "draw";
          const awayOutcome = homeOutcome === "win" ? "loss" : homeOutcome === "loss" ? "win" : "draw";
          await supabase.from("event_logs").update({ outcome: homeOutcome })
            .eq("event_id", found.id).eq("rooting_team_id", found.home_team_id).eq("is_neutral", false).is("outcome", null);
          await supabase.from("event_logs").update({ outcome: awayOutcome })
            .eq("event_id", found.id).eq("rooting_team_id", found.away_team_id).eq("is_neutral", false).is("outcome", null);
        }
        continue;
      }

      // New event. All-Star games are team-less (their squads aren't real
      // teams); every other game needs our home/away team ids. (Unmatched teams
      // are exhibitions/foreign sides we don't carry — skip.)
      let homeId: string | undefined;
      let awayId: string | undefined;
      if (!isAllStar) {
        homeId = teamByEspn.get(String(home?.team?.id ?? ""));
        awayId = teamByEspn.get(String(away?.team?.id ?? ""));
        if (!homeId || !awayId) {
          stats.skipped++;
          continue;
        }
      }

      // Resolve venue: espn id, then name, then create
      let venueId: string | undefined;
      const espnVenueId = comp.venue?.id ? String(comp.venue.id) : null;
      // Trust the espn-id match only when the venue's sport matches this league's
      // (ids collide across sports); otherwise resolve by name / create.
      if (espnVenueId) {
        const cand = venueByEspn.get(espnVenueId);
        if (cand && cand.sport === LEAGUE_SPORTS[slug]) venueId = cand.id;
      }
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
        if (espnVenueId) venueByEspn.set(espnVenueId, { id: venueId!, sport: LEAGUE_SPORTS[slug] || null });
        venueByName.set(normName(comp.venue.fullName), venueId!);
        stats.venuesCreated++;
      }
      if (!venueId) {
        stats.skipped++; // no venue data — same policy as the seeder
        continue;
      }

      if (!dryRun) {
        // All-Star game: team-less, tagged 'field' event (winner from the score,
        // null until played). Otherwise the normal two-team match row.
        const row = isAllStar
          ? {
              league_id: leagueId,
              venue_id: venueId,
              event_date: eventDate,
              event_template: "field" as const,
              tournament_name:
                ALLSTAR_TITLES[slug] ?? `${slug.toUpperCase()} All-Star Game`,
              winner_name:
                completed && homeScore !== null && awayScore !== null && homeScore !== awayScore
                  ? (homeScore > awayScore ? home : away)?.team?.displayName ?? null
                  : null,
              season: ev.season?.year ?? new Date(eventDate).getFullYear(),
              is_postseason: false,
              is_preseason: false,
              event_tags: ["allstar"],
              external_ids: { espn: String(ev.id) },
            }
          : {
              league_id: leagueId,
              venue_id: venueId,
              event_date: eventDate,
              event_template: "match" as const,
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
            };
        const { error } = await supabase.from("events").insert(row);
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
        // Never delete an event anyone references — logged it, favorited it, or
        // it's a venue cover. (Mirrors the seeder's guard.)
        const referenced = new Set<string>();
        const [logsRes, favRes, profRes, coverRes] = await Promise.all([
          supabase.from("event_logs").select("event_id").in("event_id", ids),
          supabase.from("user_league_favorites").select("event_id").in("event_id", ids),
          supabase.from("profiles").select("fav_event_id").in("fav_event_id", ids),
          supabase.from("venues").select("current_cover_event_id").in("current_cover_event_id", ids),
        ]);
        for (const r of logsRes.data || []) if (r.event_id) referenced.add(r.event_id as string);
        for (const r of favRes.data || []) if (r.event_id) referenced.add(r.event_id as string);
        for (const r of profRes.data || []) if (r.fav_event_id) referenced.add(r.fav_event_id as string);
        for (const r of coverRes.data || []) if (r.current_cover_event_id) referenced.add(r.current_cover_event_id as string);
        const removable = ids.filter((id) => !referenced.has(id));
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

  // Heartbeat for the dead-man's switch (/api/ingest-health). Skipped on dry runs
  // (they don't write). A league's stats.skipped === -1 flags a failed ESPN
  // fetch; if every attempted league failed, the run "ran" but did no useful
  // work — record it as degraded so last_success_at goes stale and the health
  // check alerts, rather than silently looking healthy.
  if (!dryRun) {
    const attempted = Object.values(report);
    const fetchFailures = attempted.filter((s) => s.skipped === -1).length;
    const inserted = attempted.reduce((n, s) => n + Math.max(0, s.inserted), 0);
    const scoresUpdated = attempted.reduce((n, s) => n + Math.max(0, s.scoresUpdated), 0);
    const status =
      attempted.length > 0 && fetchFailures === attempted.length ? "degraded" : "ok";
    await recordHeartbeat(supabase, "sync-events", status, {
      leagues: attempted.length,
      fetchFailures,
      inserted,
      scoresUpdated,
      range: dateRange,
    });
  }

  return NextResponse.json({ success: true, dryRun, range: dateRange, report, upcoming });
}

export async function GET(request: Request) {
  return handleSync(request);
}

export async function POST(request: Request) {
  return handleSync(request);
}
