import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchProfile } from "@/lib/queries/profile";
import {
  fetchUserProfileByUsername,
  fetchFollowRelationship,
  checkBlocked,
} from "@/lib/queries/social";
import { fetchComparison } from "@/lib/queries/compare";
import CompareView from "@/components/compare/CompareView";

type Props = {
  params: Promise<{ username: string }>;
};

export default async function ComparePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to compare profiles.</p>
      </div>
    );
  }

  const target = await fetchUserProfileByUsername(supabase, username);
  if (!target) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">User not found.</p>
      </div>
    );
  }

  // Comparing with yourself isn't a thing — send to your own profile.
  if (target.id === user.id) {
    redirect("/profile");
  }

  const isBlocked = await checkBlocked(supabase, user.id, target.id);
  if (isBlocked) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">This profile is not available.</p>
      </div>
    );
  }

  const [followRel, viewerProfile] = await Promise.all([
    fetchFollowRelationship(supabase, user.id, target.id),
    fetchProfile(supabase, user.id),
  ]);

  // Same visibility gate as the profile/passport: public, or you follow them.
  const isGated = target.is_private && !followRel.isFollowing;
  if (isGated || !viewerProfile) {
    return (
      <div className="px-4 py-12 max-w-lg mx-auto text-center">
        <p className="text-text-muted text-sm font-medium mb-1">This account is private</p>
        <p className="text-text-muted text-xs">Follow this user to compare your fandom.</p>
      </div>
    );
  }

  const data = await fetchComparison(supabase, viewerProfile, target);

  return (
    <CompareView
      me={{
        id: viewerProfile.id,
        username: viewerProfile.username,
        displayName: viewerProfile.display_name || viewerProfile.username,
        avatarUrl: viewerProfile.avatar_url,
      }}
      them={{
        id: target.id,
        username: target.username,
        displayName: target.display_name || target.username,
        avatarUrl: target.avatar_url,
      }}
      data={data}
      backHref={`/user/${username}`}
    />
  );
}
