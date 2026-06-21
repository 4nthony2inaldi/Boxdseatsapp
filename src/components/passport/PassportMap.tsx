import { buildPassportMap, type MapVenue } from "@/lib/passportMap";

const W = 640;
const H = 360;

export default function PassportMap({ venues }: { venues: MapVenue[] }) {
  if (venues.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-bg-card h-48 flex items-center justify-center text-sm text-text-muted">
        Your map fills in as you log games.
      </div>
    );
  }

  const { landPath, bubbles } = buildPassportMap(venues, W, H, 28);

  return (
    <div className="rounded-2xl border border-border bg-bg-card overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="block" style={{ background: "#0F1620" }}>
        <path d={landPath} fill="#1C2530" stroke="#2A3340" strokeWidth={0.5} />
        {bubbles.map((b) => (
          <a key={b.id} href={`/venue/${b.id}`} aria-label={b.name} style={{ cursor: "pointer" }}>
            <circle cx={b.cx} cy={b.cy} r={b.r} fill={b.fill} fillOpacity={0.55} stroke={b.fill} strokeWidth={1} />
          </a>
        ))}
      </svg>
    </div>
  );
}
