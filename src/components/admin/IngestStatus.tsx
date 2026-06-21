import { formatRelative } from "@/lib/formatters";
import type { IngestJobRow, LeagueFreshnessRow } from "@/lib/queries/admin";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function JobCard({ job }: { job: IngestJobRow }) {
  const tone =
    job.state === "healthy"
      ? "text-win"
      : job.state === "stale"
        ? "text-loss"
        : "text-text-muted";
  const label =
    job.state === "healthy"
      ? "Healthy"
      : job.state === "stale"
        ? "Stale"
        : "No data yet";

  const detail = job.detail || {};
  const detailBits: string[] = [];
  if (typeof detail.inserted === "number") detailBits.push(`${detail.inserted} added`);
  if (typeof detail.scoresUpdated === "number") detailBits.push(`${detail.scoresUpdated} scores`);
  if (typeof detail.fetchFailures === "number" && detail.fetchFailures > 0) {
    detailBits.push(`${detail.fetchFailures} fetch fails`);
  }

  return (
    <div className="rounded-xl border border-white/10 px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-text-primary font-medium">{job.job}</span>
        <span className={`text-xs font-semibold ${tone}`}>{label}</span>
      </div>
      <p className="text-xs text-text-muted mt-0.5">{job.label}</p>
      <div className="text-xs text-text-secondary mt-2 space-y-0.5">
        <div>
          Last success:{" "}
          {job.lastSuccessAt ? formatRelative(job.lastSuccessAt) : "never"}
          {job.state === "stale" && (
            <span className="text-text-muted"> · allowed {job.maxAgeMinutes}m</span>
          )}
        </div>
        {job.lastRunAt && job.lastRunAt !== job.lastSuccessAt && (
          <div>
            Last run: {formatRelative(job.lastRunAt)}
            {job.lastStatus && job.lastStatus !== "ok" && (
              <span className="text-loss"> ({job.lastStatus})</span>
            )}
          </div>
        )}
        {detailBits.length > 0 && (
          <div className="text-text-muted">{detailBits.join(" · ")}</div>
        )}
      </div>
    </div>
  );
}

export default function IngestStatus({
  jobs,
  leagues,
}: {
  jobs: IngestJobRow[];
  leagues: LeagueFreshnessRow[];
}) {
  return (
    <div className="px-4 space-y-6">
      <section>
        <h2 className="font-display text-sm tracking-wide text-text-primary mb-2">
          Sync jobs
        </h2>
        <p className="text-xs text-text-muted mb-3">
          The real health check. Alerts fire (via Sentry) when a job&apos;s last
          successful run goes past its allowed age.
        </p>
        <div className="space-y-2">
          {jobs.map((j) => (
            <JobCard key={j.job} job={j} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-display text-sm tracking-wide text-text-primary mb-2">
          By league
        </h2>
        <p className="text-xs text-text-muted mb-3">
          Newest event and last time we added a game, per league. Leagues with no
          upcoming games are out of season — expected, not a problem.
        </p>
        <div className="rounded-xl border border-white/10 divide-y divide-white/10">
          {leagues.map((l) => (
            <div key={l.slug} className="px-3 py-2.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-text-primary truncate">{l.name}</span>
                  <span
                    className={`text-[10px] uppercase tracking-wide ${l.inSeason ? "text-win" : "text-text-muted"}`}
                  >
                    {l.inSeason ? `${l.upcomingEvents} upcoming` : "off-season"}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  {l.sport || "—"} · {l.totalEvents.toLocaleString()} events
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-text-secondary">
                  latest {fmtDate(l.lastEventDate)}
                </div>
                <div className="text-[11px] text-text-muted">
                  added {l.lastIngestedAt ? formatRelative(l.lastIngestedAt) : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
