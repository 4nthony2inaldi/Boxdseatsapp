import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { badgeByKey, fetchAchievementGames } from "@/lib/queries/achievements";
import BadgeCountrySummary from "@/components/profile/BadgeCountrySummary";
import BadgeGameCard from "@/components/profile/BadgeGameCard";
import {
  fetchUserProfileByUsername,
  fetchFollowRelationship,
  checkBlocked,
} from "@/lib/queries/social";

/**
 * In-app badge detail: the games behind one badge for another user's profile.
 * Mirrors the public route but uses the in-app gating (block check + follow
 * relationship) and links each game to the in-app event page. Viewing your own
 * badge here redirects to the own-profile badge route.
 */
export default async function UserBadgeDetailPage({
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
  if (!user) redirect("/login");

  const profile = await fetchUserProfileByUsername(supabase, username);
  if (!profile) notFound();

  if (profile.id === user.id) {
    redirect(`/profile/badges/${key}`);
  }

  const [isBlocked, followRel] = await Promise.all([
    checkBlocked(supabase, user.id, profile.id),
    fetchFollowRelationship(supabase, user.id, profile.id),
  ]);

  if (isBlocked) notFound();

  const isGated = profile.is_private && !followRel.isFollowing;
  const games = isGated ? [] : await fetchAchievementGames(supabase, profile.id, key);
  const who = profile.display_name || profile.username;

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <Link href={`/user/${username}`} className="text-sm text-text-muted active:opacity-80">
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

      {key === "multiple-countries" && <BadgeCountrySummary games={games} />}

      <div className="flex flex-col gap-2">
        {games.map((g) => (
          <BadgeGameCard key={g.eventId} game={g} href={`/event/${g.eventId}`} />
        ))}
      </div>
    </div>
  );
}
