import { SupabaseClient } from "@supabase/supabase-js";
import { INGEST_JOBS } from "@/lib/ingest/jobs";

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
