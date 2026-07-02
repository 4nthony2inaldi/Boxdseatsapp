import { SupabaseClient } from "@supabase/supabase-js";
import { parseStatLine, formatStatLine, type StatLine } from "@/lib/statLine";

/**
 * Event- and stat-based "achievement" badges, derived from the games a user has
 * logged. Distinct from the list-completion badges in badges.ts: here each badge
 * is a single recurring feat (Opening Day, No-hitter, …) shown with an "xN"
 * count and a click-through to the games behind it.
 *
 * Most badges read an event_tag we already stamp at ingest (allstar,
 * opening-day, no-hitter, perfect-game, multi-hr, four-hr, hat-trick,
 * pts-40/50/60); a few are derived (per-sport playoffs, championship rounds,
 * spring training, WBC, and a favorite team being the away (road) side).
 * Soccer playoffs are intentionally absent until the soccer is_postseason data
 * is cleaned.
 */

export type BadgeGroup = "event" | "stat";

/** The fields a badge predicate sees, normalized from a logged event. */
type Row = {
  eventId: string;
  date: string;
  tags: string[];
  slug: string | null;
  isPost: boolean;
  isPre: boolean;
  round: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  // display
  title: string;
  venue: string | null;
  country: string | null;
};

/** Per-user context a predicate may need beyond a single event. */
type MatchCtx = { favTeamIds: Set<string> };

export type BadgeDef = {
  key: string;
  label: string;
  /** Compact label shown inside the badge tile; defaults to label. */
  short?: string;
  /** Sport slug for the tile icon (SportIcon); omitted badges fall back to the
   *  BoxdSeats mark. The icon disambiguates, so e.g. both hat tricks read "Hat
   *  Trick". */
  icon?: string;
  group: BadgeGroup;
  // Per-game badge: count = number of logged games that match.
  match?: (r: Row, ctx: MatchCtx) => boolean;
  // Whole-collection badge (e.g. distinct countries): count = aggregate over all
  // the user's logged games. detailRows supplies the games behind it.
  aggregate?: (rows: Row[], ctx: MatchCtx) => number;
  detailRows?: (rows: Row[], ctx: MatchCtx) => Row[];
};

const tag = (t: string) => (r: Row) => r.tags.includes(t);
const round = (re: RegExp) => (r: Row) => !!r.round && re.test(r.round);

// The full catalog — rendered in this order, earned or not (locked shows greyed).
// `short` is the tile label (kept tight since the sport icon carries context);
// `label` is the full name used on the badge-detail page.
export const BADGE_CATALOG: BadgeDef[] = [
  // ── event-based ──
  { key: "opening-day", label: "Opening Day", icon: "baseball", group: "event", match: tag("opening-day") },
  { key: "spring-training", label: "Spring Training", icon: "baseball", group: "event", match: (r) => r.slug === "mlb" && r.isPre },
  { key: "all-star", label: "All-Star Game", short: "All-Star", icon: "star", group: "event", match: tag("allstar") },
  { key: "wbc", label: "World Baseball Classic", short: "WBC", icon: "baseball", group: "event", match: (r) => r.slug === "wbc" },
  { key: "mlb-playoffs", label: "MLB Playoffs", icon: "baseball", group: "event", match: (r) => r.slug === "mlb" && r.isPost },
  { key: "nba-playoffs", label: "NBA Playoffs", icon: "basketball", group: "event", match: (r) => r.slug === "nba" && r.isPost },
  { key: "nhl-playoffs", label: "NHL Playoffs", icon: "hockey", group: "event", match: (r) => r.slug === "nhl" && r.isPost },
  { key: "nfl-playoffs", label: "NFL Playoffs", icon: "football", group: "event", match: (r) => r.slug === "nfl" && r.isPost },
  { key: "march-madness", label: "March Madness", short: "Madness", icon: "basketball", group: "event", match: (r) => (r.slug === "ncaam" || r.slug === "ncaaw") && r.isPost },
  { key: "bowl-game", label: "Bowl Game", icon: "football", group: "event", match: (r) => r.slug === "ncaaf" && r.isPost },
  { key: "world-series", label: "World Series", icon: "baseball", group: "event", match: (r) => r.slug === "mlb" && round(/world series/i)(r) },
  { key: "nba-finals", label: "NBA Finals", icon: "basketball", group: "event", match: (r) => r.slug === "nba" && round(/nba finals/i)(r) },
  { key: "stanley-cup", label: "Stanley Cup", icon: "hockey", group: "event", match: (r) => r.slug === "nhl" && round(/stanley cup/i)(r) },
  { key: "super-bowl", label: "Super Bowl", icon: "football", group: "event", match: (r) => r.slug === "nfl" && round(/super bowl/i)(r) },
  { key: "world-cup", label: "World Cup", icon: "soccer", group: "event", match: (r) => !!r.slug && r.slug.startsWith("fifa.world") },
  { key: "fav-team-road", label: "Favorite Team on the Road", short: "Road Game", icon: "motorsports", group: "event", match: (r, ctx) => !!r.awayTeamId && ctx.favTeamIds.has(r.awayTeamId) },
  {
    key: "multiple-countries",
    label: "Multiple Countries",
    short: "2+ Countries",
    icon: "globe",
    group: "event",
    // Earned at 2+ distinct venue countries; the count IS the number of countries.
    aggregate: (rows) => {
      const c = new Set(rows.map((r) => r.country).filter(Boolean) as string[]);
      return c.size >= 2 ? c.size : 0;
    },
    detailRows: (rows) =>
      rows
        .filter((r) => r.country)
        .sort((a, b) => (a.country ?? "").localeCompare(b.country ?? "") || (a.date < b.date ? 1 : -1)),
  },

  // ── stat-based (the sport icon disambiguates, so labels stay short) ──
  { key: "no-hitter", label: "No-Hitter", icon: "baseball", group: "stat", match: tag("no-hitter") },
  { key: "perfect-game", label: "Perfect Game", short: "Perfect", icon: "baseball", group: "stat", match: tag("perfect-game") },
  { key: "multi-hr", label: "3-HR Game", short: "3 HR", icon: "baseball", group: "stat", match: tag("multi-hr") },
  { key: "four-hr", label: "4-HR Game", short: "4 HR", icon: "baseball", group: "stat", match: tag("four-hr") },
  { key: "walkoff", label: "Walk-Off Win", short: "Walk-Off", icon: "baseball", group: "stat", match: tag("walkoff") },
  { key: "hat-trick-hockey", label: "Hockey Hat Trick", short: "Hat Trick", icon: "hockey", group: "stat", match: tag("hat-trick-hockey") },
  { key: "hat-trick-soccer", label: "Soccer Hat Trick", short: "Hat Trick", icon: "soccer", group: "stat", match: tag("hat-trick-soccer") },
  { key: "pts-40", label: "40-Point Game", short: "40 PTS", icon: "basketball", group: "stat", match: tag("pts-40") },
  { key: "pts-50", label: "50-Point Game", short: "50 PTS", icon: "basketball", group: "stat", match: tag("pts-50") },
  { key: "pts-60", label: "60-Point Game", short: "60 PTS", icon: "basketball", group: "stat", match: tag("pts-60") },
  { key: "pass-5-td", label: "5 Passing TDs", short: "5 Pass TDs", icon: "football", group: "stat", match: tag("pass-5-td") },
];

export function badgeByKey(key: string): BadgeDef | undefined {
  return BADGE_CATALOG.find((b) => b.key === key);
}

type EventRel = {
  id: string;
  event_tags: string[] | null;
  is_postseason: boolean | null;
  is_preseason: boolean | null;
  round_or_stage: string | null;
  tournament_name: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  venues: { name: string | null; country: string | null } | null;
  leagues: { slug: string | null } | null;
  home_team: { short_name: string | null; name: string | null } | null;
  away_team: { short_name: string | null; name: string | null } | null;
} | null;

const SELECT = `event_date,
  events!event_logs_event_id_fkey(
    id, event_tags, is_postseason, is_preseason, round_or_stage, tournament_name,
    home_team_id, away_team_id,
    venues!events_venue_id_fkey(name, country),
    leagues(slug),
    home_team:teams!events_home_team_id_fkey(short_name, name),
    away_team:teams!events_away_team_id_fkey(short_name, name)
  )`;

function titleOf(e: NonNullable<EventRel>): string {
  const away = e.away_team?.short_name || e.away_team?.name;
  const home = e.home_team?.short_name || e.home_team?.name;
  if (away && home) return `${away} @ ${home}`;
  return e.tournament_name || "Event";
}

/** All of a user's logged events, normalized for badge matching + display.
 *  Paginated (a heavy attendee can have hundreds), newest first.
 *
 *  `isOwner` gates the defense-in-depth privacy filter: for anyone but the
 *  owner we drop `hide_all` logs so fully-private games never reach another
 *  fan's badge tallies or badge-detail list, matching fetchTimeline. RLS is the
 *  primary guard; this is the second (mirrors the rest of the profile stack).
 *  The order carries a unique `id` tiebreaker so range-based paging stays
 *  deterministic when many games share an `event_date` (a >1000-log user could
 *  otherwise get rows duplicated or dropped across page boundaries). */
async function fetchLoggedRows(
  supabase: SupabaseClient,
  userId: string,
  isOwner = false
): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; ; from += 1000) {
    let query = supabase
      .from("event_logs")
      .select(SELECT)
      .eq("user_id", userId)
      .not("event_id", "is", null);
    if (!isOwner) query = query.neq("privacy", "hide_all");
    const { data, error } = await query
      .order("event_date", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + 999);
    // Surface a failed page instead of silently returning partial (or zero)
    // rows, which would render every badge as locked with no signal.
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const log of data) {
      const e = log.events as unknown as EventRel;
      if (!e) continue;
      out.push({
        eventId: e.id,
        date: log.event_date as string,
        tags: e.event_tags ?? [],
        slug: e.leagues?.slug ?? null,
        isPost: e.is_postseason === true,
        isPre: e.is_preseason === true,
        round: e.round_or_stage,
        homeTeamId: e.home_team_id,
        awayTeamId: e.away_team_id,
        title: titleOf(e),
        venue: e.venues?.name ?? null,
        country: e.venues?.country ?? null,
      });
    }
    if (data.length < 1000) break;
  }
  return out;
}

/** The match context for one user: their favorite teams (ranked `team`
 *  favorites + legacy profiles.fav_team_id), used by "Favorite Team on the Road". */
async function fetchFavoriteContext(supabase: SupabaseClient, userId: string): Promise<MatchCtx> {
  const favTeamIds = new Set<string>();
  const [favsRes, profileRes] = await Promise.all([
    supabase
      .from("user_league_favorites")
      .select("team_id")
      .eq("user_id", userId)
      .eq("category", "team")
      .not("team_id", "is", null),
    supabase.from("profiles").select("fav_team_id").eq("id", userId).maybeSingle(),
  ]);
  for (const f of favsRes.data || []) if (f.team_id) favTeamIds.add(f.team_id as string);
  if (profileRes.data?.fav_team_id) favTeamIds.add(profileRes.data.fav_team_id as string);
  return { favTeamIds };
}

export type EarnedBadge = { key: string; label: string; short: string; icon?: string; group: BadgeGroup; count: number };

/** Count, per catalog badge, how many of the user's logged games earn it.
 *  Returns every badge (count 0 = locked) so the UI can grey unearned ones. */
export async function fetchUserAchievements(
  supabase: SupabaseClient,
  userId: string,
  isOwner = false
): Promise<EarnedBadge[]> {
  const [rows, ctx] = await Promise.all([
    fetchLoggedRows(supabase, userId, isOwner),
    fetchFavoriteContext(supabase, userId),
  ]);
  return BADGE_CATALOG.map((b) => ({
    key: b.key,
    label: b.label,
    short: b.short ?? b.label,
    icon: b.icon,
    group: b.group,
    count: b.aggregate
      ? b.aggregate(rows, ctx)
      : rows.reduce((n, r) => n + (b.match?.(r, ctx) ? 1 : 0), 0),
  }));
}

/** Who earned a stat badge in a game, and their line ("42 PTS · 11 REB"). */
export type Achiever = { name: string; line: string | null };
export type AchievementGame = {
  eventId: string;
  date: string;
  title: string;
  venue: string | null;
  country: string | null;
  /** For single-player stat badges: the player(s) who hit the feat here. */
  achievers?: Achiever[];
};

const n = (v: string | undefined): number => {
  const x = parseFloat(v ?? "");
  return Number.isFinite(x) ? x : 0;
};

/** A baseball pitcher's line ("9 IP, 0 H, 0 R, 0 ER, 1 BB, 12 K") from the
 *  pitching category. Used for no-hitter/perfect-game credit — formatStatLine
 *  prefers the batting line, which for an NL pitcher shows their at-bats. */
function pitchingLine(sl: StatLine | null): string | null {
  const p = sl?.pitching;
  if (!p) return null;
  const parts = ["IP", "H", "R", "ER", "BB", "K"]
    .filter((k) => p[k] != null && p[k] !== "")
    .map((k) => `${p[k]} ${k}`);
  return parts.length ? parts.join(", ") : null;
}

/**
 * Per single-player stat badge: the sport and the per-athlete predicate that
 * earned it, mirroring exactly the thresholds in scripts/data/tag-game-feats.sql
 * so "who did it" matches how the game got tagged. No-hitter / perfect game are
 * team feats and handled separately (see fetchNoHitterAchievers) — one pitcher
 * on the throwing side is credited by name, more than one reads "Combined".
 */
const STAT_ACHIEVERS: Record<string, { sport: string; earned: (sl: StatLine) => boolean }> = {
  "multi-hr": { sport: "baseball", earned: (sl) => n(sl.batting?.HR) >= 3 },
  "four-hr": { sport: "baseball", earned: (sl) => n(sl.batting?.HR) >= 4 },
  "hat-trick-hockey": {
    sport: "hockey",
    earned: (sl) => Math.max(n(sl.forwards?.G), n(sl.defenses?.G), n(sl.skaters?.G)) >= 3,
  },
  "hat-trick-soccer": { sport: "soccer", earned: (sl) => n(sl.stats?.G) >= 3 },
  "pts-40": { sport: "basketball", earned: (sl) => n(sl.stats?.PTS) >= 40 },
  "pts-50": { sport: "basketball", earned: (sl) => n(sl.stats?.PTS) >= 50 },
  "pts-60": { sport: "basketball", earned: (sl) => n(sl.stats?.PTS) >= 60 },
  "pass-5-td": { sport: "football", earned: (sl) => n(sl.passing?.TD) >= 5 },
};

/** For a stat badge, the player(s) who hit the feat in each matched event, keyed
 *  by event id. event_athletes is public reference data; the events themselves
 *  are already RLS-scoped by the caller's logs. */
async function fetchAchieversByEvent(
  supabase: SupabaseClient,
  eventIds: string[],
  spec: { sport: string; earned: (sl: StatLine) => boolean }
): Promise<Map<string, Achiever[]>> {
  const byEvent = new Map<string, Achiever[]>();
  for (let i = 0; i < eventIds.length; i += 100) {
    const chunk = eventIds.slice(i, i + 100);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("event_athletes")
        .select("event_id, stat_line, athletes(name)")
        .in("event_id", chunk)
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const row of data) {
        const sl = parseStatLine(row.stat_line as string | null);
        if (!sl || !spec.earned(sl)) continue;
        const name = (row.athletes as unknown as { name: string | null } | null)?.name;
        if (!name) continue;
        const eid = row.event_id as string;
        const list = byEvent.get(eid) ?? [];
        list.push({ name, line: formatStatLine(spec.sport, sl) });
        byEvent.set(eid, list);
      }
      if (data.length < 1000) break;
    }
  }
  return byEvent;
}

/**
 * No-hitter / perfect game attribution. These are team feats, so per event we
 * find the side held hitless (0 hits with a real 9+ lineup) and credit the
 * OTHER side's pitcher(s): exactly one -> that pitcher by name with their line;
 * more than one -> a "Combined" entry listing the pitchers. Falls back to no
 * achiever (game only) if the sides can't be resolved from the stored lines.
 */
async function fetchNoHitterAchievers(
  supabase: SupabaseClient,
  eventIds: string[]
): Promise<Map<string, Achiever[]>> {
  type AthRow = { team: string | null; sl: StatLine | null; name: string | null };
  const rowsByEvent = new Map<string, AthRow[]>();
  for (let i = 0; i < eventIds.length; i += 100) {
    const chunk = eventIds.slice(i, i + 100);
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from("event_athletes")
        .select("event_id, team_id, stat_line, athletes(name)")
        .in("event_id", chunk)
        .order("id", { ascending: true })
        .range(from, from + 999);
      if (error) throw error;
      if (!data || data.length === 0) break;
      for (const r of data) {
        const eid = r.event_id as string;
        const list = rowsByEvent.get(eid) ?? [];
        list.push({
          team: (r.team_id as string | null) ?? null,
          sl: parseStatLine(r.stat_line as string | null),
          name: (r.athletes as unknown as { name: string | null } | null)?.name ?? null,
        });
        rowsByEvent.set(eid, list);
      }
      if (data.length < 1000) break;
    }
  }

  const byEvent = new Map<string, Achiever[]>();
  for (const [eid, rows] of rowsByEvent) {
    // Batting hits + batter count per team → the no-hit side (0 hits, 9+ batters).
    const hits = new Map<string, number>();
    const batters = new Map<string, number>();
    for (const r of rows) {
      if (!r.team || !r.sl?.batting) continue;
      hits.set(r.team, (hits.get(r.team) ?? 0) + n(r.sl.batting.H));
      batters.set(r.team, (batters.get(r.team) ?? 0) + 1);
    }
    let noHitTeam: string | null = null;
    for (const [team, count] of batters) {
      if (count >= 9 && (hits.get(team) ?? 0) === 0) {
        noHitTeam = team;
        break;
      }
    }
    if (!noHitTeam) continue;
    // The throwing side = pitchers on any team that isn't the no-hit side.
    const pitchers = rows.filter((r) => r.team && r.team !== noHitTeam && r.sl?.pitching);
    if (pitchers.length === 0) continue;
    if (pitchers.length === 1) {
      byEvent.set(eid, [{ name: pitchers[0].name ?? "Pitcher", line: pitchingLine(pitchers[0].sl) }]);
    } else {
      const names = pitchers.map((p) => p.name).filter(Boolean) as string[];
      byEvent.set(eid, [{ name: "Combined", line: names.join(", ") || null }]);
    }
  }
  return byEvent;
}

/** The games behind one badge, for the badge detail page. */
export async function fetchAchievementGames(
  supabase: SupabaseClient,
  userId: string,
  key: string,
  isOwner = false
): Promise<AchievementGame[]> {
  const def = badgeByKey(key);
  if (!def) return [];
  const [rows, ctx] = await Promise.all([
    fetchLoggedRows(supabase, userId, isOwner),
    fetchFavoriteContext(supabase, userId),
  ]);
  const matched = def.detailRows ? def.detailRows(rows, ctx) : rows.filter((r) => def.match?.(r, ctx));

  // Name who earned a stat badge: single-player feats by per-athlete predicate,
  // no-hitter / perfect game by the throwing side's pitcher(s).
  const eventIds = matched.map((r) => r.eventId);
  const spec = STAT_ACHIEVERS[key];
  let achieversByEvent: Map<string, Achiever[]> | null = null;
  if (spec) achieversByEvent = await fetchAchieversByEvent(supabase, eventIds, spec);
  else if (key === "no-hitter" || key === "perfect-game")
    achieversByEvent = await fetchNoHitterAchievers(supabase, eventIds);

  return matched.map((r) => ({
    eventId: r.eventId,
    date: r.date,
    title: r.title,
    venue: r.venue,
    country: r.country,
    ...(achieversByEvent ? { achievers: achieversByEvent.get(r.eventId) ?? [] } : {}),
  }));
}
