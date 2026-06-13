import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchLeagueFavorites } from "@/lib/queries/bigfour";
import { fetchBigFour } from "@/lib/queries/profile";
import { fetchUserProfileByUsername, fetchFollowRelationship, checkBlocked } from "@/lib/queries/social";
import SportIcon from "@/components/SportIcon";

const VALID_CATEGORIES = ["team", "venue", "athlete", "event"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  team: "Favorite Teams",
  venue: "Favorite Venues",
  athlete: "Favorite Athletes",
  event: "Favorite Events",
};

type Props = {
  params: Promise<{ username: string; category: string }>;
};

export default async function UserFavoritesCategoryPage({ params }: Props) {
  const { username, category } = await params;
  if (!VALID_CATEGORIES.includes(category as Category)) {
    redirect(`/user/${username}`);
  }
  const cat = category as Category;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await fetchUserProfileByUsername(supabase, username);
  if (!profile) redirect("/explore");

  // Own profile drills into the editable view instead
  if (profile.id === user.id) redirect(`/profile/favorites/${cat}`);

  const isBlocked = await checkBlocked(supabase, user.id, profile.id);
  if (isBlocked) redirect("/explore");

  // Respect private-account gating
  if (profile.is_private) {
    const rel = await fetchFollowRelationship(supabase, user.id, profile.id);
    if (!rel.isFollowing) redirect(`/user/${username}`);
  }

  const [bigFour, favorites] = await Promise.all([
    fetchBigFour(supabase, profile),
    fetchLeagueFavorites(supabase, profile.id, cat),
  ]);
  const ranked = [...favorites].sort((a, b) => a.rank - b.rank);
  const mainFavorite = bigFour.find((b) => b.category === cat);
  const displayName = profile.display_name || profile.username;

  return (
    <div className="max-w-lg mx-auto pb-5">
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Link href={`/user/${username}`} className="p-1 hover:opacity-80 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-lg text-text-primary tracking-wide">
          {displayName}&apos;s {CATEGORY_LABELS[cat]}
        </h1>
      </div>

      {/* Featured favorite */}
      {mainFavorite && mainFavorite.name !== "Not set" && (
        <div className="px-4 pt-4 pb-2">
          <div className="bg-bg-card rounded-xl border border-accent/20 p-4">
            <div className="font-display text-[11px] text-accent tracking-[1.5px] uppercase mb-1">
              Featured Favorite
            </div>
            <div className="text-lg text-text-primary font-semibold">
              {mainFavorite.name}
            </div>
            {mainFavorite.subtitle && (
              <div className="text-sm text-text-muted mt-0.5">
                {mainFavorite.subtitle}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ranked picks (read-only) */}
      <div className="px-4 pt-3">
        <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-3">
          {displayName}&apos;s Ranking
        </div>
        {ranked.length === 0 ? (
          <p className="text-sm text-text-muted">No picks yet.</p>
        ) : (
          <div className="space-y-2">
            {ranked.map((fav, i) => (
              <div key={fav.id} className="bg-bg-card rounded-xl border border-border overflow-hidden">
                <div className="flex items-center gap-2.5 px-3 py-3">
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      i === 0 ? "bg-accent text-white" : "bg-bg-elevated text-text-secondary"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <SportIcon league={fav.league_slug} size={22} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-text-primary font-medium truncate">
                      {fav.pick_name}
                    </div>
                    <div className="text-xs text-text-muted truncate">
                      {fav.league_name}
                      {i === 0 && <span className="text-accent"> · Featured</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
