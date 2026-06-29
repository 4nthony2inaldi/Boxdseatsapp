import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { redirect, notFound } from "next/navigation";
import { isAdmin, fetchActivityTimeseries, type ActivityDay } from "@/lib/queries/admin";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 60;

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="text-2xl font-semibold text-text-primary tabular-nums">{value}</div>
      <div className="text-xs text-text-muted mt-0.5">{label}</div>
      {hint && <div className="text-[11px] text-text-muted/70 mt-1">{hint}</div>}
    </div>
  );
}

/** "Mon Jun 29" — compact, UTC so it matches the UTC-5 bucket date string. */
function fmtDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Daily count with a proportional bar, so trends are scannable at a glance. */
function Cell({ n, max, accent }: { n: number; max: number; accent: string }) {
  const w = max > 0 ? Math.round((n / max) * 100) : 0;
  return (
    <td className="px-2 py-1.5 align-middle">
      <div className="flex items-center gap-2">
        <span className="w-7 text-right tabular-nums text-text-primary">{n}</span>
        <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden">
          <div className={`h-full rounded-full ${accent}`} style={{ width: `${w}%` }} />
        </div>
      </div>
    </td>
  );
}

export default async function AdminActivityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const { days, totalUsers, totalLogs } = await fetchActivityTimeseries(admin, WINDOW_DAYS);

  // Newest first for the table; yesterday is the last fully-complete day.
  const rows = [...days].reverse();
  const yesterday: ActivityDay | undefined = rows[1] ?? rows[0];
  const maxNewUsers = Math.max(1, ...days.map((d) => d.newUsers));
  const maxNewLogs = Math.max(1, ...days.map((d) => d.newLogs));

  return (
    <div className="max-w-lg mx-auto pb-8">
      <PageHeader title="Admin · Activity" backHref="/admin" />

      <div className="px-4 pt-3 grid grid-cols-2 gap-2">
        <Stat label="Total users" value={totalUsers} hint={`${yesterday?.newUsers ?? 0} new yesterday`} />
        <Stat label="Total logs" value={totalLogs} hint={`${yesterday?.newLogs ?? 0} new yesterday`} />
      </div>

      <div className="px-4 pt-4 pb-1 text-xs text-text-muted">
        New vs. cumulative, by day (UTC-5) · last {WINDOW_DAYS} days
      </div>

      <div className="px-4">
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-text-muted border-b border-white/10">
                <th className="px-2 py-2 font-medium">Day</th>
                <th className="px-2 py-2 font-medium" colSpan={2}>Users (new / total)</th>
                <th className="px-2 py-2 font-medium" colSpan={2}>Logs (new / total)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.date} className="border-b border-white/5 last:border-0">
                  <td className="px-2 py-1.5 whitespace-nowrap text-text-muted">{fmtDay(d.date)}</td>
                  <Cell n={d.newUsers} max={maxNewUsers} accent="bg-emerald-400/70" />
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-secondary">{d.totalUsers}</td>
                  <Cell n={d.newLogs} max={maxNewLogs} accent="bg-sky-400/70" />
                  <td className="px-2 py-1.5 text-right tabular-nums text-text-secondary">{d.totalLogs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
