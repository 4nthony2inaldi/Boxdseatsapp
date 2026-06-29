import { SupabaseClient } from "@supabase/supabase-js";
import { INGEST_JOBS } from "@/lib/ingest/jobs";
import { countRootlessLogs } from "@/lib/queries/rooting";
import { countPhotolessLogs } from "@/lib/queries/photoBackfill";

// ── Data diagnostics (admin) ──────────────────────────────────────────────

/** Distinct logged event ids (paginated). */
async function loggedEventIds(admin: SupabaseClient, userId?: string): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let from = 0; ; from += 1000) {
    let q = admin.from("event_logs").select("event_id").not("event_id", "is", null);
    if (userId) q = q.eq("user_id", userId);
    const { data } = await q.range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) if (r.event_id) ids.add(r.event_id as string);
    if (data.length < 1000) break;
  }
  return ids;
}

/** Of the given event ids, which already have box-score athletes (chunked). */
async function eventIdsWithAthletes(admin: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const done = new Set<string>();
  for (let i = 0; i < ids.length; i += 300) {
    const chunk = ids.slice(i, i + 300);
    for (let from = 0; ; from += 1000) {
      const { data } = await admin
        .from("event_athletes")
        .select("event_id")
        .in("event_id", chunk)
        .order("event_id", { ascending: true })
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      for (const r of data) if (r.event_id) done.add(r.event_id as string);
      if (data.length < 1000) break;
    }
  }
  return done;
}

export type AdminDataHealth = {
  loggedGames: number;
  ingestedGames: number;
  ingestRemaining: number;
  athletes: number;
  athletesNoHeadshot: number;
  favoritedAthletes: number;
  favoritedNoHeadshot: number;
  photolessLogs: number;
  /** The un-ingested logged event ids (for the "why stuck?" breakdown). */
  remainingIds: string[];
};

export type UningestedGroup = { sport: string | null; league: string | null; count: number };

/**
 * Why the remaining games can't ingest: group the un-ingested logged events by
 * sport+league (so unsupported leagues/comps surface), plus how many simply have
 * no ESPN id. Turns "stuck at N" into a list of fixable vs impossible.
 */
export async function fetchUningestedBreakdown(
  admin: SupabaseClient,
  remainingIds: string[]
): Promise<{ groups: UningestedGroup[]; noEspnId: number; total: number }> {
  const groups = new Map<string, UningestedGroup>();
  let noEspnId = 0;
  for (let i = 0; i < remainingIds.length; i += 300) {
    const { data } = await admin
      .from("events")
      .select("id, external_ids, leagues(slug, name, sport)")
      .in("id", remainingIds.slice(i, i + 300));
    for (const e of data || []) {
      const ext = e.external_ids as Record<string, unknown> | null;
      if (!ext?.espn) noEspnId++;
      const lg = e.leagues as unknown as { slug: string | null; name: string | null; sport: string | null } | null;
      const key = `${lg?.sport ?? "?"}|${lg?.slug ?? "?"}`;
      const g = groups.get(key) || { sport: lg?.sport ?? null, league: lg?.name || lg?.slug || null, count: 0 };
      g.count++;
      groups.set(key, g);
    }
  }
  return {
    groups: [...groups.values()].sort((a, b) => b.count - a.count),
    noEspnId,
    total: remainingIds.length,
  };
}

/** Global data-quality snapshot for the admin diagnostics page. */
export async function fetchAdminDataHealth(admin: SupabaseClient): Promise<AdminDataHealth> {
  const logged = await loggedEventIds(admin);
  const loggedArr = [...logged];
  const withAthletes = await eventIdsWithAthletes(admin, loggedArr);
  const remainingIds = loggedArr.filter((id) => !withAthletes.has(id));

  const [{ count: athletes }, { count: athletesNoHeadshot }, { data: favRows }, { count: photoless }] =
    await Promise.all([
      admin.from("athletes").select("id", { count: "exact", head: true }),
      admin.from("athletes").select("id", { count: "exact", head: true }).is("headshot_url", null),
      admin.from("user_league_favorites").select("athlete_id").not("athlete_id", "is", null),
      admin.from("event_logs").select("id", { count: "exact", head: true }).is("photo_url", null).not("event_id", "is", null),
    ]);

  const favIds = [...new Set((favRows || []).map((f) => f.athlete_id as string).filter(Boolean))];
  let favoritedNoHeadshot = 0;
  for (let i = 0; i < favIds.length; i += 300) {
    const { data } = await admin
      .from("athletes")
      .select("id")
      .in("id", favIds.slice(i, i + 300))
      .is("headshot_url", null);
    favoritedNoHeadshot += data?.length || 0;
  }

  return {
    loggedGames: logged.size,
    ingestedGames: withAthletes.size,
    ingestRemaining: Math.max(0, logged.size - withAthletes.size),
    athletes: athletes ?? 0,
    athletesNoHeadshot: athletesNoHeadshot ?? 0,
    favoritedAthletes: favIds.length,
    favoritedNoHeadshot,
    photolessLogs: photoless ?? 0,
    remainingIds,
  };
}

export type AdminUserDiagnostics = {
  username: string;
  displayName: string | null;
  totalLogs: number;
  loggedGames: number;
  ingestedGames: number;
  ingestRemaining: number;
  rootlessGames: number;
  photolessLogs: number;
  topAthletes: { name: string; count: number; hasHeadshot: boolean }[];
};

/** Per-user diagnostics — answers "is this user's data fully backfilled, and
 *  why is a player capped at N?" by showing ingested-vs-total and top players. */
export async function fetchUserDiagnostics(
  admin: SupabaseClient,
  username: string
): Promise<AdminUserDiagnostics | null> {
  const { data: profile } = await admin
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username.toLowerCase().trim())
    .maybeSingle();
  if (!profile) return null;
  const userId = profile.id as string;

  const { count: totalLogs } = await admin
    .from("event_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const logged = await loggedEventIds(admin, userId);
  const loggedArr = [...logged];
  const withAthletes = await eventIdsWithAthletes(admin, loggedArr);

  const [rootlessGames, photolessLogs] = await Promise.all([
    countRootlessLogs(admin, userId),
    countPhotolessLogs(admin, userId),
  ]);

  // Top athletes seen across this user's logged games.
  const counts = new Map<string, number>();
  for (let i = 0; i < loggedArr.length; i += 300) {
    const chunk = loggedArr.slice(i, i + 300);
    for (let from = 0; ; from += 1000) {
      const { data } = await admin
        .from("event_athletes")
        .select("athlete_id")
        .in("event_id", chunk)
        .order("athlete_id", { ascending: true })
        .range(from, from + 999);
      if (!data || data.length === 0) break;
      for (const r of data) {
        const a = r.athlete_id as string | null;
        if (a) counts.set(a, (counts.get(a) || 0) + 1);
      }
      if (data.length < 1000) break;
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const topIds = top.map(([id]) => id);
  const nameById = new Map<string, { name: string; hasHeadshot: boolean }>();
  for (let i = 0; i < topIds.length; i += 100) {
    const { data } = await admin
      .from("athletes")
      .select("id, name, headshot_url")
      .in("id", topIds.slice(i, i + 100));
    for (const a of data || []) {
      nameById.set(a.id as string, { name: (a.name as string) || "Unknown", hasHeadshot: !!a.headshot_url });
    }
  }

  return {
    username: profile.username as string,
    displayName: (profile.display_name as string | null) ?? null,
    totalLogs: totalLogs ?? 0,
    loggedGames: logged.size,
    ingestedGames: withAthletes.size,
    ingestRemaining: Math.max(0, logged.size - withAthletes.size),
    rootlessGames,
    photolessLogs,
    topAthletes: top.map(([id, count]) => ({
      name: nameById.get(id)?.name ?? "Unknown",
      count,
      hasHeadshot: nameById.get(id)?.hasHeadshot ?? false,
    })),
  };
}

/**
 * Whether a user is an admin. Checks the admin_users table, which has no
 * client-writable RLS policy (service-role grants only), so this can't be
 * spoofed by a user editing their own profile.
 */
export async function isAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export type AdminUserRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  is_admin: boolean;
  is_private: boolean;
  logs: number;
  created_at: string;
};

/**
 * Full user roster for the admin panel. Requires a SERVICE-ROLE client (to
 * read auth emails); the caller must already be verified as an admin.
 */
export async function fetchAllUsersForAdmin(
  admin: SupabaseClient
): Promise<AdminUserRow[]> {
  // Auth users (emails + canonical created_at), paginated defensively.
  const authById = new Map<string, { email: string | null; created_at: string }>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    for (const u of data.users) authById.set(u.id, { email: u.email ?? null, created_at: u.created_at });
    if (data.users.length < 200) break;
  }

  const [{ data: profiles }, { data: admins }, { data: logs }] = await Promise.all([
    admin.from("profiles").select("id, username, display_name, is_private"),
    admin.from("admin_users").select("user_id"),
    admin.from("event_logs").select("user_id"),
  ]);

  const adminSet = new Set((admins || []).map((a) => a.user_id as string));
  const logCount = new Map<string, number>();
  for (const l of logs || []) logCount.set(l.user_id, (logCount.get(l.user_id) || 0) + 1);

  return (profiles || [])
    .map((p) => {
      const auth = authById.get(p.id);
      return {
        id: p.id,
        email: auth?.email ?? null,
        username: p.username,
        display_name: p.display_name,
        is_admin: adminSet.has(p.id),
        is_private: p.is_private,
        logs: logCount.get(p.id) || 0,
        created_at: auth?.created_at ?? "",
      };
    })
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

export type IngestJobRow = {
  job: string;
  label: string;
  state: "unseen" | "healthy" | "stale";
  lastRunAt: string | null;
  lastSuccessAt: string | null;
  lastStatus: string | null;
  ageMinutes: number | null;
  maxAgeMinutes: number;
  detail: Record<string, unknown> | null;
};

export type LeagueFreshnessRow = {
  slug: string;
  name: string;
  sport: string | null;
  totalEvents: number;
  upcomingEvents: number;
  lastEventDate: string | null;
  lastIngestedAt: string | null;
  /** Offseason-aware: a league with games still on the calendar is in season. */
  inSeason: boolean;
};

/**
 * Ingest status for the admin panel: the per-job heartbeats (the real health
 * verdict, same thresholds as the /api/ingest-health dead-man's switch) plus
 * per-league freshness (eyeball which sports are flowing). Requires a
 * SERVICE-ROLE client; the caller must already be verified as an admin.
 */
export async function fetchIngestStatus(admin: SupabaseClient): Promise<{
  jobs: IngestJobRow[];
  leagues: LeagueFreshnessRow[];
}> {
  const [hb, fresh] = await Promise.all([
    admin
      .from("ingest_heartbeats")
      .select("job, last_run_at, last_success_at, last_status, detail"),
    admin.rpc("ingest_league_freshness"),
  ]);

  const byJob = new Map<string, Record<string, unknown>>();
  for (const r of (hb.data || []) as Record<string, unknown>[]) {
    byJob.set(r.job as string, r);
  }

  const now = Date.now();
  const jobs: IngestJobRow[] = Object.entries(INGEST_JOBS).map(([job, spec]) => {
    const row = byJob.get(job);
    if (!row) {
      return {
        job,
        label: spec.label,
        state: "unseen",
        lastRunAt: null,
        lastSuccessAt: null,
        lastStatus: null,
        ageMinutes: null,
        maxAgeMinutes: spec.maxAgeMinutes,
        detail: null,
      };
    }
    const successAt = row.last_success_at ? Date.parse(row.last_success_at as string) : null;
    const ageMinutes = successAt != null ? Math.round((now - successAt) / 60000) : null;
    const stale = ageMinutes == null || ageMinutes > spec.maxAgeMinutes;
    return {
      job,
      label: spec.label,
      state: stale ? "stale" : "healthy",
      lastRunAt: (row.last_run_at as string) ?? null,
      lastSuccessAt: (row.last_success_at as string) ?? null,
      lastStatus: (row.last_status as string) ?? null,
      ageMinutes,
      maxAgeMinutes: spec.maxAgeMinutes,
      detail: (row.detail as Record<string, unknown>) ?? null,
    };
  });

  const leagues: LeagueFreshnessRow[] = (
    (fresh.data || []) as Record<string, unknown>[]
  )
    .map((r) => ({
      slug: r.slug as string,
      name: r.name as string,
      sport: (r.sport as string) ?? null,
      totalEvents: Number(r.total_events) || 0,
      upcomingEvents: Number(r.upcoming_events) || 0,
      lastEventDate: (r.last_event_date as string) ?? null,
      lastIngestedAt: (r.last_ingested_at as string) ?? null,
      inSeason: (Number(r.upcoming_events) || 0) > 0,
    }))
    .sort(
      (a, b) =>
        (a.sport || "").localeCompare(b.sport || "") || a.name.localeCompare(b.name)
    );

  return { jobs, leagues };
}

// ── User activity (admin) ─────────────────────────────────────────────────

export type ActivityDay = {
  /** Calendar day (UTC-5), YYYY-MM-DD. */
  date: string;
  newUsers: number;
  /** Cumulative total users through the end of this day. */
  totalUsers: number;
  newLogs: number;
  /** Cumulative total logs through the end of this day. */
  totalLogs: number;
};

export type ActivityTimeseries = {
  days: ActivityDay[]; // ascending by date
  totalUsers: number;
  totalLogs: number;
  windowDays: number;
};

/** ESPN-style fixed UTC-5 day bucket — matches the offset the rest of the app
 *  uses for event dates, so "yesterday" lines up with the owner's day. */
function localDayUTC5(iso: string): string {
  return new Date(new Date(iso).getTime() - 5 * 3600 * 1000)
    .toISOString()
    .slice(0, 10);
}

/** All created_at values in `table` at or after `since` (paginated past the
 *  1000-row cap). Only the timestamp column is fetched. */
async function createdAtSince(
  admin: SupabaseClient,
  table: "profiles" | "event_logs",
  since: string,
): Promise<string[]> {
  const out: string[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from(table)
      .select("created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) if (r.created_at) out.push(r.created_at as string);
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * Daily new-users and new-logs with running cumulative totals, for the last
 * `windowDays` days. Cumulative is anchored to the live total counts: the
 * baseline (everything before the window) is total minus what landed in the
 * window, so the last day's cumulative equals the true total.
 */
export async function fetchActivityTimeseries(
  admin: SupabaseClient,
  windowDays = 60,
): Promise<ActivityTimeseries> {
  const msDay = 86_400_000;
  const now = Date.now();
  // Fetch a day extra (windowDays, not windowDays-1) so rows near the boundary
  // that shift into an earlier local day still land in the baseline, not lost.
  const sinceIso = new Date(now - windowDays * msDay).toISOString();

  const [{ count: totalUsers }, { count: totalLogs }, userTs, logTs] =
    await Promise.all([
      admin.from("profiles").select("created_at", { count: "exact", head: true }),
      admin.from("event_logs").select("id", { count: "exact", head: true }),
      createdAtSince(admin, "profiles", sinceIso),
      createdAtSince(admin, "event_logs", sinceIso),
    ]);

  const newUsersByDay = new Map<string, number>();
  for (const ts of userTs) {
    const d = localDayUTC5(ts);
    newUsersByDay.set(d, (newUsersByDay.get(d) ?? 0) + 1);
  }
  const newLogsByDay = new Map<string, number>();
  for (const ts of logTs) {
    const d = localDayUTC5(ts);
    newLogsByDay.set(d, (newLogsByDay.get(d) ?? 0) + 1);
  }

  // The exact calendar days we render (oldest → newest), in UTC-5.
  const dayKeys: string[] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    dayKeys.push(localDayUTC5(new Date(now - i * msDay).toISOString()));
  }

  const windowUsers = dayKeys.reduce((s, d) => s + (newUsersByDay.get(d) ?? 0), 0);
  const windowLogs = dayKeys.reduce((s, d) => s + (newLogsByDay.get(d) ?? 0), 0);
  let cumUsers = Math.max(0, (totalUsers ?? 0) - windowUsers);
  let cumLogs = Math.max(0, (totalLogs ?? 0) - windowLogs);

  const days: ActivityDay[] = dayKeys.map((date) => {
    const nu = newUsersByDay.get(date) ?? 0;
    const nl = newLogsByDay.get(date) ?? 0;
    cumUsers += nu;
    cumLogs += nl;
    return { date, newUsers: nu, totalUsers: cumUsers, newLogs: nl, totalLogs: cumLogs };
  });

  return { days, totalUsers: totalUsers ?? 0, totalLogs: totalLogs ?? 0, windowDays };
}
