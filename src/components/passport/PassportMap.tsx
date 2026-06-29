import { buildPassportMap, type MapVenue } from "@/lib/passportMap";
import PassportMapInteractive from "./PassportMapInteractive";

const W = 640;
const H = 360;

export default function PassportMap({ venues, fill = false }: { venues: MapVenue[]; fill?: boolean }) {
  if (venues.length === 0) {
    return (
      <div className={`rounded-2xl border border-border bg-bg-card flex items-center justify-center text-sm text-text-muted ${fill ? "h-full" : "h-48"}`}>
        Your map fills in as you log games.
      </div>
    );
  }

  // Projection (d3-geo + world atlas) runs server-side; only the resulting path
  // and bubble coordinates cross to the interactive client component.
  const { landPath, bubbles } = buildPassportMap(venues, W, H, 28);

  return <PassportMapInteractive landPath={landPath} bubbles={bubbles} w={W} h={H} fill={fill} />;
}
