export default function LogPage() {
  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-2xl tracking-wider text-text-primary mb-2">LOG EVENT</h1>
      <p className="text-text-secondary text-sm">
        Log a game or event you attended.
      </p>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {[
          { league: "NFL", icon: "🏈" },
          { league: "NBA", icon: "🏀" },
          { league: "MLB", icon: "⚾" },
          { league: "NHL", icon: "🏒" },
          { league: "MLS", icon: "⚽" },
          { league: "PGA", icon: "⛳" },
        ].map((item) => (
          <div
            key={item.league}
            className="rounded-xl border border-border bg-bg-card p-4 text-center cursor-pointer hover:border-accent transition-colors"
          >
            <div className="text-2xl mb-2">{item.icon}</div>
            <div className="font-display text-sm tracking-wider text-text-primary">
              {item.league}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
