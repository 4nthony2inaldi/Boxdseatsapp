import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { badgeByKey, fetchAchievementGames } from "@/lib/queries/achievements";
import { fetchUserProfileByUsername, fetchFollowRelationship } from "@/lib/queries/social";

/**
 * Public badge detail: the games behind one badge for the profile being viewed
 * (not the viewer). RLS scopes what's readable; a private account is gated to
 * followers/owner, matching the profile page.
 */
export default async function PublicBadgeDetailPage({
  params,
}: {
  params: Promise<{ username: string; key: string }>;
}) {
  const { username, key } = await params;
  const def = badgeByKey(key);
  if (!def) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await fetchUserProfileByUsername(supabase, username);
  if (!profile) notFound();

  const isOwn = user?.id === profile.id;
  let isFollowing = false;
  if (user && !isOwn) {
    isFollowing = (await fetchFollowRelationship(supabase, user.id, profile.id)).isFollowing;
  }
  const isGated = profile.is_private && !isFollowing && !isOwn;

  const games = isGated ? [] : await fetchAchievementGames(supabase, profile.id, key, isOwn);
  const who = profile.display_name || profile.username;

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <Link href={`/@${username}`} className="text-sm text-text-muted active:opacity-80">
        ← {who}
      </Link>

      <div className="mt-3 mb-5">
        <h1 className="font-display text-2xl text-text-primary tracking-wide">{def.label}</h1>
        <p className="text-sm text-text-muted mt-1">
          {isGated
            ? "This account is private."
            : games.length === 0
              ? "No games for this badge yet."
              : `${games.length} ${games.length === 1 ? "game" : "games"}`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {games.map((g) => (
          <Link
            key={g.eventId}
            href={`/e/${g.eventId}`}
            className="block bg-bg-card border border-border rounded-xl px-4 py-3 active:opacity-80 transition-opacity"
          >
            <div className="text-sm text-text-primary font-medium">{g.title}</div>
            <div className="text-xs text-text-muted mt-0.5">
              {new Date(g.date + "T00:00:00").toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {g.venue ? ` · ${g.venue}` : ""}
              {g.country ? ` · ${g.country}` : ""}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
