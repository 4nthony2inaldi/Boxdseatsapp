import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import landTopo from "world-atlas/land-110m.json";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const land = feature(landTopo as any, (landTopo as any).objects.land) as any;

export type MapVenue = { venue_id: string; lat: number; lng: number; games: number; name?: string };
export type MapBubble = { id: string; name?: string; cx: number; cy: number; r: number; fill: string };

/** Heat colour + radius scale by games logged at a venue. */
export function bubbleStyle(games: number) {
  const r = Math.min(18, 4 + Math.sqrt(games) * 2.6);
  const fill =
    games >= 12 ? "#E4572E" : games >= 5 ? "#E8A44E" : games >= 1 ? "#D4872C" : "#7B5B3A";
  return { r: Math.max(4, r), fill };
}

/**
 * Project the user's venues into a W×H box over the world land basemap and
 * return the land outline path + heat bubbles. Shared by the in-app map and
 * the share-image renderer so both look identical.
 */
export function buildPassportMap(
  venues: MapVenue[],
  W: number,
  H: number,
  pad = 24,
  maxScale = 900
): { landPath: string; bubbles: MapBubble[] } {
  const proj = geoMercator();
  const points = {
    type: "FeatureCollection" as const,
    features: venues.map((v) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
      properties: {},
    })),
  };
  if (venues.length > 0) {
    proj.fitExtent([[pad, pad], [W - pad, H - pad]], points);
    if (!isFinite(proj.scale()) || proj.scale() > maxScale) {
      const cx = venues.reduce((s, v) => s + v.lng, 0) / venues.length;
      const cy = venues.reduce((s, v) => s + v.lat, 0) / venues.length;
      proj.scale(maxScale).center([cx, cy]).translate([W / 2, H / 2]);
    }
  } else {
    proj.scale(120).center([-40, 30]).translate([W / 2, H / 2]);
  }

  const path = geoPath(proj);
  const landPath = path(land) || "";

  const bubbles: MapBubble[] = [];
  for (const v of [...venues].sort((a, b) => a.games - b.games)) {
    const xy = proj([v.lng, v.lat]);
    if (!xy) continue;
    const { r, fill } = bubbleStyle(v.games);
    bubbles.push({ id: v.venue_id, name: v.name, cx: xy[0], cy: xy[1], r, fill });
  }
  return { landPath, bubbles };
}
