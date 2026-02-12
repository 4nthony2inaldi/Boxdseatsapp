import { SkeletonTimelineCard } from "@/components/Skeleton";

export default function TimelineLoading() {
  return (
    <div className="max-w-lg mx-auto pb-5">
      <div className="flex items-center gap-3 px-4 mt-4 mb-4">
        <div className="w-8 h-8 rounded-full bg-bg-elevated animate-pulse" />
        <div className="h-6 w-32 bg-bg-elevated rounded animate-pulse" />
      </div>
      <div className="px-4">
        {[1, 2, 3].map((i) => (
          <SkeletonTimelineCard key={i} />
        ))}
      </div>
    </div>
  );
}
