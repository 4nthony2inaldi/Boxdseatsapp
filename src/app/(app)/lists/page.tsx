export default function ListsPage() {
  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-2xl tracking-wider text-text-primary mb-2">LISTS</h1>
      <p className="text-text-secondary text-sm">
        Track your progress on stadium challenges and custom lists.
      </p>
      <div className="mt-8 space-y-3">
        {[
          { name: "All 30 MLB Stadiums", progress: "0/30", sport: "⚾" },
          { name: "All 32 NFL Stadiums", progress: "0/32", sport: "🏈" },
          { name: "All 30 NBA Arenas", progress: "0/30", sport: "🏀" },
          { name: "All 32 NHL Arenas", progress: "0/32", sport: "🏒" },
        ].map((list) => (
          <div
            key={list.name}
            className="rounded-xl border border-border bg-bg-card p-4 flex items-center gap-4 cursor-pointer hover:border-accent transition-colors"
          >
            <span className="text-xl">{list.sport}</span>
            <div className="flex-1">
              <div className="font-display text-sm tracking-wider text-text-primary">
                {list.name}
              </div>
              <div className="text-text-muted text-xs mt-0.5">{list.progress}</div>
            </div>
            <div className="w-16 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
              <div className="h-full rounded-full bg-accent" style={{ width: "0%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
