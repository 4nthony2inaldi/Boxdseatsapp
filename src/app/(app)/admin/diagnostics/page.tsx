import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient, type SupabaseClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { isAdmin, fetchAdminDataHealth, fetchUserDiagnostics, fetchUningestedBreakdown } from "@/lib/queries/admin";
import PageHeader from "@/components/PageHeader";
import UserPicker from "@/components/admin/UserPicker";

/** Lightweight roster for the typeahead (username + display name). */
async function fetchRoster(admin: SupabaseClient): Promise<{ username: string; displayName: string | null }[]> {
  const out: { username: string; displayName: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data } = await admin
      .from("profiles")
      .select("username, display_name")
      .not("username", "is", null)
      .order("username")
      .range(from, from + 999);
    if (!data || data.length === 0) break;
    for (const r of data) out.push({ username: r.username as string, displayName: (r.display_name as string | null) ?? null });
    if (data.length < 1000) break;
  }
  return out;
}

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-2xl font-semibold text-text-primary tabular-nums">{value}</div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
      {hint && <div className="text-[11px] text-text-muted/70 mt-1">{hint}</div>}
    </div>
  );
}

function pct(done: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((done / total) * 100)}%`;
}

export default async function AdminDiagnosticsPage({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!(await isAdmin(supabase, user.id))) notFound();

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Admin tools are not configured.</p>
      </div>
    );
  }
  const admin = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);

  const { u } = await searchParams;
  const username = u?.trim();
  const [health, userDiag, roster] = await Promise.all([
    fetchAdminDataHealth(admin),
    username ? fetchUserDiagnostics(admin, username) : Promise.resolve(null),
    fetchRoster(admin),
  ]);
  // Why are the remaining games stuck? (unsupported leagues / no ESPN id)
  const breakdown = health.ingestRemaining > 0 ? await fetchUningestedBreakdown(admin, health.remainingIds) : null;

  return (
    <div className="max-w-lg mx-auto pb-10">
      <PageHeader title="Admin · Diagnostics" backHref="/admin" />

      {/* Global data health */}
      <div className="px-4 pt-3">
        <div className="text-xs font-display tracking-[1.5px] uppercase text-text-muted mb-2">Box-score backfill</div>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="logged games" value={health.loggedGames} />
          <Stat label="ingested" value={health.ingestedGames} hint={pct(health.ingestedGames, health.loggedGames) + " done"} />
          <Stat label="remaining" value={health.ingestRemaining} hint={health.ingestRemaining === 0 ? "all done" : "see breakdown"} />
        </div>

        {breakdown && (
          <div className="mt-3 rounded-xl border border-white/10 overflow-hidden">
            <div className="px-4 py-2 text-[11px] text-text-muted bg-white/[0.02]">
              Why the {breakdown.total} remaining can&apos;t ingest{breakdown.noEspnId > 0 ? ` · ${breakdown.noEspnId} have no ESPN id` : ""}
            </div>
            {breakdown.groups.slice(0, 12).map((g, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 border-t border-white/5 text-sm">
                <span className="flex-1 text-text-primary truncate">
                  {g.league || "Unknown league"}
                  {g.sport && <span className="text-text-muted"> · {g.sport}</span>}
                </span>
                <span className="text-text-secondary tabular-nums">{g.count}</span>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs font-display tracking-[1.5px] uppercase text-text-muted mt-5 mb-2">Headshots</div>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="athletes missing a headshot" value={health.athletesNoHeadshot} hint={`of ${health.athletes} total`} />
          <Stat label="favorited athletes missing one" value={health.favoritedNoHeadshot} hint={`of ${health.favoritedAthletes} favorited`} />
        </div>

        <div className="text-xs font-display tracking-[1.5px] uppercase text-text-muted mt-5 mb-2">Photos</div>
        <div className="grid grid-cols-1 gap-2">
          <Stat label="logged games without a photo" value={health.photolessLogs} />
        </div>
      </div>

      {/* Per-user inspector */}
      <div className="px-4 pt-7">
        <div className="text-xs font-display tracking-[1.5px] uppercase text-text-muted mb-2">Inspect a user</div>
        <UserPicker users={roster} initial={username} />

        {username && !userDiag && (
          <p className="text-sm text-text-muted mt-4">No user found for &ldquo;{username}&rdquo;.</p>
        )}

        {userDiag && (
          <div className="mt-4">
            <div className="text-sm text-text-primary font-medium">
              {userDiag.displayName || userDiag.username} <span className="text-text-muted">@{userDiag.username}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <Stat label="total logs" value={userDiag.totalLogs} />
              <Stat label="games ingested" value={`${userDiag.ingestedGames}/${userDiag.loggedGames}`} hint={pct(userDiag.ingestedGames, userDiag.loggedGames) + " done"} />
              <Stat label="box scores left" value={userDiag.ingestRemaining} hint={userDiag.ingestRemaining === 0 ? "complete" : "still filling"} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Stat label="games with no side (win/loss)" value={userDiag.rootlessGames} />
              <Stat label="games with no photo" value={userDiag.photolessLogs} />
            </div>

            <div className="text-xs font-display tracking-[1.5px] uppercase text-text-muted mt-5 mb-2">Top athletes seen</div>
            {userDiag.topAthletes.length === 0 ? (
              <p className="text-sm text-text-muted">No box-score data yet — backfill may still be running.</p>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-hidden">
                {userDiag.topAthletes.map((a, i) => (
                  <div key={a.name + i} className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 last:border-0">
                    <span className="text-text-muted text-xs w-5 tabular-nums">{i + 1}</span>
                    <span className="flex-1 text-sm text-text-primary truncate">
                      {a.name}
                      {!a.hasHeadshot && <span className="text-text-muted/60 text-xs"> · no photo</span>}
                    </span>
                    <span className="text-sm text-text-secondary tabular-nums">{a.count}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-text-muted/70 mt-2">
              If a regular caps well below this user&apos;s game count, box scores aren&apos;t finished ingesting — check &ldquo;box scores left&rdquo; above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
