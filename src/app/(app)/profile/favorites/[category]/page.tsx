import { createClient } from "@/lib/supabase/server";
import MiniLabel from "@/components/MiniLabel";
import { redirect } from "next/navigation";
import { fetchLeagueFavorites } from "@/lib/queries/bigfour";
import { fetchBigFour, fetchProfile } from "@/lib/queries/profile";
import BigFourDrillThrough from "@/components/profile/BigFourDrillThrough";
import VenueFavoritesPicker from "@/components/profile/VenueFavoritesPicker";
import PageHeader from "@/components/PageHeader";

const VALID_CATEGORIES = ["team", "venue", "athlete", "event"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

const CATEGORY_LABELS: Record<Category, string> = {
  team: "Favorite Team",
  venue: "Favorite Venue",
  athlete: "Favorite Athlete",
  event: "Favorite Event",
};

export default async function BigFourCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!VALID_CATEGORIES.includes(category as Category)) {
    redirect("/profile");
  }

  const cat = category as Category;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await fetchProfile(supabase, user.id);
  if (!profile) redirect("/login");

  const [bigFour, leagueFavorites] = await Promise.all([
    fetchBigFour(supabase, profile),
    fetchLeagueFavorites(supabase, user.id, cat),
  ]);

  const mainFavorite = bigFour.find((b) => b.category === cat);

  return (
    <div className="max-w-lg mx-auto pb-5">
      <PageHeader title={CATEGORY_LABELS[cat]} backHref="/profile" />

      {/* Main favorite */}
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

      {/* Hint */}
      <div className="px-4 pt-1 pb-1">
        <p className="text-xs text-text-muted">
          Drag to rank your picks — your #1 is featured on your profile.
        </p>
      </div>

      {/* Ranked picks */}
      <div className="px-4 pt-3">
        <MiniLabel className="mb-3">Your Ranking</MiniLabel>
        {cat === "venue" ? (
          <VenueFavoritesPicker userId={user.id} initialFavorites={leagueFavorites} />
        ) : (
          <BigFourDrillThrough
            userId={user.id}
            category={cat}
            initialFavorites={leagueFavorites}
          />
        )}
      </div>
    </div>
  );
}
