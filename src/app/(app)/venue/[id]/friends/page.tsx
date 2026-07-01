import { createClient } from "@/lib/supabase/server";
import { fetchVenueDetail, fetchVenueFriendsWhoVisited } from "@/lib/queries/venue";
import UserList from "@/components/social/UserList";
import { BackLink } from "@/components/PageHeader";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VenueFriendsPage({ params }: Props) {
  const { id } = await params;
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

  const [venue, friends] = await Promise.all([
    fetchVenueDetail(supabase, id),
    fetchVenueFriendsWhoVisited(supabase, user.id, id),
  ]);

  return (
    <div className="max-w-lg mx-auto pb-5">
      <div className="px-4 pt-2 mb-3 flex items-center gap-3">
        <BackLink href={`/venue/${id}`} className="p-1 -ml-1 hover:opacity-80 transition-opacity" />
        <div className="min-w-0">
          <h1 className="font-display text-[22px] text-text-primary tracking-wide leading-tight">
            Friends who visited
          </h1>
          {venue && <p className="text-xs text-text-muted truncate">{venue.name}</p>}
        </div>
      </div>
      <UserList
        users={friends}
        currentUserId={user.id}
        emptyState={
          <div className="text-center text-text-muted text-sm py-12">
            None of the people you follow have logged a game here yet.
          </div>
        }
      />
    </div>
  );
}
