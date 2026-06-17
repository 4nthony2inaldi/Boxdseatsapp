import { createClient } from "@/lib/supabase/server";
import { fetchFollowingList } from "@/lib/queries/social";
import UserList from "@/components/social/UserList";
import Link from "next/link";

export default async function FollowingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in.</p>
      </div>
    );
  }

  const following = await fetchFollowingList(supabase, user.id, user.id);

  return (
    <div className="max-w-lg mx-auto pb-5">
      <div className="px-4 pt-2 mb-3 flex items-center gap-3">
        <Link
          href="/profile"
          className="text-text-muted hover:text-text-secondary transition-colors"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-[22px] text-text-primary tracking-wide">
          Following
        </h1>
      </div>
      <UserList
        users={following}
        currentUserId={user.id}
        emptyState={
          <div className="px-4 py-12">
            <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
              <div className="font-display text-lg text-text-primary tracking-wide mb-2">
                Not Following Anyone
              </div>
              <p className="text-text-muted text-sm mb-4">
                Follow other fans to see their event logs in your feed.
              </p>
              <Link
                href="/explore"
                className="inline-block px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{
                  background:
                    "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
                }}
              >
                Find Fans to Follow
              </Link>
            </div>
          </div>
        }
      />
    </div>
  );
}
