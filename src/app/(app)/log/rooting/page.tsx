import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { fetchRootlessLogs } from "@/lib/queries/rooting";
import RootingBackfillView from "@/components/rooting/RootingBackfillView";

/**
 * Retroactively set who you rooted for on games logged without a side (mostly
 * from a bulk photo scan), so win/loss fills into your fan record.
 */
export default async function RootingBackfillPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [games, favRows] = await Promise.all([
    fetchRootlessLogs(supabase, user.id),
    supabase
      .from("user_league_favorites")
      .select("team_id")
      .eq("user_id", user.id)
      .eq("category", "team")
      .not("team_id", "is", null),
  ]);

  const favoriteTeamIds = (favRows.data || [])
    .map((f) => f.team_id as string | null)
    .filter((id): id is string => !!id);

  return <RootingBackfillView games={games} favoriteTeamIds={favoriteTeamIds} />;
}
