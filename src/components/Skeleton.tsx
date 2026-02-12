export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-bg-elevated rounded animate-pulse ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-4 mb-3 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-bg-elevated" />
        <div className="flex-1">
          <div className="h-3 w-24 bg-bg-elevated rounded mb-1.5" />
          <div className="h-2.5 w-16 bg-bg-elevated rounded" />
        </div>
      </div>
      <div className="h-3 w-full bg-bg-elevated rounded mb-2" />
      <div className="h-3 w-3/4 bg-bg-elevated rounded mb-2" />
      <div className="h-2.5 w-1/2 bg-bg-elevated rounded" />
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="max-w-lg mx-auto animate-pulse">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-bg-elevated" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-bg-elevated rounded mb-2" />
            <div className="h-3 w-20 bg-bg-elevated rounded mb-2" />
            <div className="h-3 w-24 bg-bg-elevated rounded" />
          </div>
        </div>
      </div>
      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="text-center">
              <div className="h-5 w-8 bg-bg-elevated rounded mx-auto mb-1" />
              <div className="h-2.5 w-12 bg-bg-elevated rounded mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Big Four */}
      <div className="px-4 pb-4">
        <div className="h-3 w-20 bg-bg-elevated rounded mb-3" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-1 rounded-xl bg-bg-card border border-border overflow-hidden">
              <div className="h-[110px] bg-bg-elevated" />
              <div className="p-2">
                <div className="h-2 w-12 bg-bg-elevated rounded mx-auto mb-1" />
                <div className="h-2.5 w-16 bg-bg-elevated rounded mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Timeline cards */}
      <div className="px-4">
        <div className="h-3 w-16 bg-bg-elevated rounded mb-3" />
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonFeed() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-2 mb-3">
        <div className="h-6 w-16 bg-bg-elevated rounded" />
      </div>
      <div className="px-4">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTimelineCard() {
  return (
    <div className="rounded-[14px] border border-border bg-bg-card p-4 mb-3 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-bg-elevated" />
          <div className="h-2.5 w-10 bg-bg-elevated rounded" />
        </div>
        <div className="h-2.5 w-16 bg-bg-elevated rounded" />
      </div>
      <div className="h-5 w-3/4 bg-bg-elevated rounded mb-2" />
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="w-3 h-3 bg-bg-elevated rounded" />
        <div className="h-2.5 w-28 bg-bg-elevated rounded" />
        <div className="h-2.5 w-16 bg-bg-elevated rounded" />
      </div>
      <div className="h-[180px] bg-bg-elevated rounded-lg mb-2.5" />
      <div className="flex items-center gap-5 border-t border-border pt-2.5">
        <div className="h-4 w-10 bg-bg-elevated rounded" />
        <div className="h-4 w-10 bg-bg-elevated rounded" />
        <div className="ml-auto h-4 w-8 bg-bg-elevated rounded" />
      </div>
    </div>
  );
}

export function SkeletonFeedCard() {
  return (
    <div className="rounded-[14px] border border-border bg-bg-card p-4 mb-3 animate-pulse">
      <div className="flex items-center gap-2.5 mb-3 pb-3 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-bg-elevated" />
        <div className="flex-1">
          <div className="h-3 w-24 bg-bg-elevated rounded mb-1.5" />
          <div className="h-2.5 w-16 bg-bg-elevated rounded" />
        </div>
        <div className="h-2.5 w-14 bg-bg-elevated rounded" />
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-bg-elevated" />
          <div className="h-2.5 w-10 bg-bg-elevated rounded" />
        </div>
        <div className="h-2.5 w-16 bg-bg-elevated rounded" />
      </div>
      <div className="h-5 w-3/4 bg-bg-elevated rounded mb-2" />
      <div className="flex items-center gap-1.5 mb-2.5">
        <div className="w-3 h-3 bg-bg-elevated rounded" />
        <div className="h-2.5 w-28 bg-bg-elevated rounded" />
      </div>
      <div className="flex items-center gap-5 border-t border-border pt-2.5">
        <div className="h-4 w-10 bg-bg-elevated rounded" />
        <div className="h-4 w-10 bg-bg-elevated rounded" />
        <div className="ml-auto h-4 w-8 bg-bg-elevated rounded" />
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="rounded-xl border border-border bg-bg-card/50 px-4 py-3 flex items-center gap-3 animate-pulse">
      <div className="w-5 h-5 rounded bg-bg-elevated" />
      <div className="h-3.5 flex-1 bg-bg-elevated rounded" />
    </div>
  );
}

export function SkeletonEventDetail() {
  return (
    <div className="px-4 pb-8 max-w-lg mx-auto animate-pulse">
      <div className="-mx-4 h-28 bg-bg-elevated mb-5" />
      <div className="flex items-center gap-2 mb-4 -mt-10">
        <div className="w-5 h-5 rounded bg-bg-elevated" />
        <div className="h-3 w-16 bg-bg-elevated rounded" />
      </div>
      <div className="bg-bg-card rounded-xl border border-border p-5 mb-5">
        <div className="flex items-center justify-center gap-6">
          <div className="text-center flex-1">
            <div className="h-5 w-12 bg-bg-elevated rounded mx-auto mb-2" />
            <div className="h-8 w-8 bg-bg-elevated rounded mx-auto" />
          </div>
          <div className="h-3 w-6 bg-bg-elevated rounded" />
          <div className="text-center flex-1">
            <div className="h-5 w-12 bg-bg-elevated rounded mx-auto mb-2" />
            <div className="h-8 w-8 bg-bg-elevated rounded mx-auto" />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-6">
        <div className="h-3 w-40 bg-bg-elevated rounded" />
        <div className="h-3 w-24 bg-bg-elevated rounded" />
      </div>
      <div className="h-3 w-16 bg-bg-elevated rounded mb-3" />
      <div className="bg-bg-card rounded-xl border border-border p-4 mb-6">
        <div className="h-[200px] bg-bg-elevated rounded-lg mb-3" />
        <div className="h-3 w-20 bg-bg-elevated rounded mb-2" />
        <div className="h-3 w-full bg-bg-elevated rounded" />
      </div>
    </div>
  );
}

export function SkeletonListDetail() {
  return (
    <div className="px-4 pb-8 max-w-lg mx-auto animate-pulse">
      <div className="flex items-center gap-3 mt-4 mb-4">
        <div className="w-9 h-9 rounded bg-bg-elevated" />
        <div className="flex-1">
          <div className="h-6 w-40 bg-bg-elevated rounded mb-1" />
          <div className="h-3 w-20 bg-bg-elevated rounded" />
        </div>
      </div>
      <div className="h-9 w-full bg-bg-elevated rounded-xl mb-5" />
      <div className="bg-bg-card rounded-xl border border-border p-5 mb-6">
        <div className="h-10 w-16 bg-bg-elevated rounded mb-2" />
        <div className="h-3 w-20 bg-bg-elevated rounded mb-3" />
        <div className="h-3 w-full bg-bg-elevated rounded-full" />
      </div>
      <div className="h-3 w-24 bg-bg-elevated rounded mb-3" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonList() {
  return (
    <div className="px-4 py-8 max-w-lg mx-auto">
      <div className="h-7 w-20 bg-bg-elevated rounded mb-2 animate-pulse" />
      <div className="h-3 w-48 bg-bg-elevated rounded mb-6 animate-pulse" />
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-card p-4 flex items-center gap-4 animate-pulse">
            <div className="w-8 h-8 bg-bg-elevated rounded" />
            <div className="flex-1">
              <div className="h-3.5 w-32 bg-bg-elevated rounded mb-1.5" />
              <div className="h-2.5 w-16 bg-bg-elevated rounded" />
            </div>
            <div className="w-16">
              <div className="h-2 w-8 bg-bg-elevated rounded ml-auto mb-1" />
              <div className="h-1.5 w-full bg-bg-elevated rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
