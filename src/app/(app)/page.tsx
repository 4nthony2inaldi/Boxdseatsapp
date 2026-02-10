export default function FeedPage() {
  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <h1 className="font-display text-2xl tracking-wider text-text-primary mb-2">FEED</h1>
      <p className="text-text-secondary text-sm">
        Your social feed will appear here — events logged by people you follow.
      </p>
      <div className="mt-8 rounded-xl border border-border bg-bg-card p-6 text-center">
        <p className="text-text-muted text-sm">No events yet. Follow other users to see their activity.</p>
      </div>
    </div>
  );
}
