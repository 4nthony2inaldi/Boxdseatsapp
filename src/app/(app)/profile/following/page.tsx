import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/Button";
import { fetchFollowingList } from "@/lib/queries/social";
import UserList from "@/components/social/UserList";
import { BackLink } from "@/components/PageHeader";

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
        <BackLink href="/profile" className="p-1 -ml-1 hover:opacity-80 transition-opacity" />
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
              <ButtonLink href="/explore" size="md">Find Fans to Follow</ButtonLink>
            </div>
          </div>
        }
      />
    </div>
  );
}
