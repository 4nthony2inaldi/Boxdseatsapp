/**
 * Best-effort lead image (the infobox photo) for a Wikipedia page title — used
 * as a deep fallback for an athlete's headshot when ESPN has none. Returns a
 * thumbnail URL on upload.wikimedia.org (whitelisted for next/image), or null.
 *
 * Title-based lookup with redirects, so "John Elway" resolves to his page and
 * its portrait. Best-effort: a very ambiguous name could resolve to the wrong
 * page, so callers should treat it as a fallback, not authoritative.
 */
const UA = "BoxdSeats/1.0 (athlete headshot; contact: support@boxdseats.com)";
// Skip non-photo lead images (logos, crests, signatures, SVG maps).
const BAD_FILE = /\.svg(\?|$)|logo|crest|seal|coat[_ ]of[_ ]arms|locator|signature/i;

export async function fetchWikipediaImage(name: string): Promise<string | null> {
  const title = name.trim();
  if (!title) return null;
  const url =
    "https://en.wikipedia.org/w/api.php?action=query&format=json&redirects=1" +
    "&prop=pageimages&piprop=thumbnail&pithumbsize=400" +
    `&titles=${encodeURIComponent(title)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { query?: { pages?: Record<string, { thumbnail?: { source?: string } }> } };
    const pages = data.query?.pages;
    if (!pages) return null;
    for (const p of Object.values(pages)) {
      const src = p?.thumbnail?.source;
      if (src && !BAD_FILE.test(src)) return src;
    }
  } catch {
    /* best-effort */
  }
  return null;
}
