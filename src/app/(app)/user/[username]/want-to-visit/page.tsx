import { createClient } from "@/lib/supabase/server";
import { fetchUserProfileByUsername, checkBlocked } from "@/lib/queries/social";
import { fetchWantToVisitVenues } from "@/lib/queries/lists";
import Link from "next/link";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function UserWantToVisitPage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view this list.</p>
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

  const venues = await fetchWantToVisitVenues(supabase, profile.id);

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
        <div>
          <h1 className="font-display text-2xl text-text-primary tracking-wide leading-tight">
            {profile.display_name || profile.username}&apos;s Bucket List
          </h1>
          <span className="text-text-secondary text-sm">
            {venues.length} {venues.length === 1 ? "venue" : "venues"} to visit
          </span>
        </div>
      </div>

      <div className="px-4">
        {venues.length > 0 ? (
          <div className="space-y-2">
            {venues.map((venue) => (
              <Link key={venue.venue_id} href={`/venue/${venue.venue_id}`}>
                <div className="rounded-xl border border-border bg-bg-card px-4 py-3 flex items-center gap-3 hover:border-accent transition-colors">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-accent shrink-0"
                  >
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary truncate">
                      {venue.name}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5">
                      {venue.city}
                      {venue.state ? `, ${venue.state}` : ""}
                    </div>
                  </div>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#5A5F72"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#5A5F72"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mx-auto mb-3"
            >
              <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
            <div className="font-display text-lg text-text-primary tracking-wide mb-2">
              Nothing Here Yet
            </div>
            <p className="text-text-muted text-sm">
              This user hasn&apos;t added any venues to their bucket list.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
