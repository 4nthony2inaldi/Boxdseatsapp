import { createClient } from "@/lib/supabase/server";
import { fetchFeed } from "@/lib/queries/social";
import FeedList from "@/components/feed/FeedList";

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view your feed.</p>
      </div>
    );
  }

  const entries = await fetchFeed(supabase, user.id);

  return (
    <div className="max-w-lg mx-auto">
      <div className="px-4 pt-2 mb-3">
        <h1 className="font-display text-[22px] text-text-primary tracking-wide">
          Feed
        </h1>
      </div>
      <FeedList initialEntries={entries} userId={user.id} />
    </div>
  );
}
