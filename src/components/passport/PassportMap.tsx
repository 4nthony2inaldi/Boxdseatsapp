import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import landTopo from "world-atlas/land-110m.json";
import type { PassportVenue } from "@/lib/queries/passport";

const W = 640;
const H = 360;
const PAD = 28;
const MAX_SCALE = 900;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const land = feature(landTopo as any, (landTopo as any).objects.land) as any;

/** Heat colour + radius scale by games logged at a venue. */
function bubble(games: number) {
  const r = Math.min(18, 4 + Math.sqrt(games) * 2.6);
  const fill =
    games >= 12 ? "#E4572E" : games >= 5 ? "#E8A44E" : games >= 1 ? "#D4872C" : "#7B5B3A";
  return { r: Math.max(4, r), fill };
}

export default function PassportMap({ venues }: { venues: PassportVenue[] }) {
  if (venues.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card h-48 flex items-center justify-center text-sm text-text-muted">
        Your map fills in as you log games.
      </div>
    );
  }

  const proj = geoMercator();
  const points = {
    type: "FeatureCollection" as const,
    features: venues.map((v) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [v.lng, v.lat] },
      properties: {},
    })),
  };
  proj.fitExtent([[PAD, PAD], [W - PAD, H - PAD]], points);
  if (!isFinite(proj.scale()) || proj.scale() > MAX_SCALE) {
    const cx = venues.reduce((s, v) => s + v.lng, 0) / venues.length;
    const cy = venues.reduce((s, v) => s + v.lat, 0) / venues.length;
    proj.scale(MAX_SCALE).center([cx, cy]).translate([W / 2, H / 2]);
  }

  const path = geoPath(proj);
  const landPath = path(land) || "";

  // Draw biggest bubbles last so they sit on top.
  const sorted = [...venues].sort((a, b) => a.games - b.games);

  return (
    <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block" style={{ background: "#0F1620" }}>
        <path d={landPath} fill="#1C2530" stroke="#2A3340" strokeWidth={0.5} />
        {sorted.map((v) => {
          const xy = proj([v.lng, v.lat]);
          if (!xy) return null;
          const { r, fill } = bubble(v.games);
          return (
            <a key={v.venue_id} href={`/venue/${v.venue_id}`} aria-label={v.name} style={{ cursor: "pointer" }}>
              <circle cx={xy[0]} cy={xy[1]} r={r} fill={fill} fillOpacity={0.55} stroke={fill} strokeWidth={1} />
            </a>
          );
        })}
      </svg>
    </div>
  );
}
