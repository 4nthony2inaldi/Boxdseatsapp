/**
 * Top-of-page summary for the Multiple Countries badge: a bar per country with
 * the number of games logged there, so you can see the spread at a glance
 * (the full game list sits below). The badge tile itself counts distinct
 * countries — the home country would dominate a game count — so this breaks
 * that single number out per country. Renders nothing when there are no games.
 */
export default function BadgeCountrySummary({
  games,
}: {
  games: { country: string | null }[];
}) {
  const counts = new Map<string, number>();
  for (const g of games) {
    const c = g.country?.trim();
    if (c) counts.set(c, (counts.get(c) || 0) + 1);
  }
  const rows = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r[1]));

  return (
    <div className="mb-5 rounded-xl border border-border bg-bg-card p-4">
      <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-3">
        {rows.length} {rows.length === 1 ? "country" : "countries"}
      </div>
      <div className="space-y-2">
        {rows.map(([country, n]) => (
          <div key={country} className="flex items-center gap-3">
            <div className="w-16 text-xs text-text-secondary truncate">{country}</div>
            <div className="flex-1 h-2.5 rounded-full bg-bg-input overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(n / max) * 100}%`,
                  background: "linear-gradient(90deg, var(--color-accent-brown), var(--color-accent))",
                }}
              />
            </div>
            <div className="w-10 text-right text-xs text-text-muted">{n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
