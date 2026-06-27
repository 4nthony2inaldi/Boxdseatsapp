import { createClient } from "@/lib/supabase/server";
import { fetchTimeline } from "@/lib/queries/profile";
import Timeline from "@/components/profile/Timeline";
import BackfillPhotosPrompt from "@/components/photolog/BackfillPhotosPrompt";
import { countPhotolessLogs } from "@/lib/queries/photoBackfill";
import Link from "next/link";
import { BackLinkCircle } from "@/components/PageHeader";

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const monthFilter = month && /^\d{4}-\d{2}$/.test(month) ? month : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted mb-4">Please log in to view your timeline.</p>
        <Link
          href="/login"
          className="inline-block bg-accent text-bg font-display text-sm tracking-wider uppercase px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          Log in
        </Link>
      </div>
    );
  }

  const [{ entries: timelineEntries, hasMore }, photolessCount] = await Promise.all([
    fetchTimeline(supabase, user.id, undefined, 20, 0, monthFilter),
    countPhotolessLogs(supabase, user.id),
  ]);

  return (
    <div className="max-w-lg mx-auto pb-5">
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 mt-4 mb-4">
        <BackLinkCircle href="/profile" />
        <h1 className="font-display text-2xl text-text-primary tracking-wide">
          Logged Events
        </h1>
        {monthFilter && (
          <Link
            href="/timeline"
            className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/40 text-accent text-xs"
          >
            {new Date(monthFilter + "-15T00:00:00").toLocaleString("en-US", { month: "long", year: "numeric" })}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Link>
        )}
      </div>
      {!monthFilter && <BackfillPhotosPrompt count={photolessCount} />}
      <Timeline key={monthFilter ?? "all"} initialEntries={timelineEntries} initialHasMore={hasMore} userId={user.id} viewerId={user.id} canEdit monthFilter={monthFilter} />
    </div>
  );
}
