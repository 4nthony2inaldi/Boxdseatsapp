import { SupabaseClient } from "@supabase/supabase-js";

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
export const BADGE_CATALOG: BadgeDef[] = [
  // ── event-based ──
  { key: "opening-day", label: "Opening Day", group: "event", match: tag("opening-day") },
  { key: "spring-training", label: "Spring Training", group: "event", match: (r) => r.slug === "mlb" && r.isPre },
  { key: "all-star", label: "All-Star Game", group: "event", match: tag("allstar") },
  { key: "wbc", label: "World Baseball Classic", group: "event", match: (r) => r.slug === "wbc" },
  { key: "mlb-playoffs", label: "MLB Playoffs", group: "event", match: (r) => r.slug === "mlb" && r.isPost },
  { key: "nba-playoffs", label: "NBA Playoffs", group: "event", match: (r) => r.slug === "nba" && r.isPost },
  { key: "nhl-playoffs", label: "NHL Playoffs", group: "event", match: (r) => r.slug === "nhl" && r.isPost },
  { key: "nfl-playoffs", label: "NFL Playoffs", group: "event", match: (r) => r.slug === "nfl" && r.isPost },
  { key: "march-madness", label: "March Madness", group: "event", match: (r) => (r.slug === "ncaam" || r.slug === "ncaaw") && r.isPost },
  { key: "bowl-game", label: "Bowl Game", group: "event", match: (r) => r.slug === "ncaaf" && r.isPost },
  { key: "world-series", label: "World Series", group: "event", match: (r) => r.slug === "mlb" && round(/world series/i)(r) },
  { key: "nba-finals", label: "NBA Finals", group: "event", match: (r) => r.slug === "nba" && round(/nba finals/i)(r) },
  { key: "stanley-cup", label: "Stanley Cup", group: "event", match: (r) => r.slug === "nhl" && round(/stanley cup/i)(r) },
  { key: "super-bowl", label: "Super Bowl", group: "event", match: (r) => r.slug === "nfl" && round(/super bowl/i)(r) },
  { key: "world-cup", label: "World Cup", group: "event", match: (r) => !!r.slug && r.slug.startsWith("fifa.world") },
  { key: "fav-team-road", label: "Favorite Team on the Road", short: "Team on Road", group: "event", match: (r, ctx) => !!r.awayTeamId && ctx.favTeamIds.has(r.awayTeamId) },
  {
    key: "multiple-countries",
    label: "Multiple Countries",
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

  // ── stat-based ──
  { key: "no-hitter", label: "No-Hitter", group: "stat", match: tag("no-hitter") },
  { key: "perfect-game", label: "Perfect Game", group: "stat", match: tag("perfect-game") },
  { key: "multi-hr", label: "3-HR Game", group: "stat", match: tag("multi-hr") },
  { key: "four-hr", label: "4-HR Game", group: "stat", match: tag("four-hr") },
  { key: "hat-trick-hockey", label: "Hockey Hat Trick", group: "stat", match: tag("hat-trick-hockey") },
  { key: "hat-trick-soccer", label: "Soccer Hat Trick", group: "stat", match: tag("hat-trick-soccer") },
  { key: "pts-40", label: "40-Point Game", group: "stat", match: tag("pts-40") },
  { key: "pts-50", label: "50-Point Game", group: "stat", match: tag("pts-50") },
  { key: "pts-60", label: "60-Point Game", group: "stat", match: tag("pts-60") },
  { key: "pass-5-td", label: "5 Passing TDs", group: "stat", match: tag("pass-5-td") },
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

export type EarnedBadge = { key: string; label: string; short: string; group: BadgeGroup; count: number };

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
    group: b.group,
    count: b.aggregate
      ? b.aggregate(rows, ctx)
      : rows.reduce((n, r) => n + (b.match?.(r, ctx) ? 1 : 0), 0),
  }));
}

export type AchievementGame = { eventId: string; date: string; title: string; venue: string | null; country: string | null };

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
  return matched.map((r) => ({ eventId: r.eventId, date: r.date, title: r.title, venue: r.venue, country: r.country }));
}
