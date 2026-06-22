import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/Button";
import { fetchFollowersList } from "@/lib/queries/social";
import UserList from "@/components/social/UserList";
import { BackLink } from "@/components/PageHeader";

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
        <BackLink href="/profile" className="p-1 -ml-1 hover:opacity-80 transition-opacity" />
        <h1 className="font-display text-[22px] text-text-primary tracking-wide">
          Followers
        </h1>
      </div>
      <UserList
        users={followers}
        currentUserId={user.id}
        allowRemove
        emptyState={
          <div className="px-4 py-12">
            <div className="rounded-xl border border-border bg-bg-card p-8 text-center">
              <div className="font-display text-lg text-text-primary tracking-wide mb-2">
                No Followers Yet
              </div>
              <p className="text-text-muted text-sm mb-4">
                Follow others and log events — fans will start following you back.
              </p>
              <ButtonLink href="/explore" size="md">Find Fans to Follow</ButtonLink>
            </div>
          </div>
        }
      />
    </div>
  );
}
