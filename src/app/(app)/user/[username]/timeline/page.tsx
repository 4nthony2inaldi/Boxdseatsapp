import { createClient } from "@/lib/supabase/server";
import { fetchTimeline } from "@/lib/queries/profile";
import { fetchUserProfileByUsername, checkBlocked } from "@/lib/queries/social";
import Timeline from "@/components/profile/Timeline";
import Link from "next/link";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function UserTimelinePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view this timeline.</p>
      </div>
    );
  }

  const profile = await fetchUserProfileByUsername(supabase, username);

  if (!profile) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">User not found.</p>
      </div>
    );
  }

  const isBlocked = await checkBlocked(supabase, user.id, profile.id);
  if (isBlocked) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">This profile is not available.</p>
      </div>
    );
  }

  const { entries: timelineEntries, hasMore } = await fetchTimeline(supabase, profile.id);

  return (
    <div className="max-w-lg mx-auto pb-5">
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 mt-4 mb-4">
        <Link
          href={`/user/${username}`}
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
          {profile.display_name || profile.username}&apos;s Events
        </h1>
      </div>
      <Timeline initialEntries={timelineEntries} initialHasMore={hasMore} userId={profile.id} />
    </div>
  );
}
