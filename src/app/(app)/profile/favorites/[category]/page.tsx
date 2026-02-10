import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { fetchLeagueFavorites } from "@/lib/queries/bigfour";
import { fetchBigFour, fetchProfile } from "@/lib/queries/profile";
import BigFourDrillThrough from "@/components/profile/BigFourDrillThrough";

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
      {/* Back header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Link href="/profile" className="p-1 hover:opacity-80 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-lg text-text-primary tracking-wide">
          {CATEGORY_LABELS[cat]}
        </h1>
      </div>

      {/* Main favorite */}
      {mainFavorite && mainFavorite.name !== "Not set" && (
        <div className="px-4 pt-4 pb-2">
          <div className="bg-bg-card rounded-xl border border-accent/20 p-4">
            <div className="font-display text-[11px] text-accent tracking-[1.5px] uppercase mb-1">
              Overall Favorite
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

      {/* Per-league favorites */}
      <div className="px-4 pt-4">
        <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-3">
          By League
        </div>
        <BigFourDrillThrough
          userId={user.id}
          category={cat}
          initialFavorites={leagueFavorites}
        />
      </div>
    </div>
  );
}
