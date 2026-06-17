import { SkeletonLine } from "@/components/Skeleton";

export default function SettingsLoading() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto animate-pulse">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <SkeletonLine className="w-8 h-8 rounded-full" />
        <SkeletonLine className="h-6 w-28" />
      </div>
      {/* Setting groups */}
      {[1, 2, 3].map((group) => (
        <div key={group} className="mb-6">
          <SkeletonLine className="h-3 w-24 mb-3" />
          <div className="rounded-xl border border-border bg-bg-card divide-y divide-border">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between px-4 py-3.5">
                <SkeletonLine className="h-3.5 w-32" />
                <SkeletonLine className="h-5 w-10 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
