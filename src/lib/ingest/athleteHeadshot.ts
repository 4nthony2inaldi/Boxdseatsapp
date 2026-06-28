import { searchAthletesEspn } from "@/lib/queries/athleteSearchEspn";
import { fetchWikipediaImage } from "@/lib/images/wikipediaImage";

/**
 * Find a headshot URL for an athlete: ESPN first (matched by their ESPN id),
 * then a Wikipedia lead-photo fallback by name. Best-effort; returns null when
 * neither source has one. Shared by the favorite-select trigger and the
 * existing-favorites backfill so they resolve identically.
 */
export async function resolveAthleteHeadshot(opts: {
  name: string;
  sport: string | null;
  espnId: string | null;
}): Promise<string | null> {
  const { name, sport, espnId } = opts;
  if (!name.trim()) return null;

  if (espnId) {
    try {
      const hits = await searchAthletesEspn(name, sport, 20);
      const match = hits.find((h) => h.espnId === espnId && h.headshotUrl);
      if (match?.headshotUrl) return match.headshotUrl;
    } catch {
      /* fall through to Wikipedia */
    }
  }
  return fetchWikipediaImage(name);
}
