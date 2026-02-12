import { createClient } from "@/lib/supabase/server";
import { fetchTimeline } from "@/lib/queries/profile";
import Timeline from "@/components/profile/Timeline";
import Link from "next/link";

export default async function TimelinePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view your timeline.</p>
      </div>
    );
  }

  const { entries: timelineEntries, hasMore } = await fetchTimeline(supabase, user.id);

  return (
    <div className="max-w-lg mx-auto pb-5">
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 mt-4 mb-4">
        <Link
          href="/profile"
          className="flex items-center justify-center w-8 h-8 rounded-full bg-bg-elevated"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F0EBE0"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-2xl text-text-primary tracking-wide">
          Logged Events
        </h1>
      </div>
      <Timeline initialEntries={timelineEntries} initialHasMore={hasMore} userId={user.id} />
    </div>
  );
}
