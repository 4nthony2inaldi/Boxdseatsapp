import { createClient } from "@/lib/supabase/server";
import { fetchFollowersList } from "@/lib/queries/social";
import UserList from "@/components/social/UserList";
import Link from "next/link";

export default async function FollowersPage() {
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

  const followers = await fetchFollowersList(supabase, user.id, user.id);

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
          Followers
        </h1>
      </div>
      <UserList users={followers} currentUserId={user.id} />
    </div>
  );
}
