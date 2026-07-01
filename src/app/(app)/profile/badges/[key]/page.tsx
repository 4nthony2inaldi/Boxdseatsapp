import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { badgeByKey, fetchAchievementGames } from "@/lib/queries/achievements";
import BadgeCountrySummary from "@/components/profile/BadgeCountrySummary";

/**
 * Badge detail: the list of the user's logged games that earned this badge.
 * Reached by tapping a badge on the profile. Owner-scoped for now (reads the
 * signed-in user's logs).
 */
export default async function BadgeDetailPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const def = badgeByKey(key);
  if (!def) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto text-center">
        <p className="text-text-muted">Please log in to view this badge.</p>
      </div>
    );
  }

  const games = await fetchAchievementGames(supabase, user.id, key, true);

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <Link href="/profile" className="text-sm text-text-muted active:opacity-80">
        ← Profile
      </Link>

      <div className="mt-3 mb-5">
        <h1 className="font-display text-2xl text-text-primary tracking-wide">{def.label}</h1>
        <p className="text-sm text-text-muted mt-1">
          {games.length === 0
            ? "You haven't earned this one yet."
            : `${games.length} ${games.length === 1 ? "game" : "games"}`}
        </p>
      </div>

      {key === "multiple-countries" && <BadgeCountrySummary games={games} />}

      <div className="flex flex-col gap-2">
        {games.map((g) => (
          <Link
            key={g.eventId}
            href={`/event/${g.eventId}`}
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
