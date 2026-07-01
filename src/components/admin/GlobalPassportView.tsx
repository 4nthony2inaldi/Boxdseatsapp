import Image from "next/image";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import MiniLabel from "@/components/MiniLabel";
import SportIcon from "@/components/SportIcon";
import { initials } from "@/lib/formatters";
import PassportMap from "@/components/passport/PassportMap";
import type { GlobalPassport } from "@/lib/queries/adminPassport";

/**
 * App-wide fan passport for admins: the same visual language as a user's
 * passport (headline stats, world map, sport bars, top venues, most-seen
 * players) but aggregated across every fan. Read-only, admin-gated upstream.
 */

const SPORT_LABEL: Record<string, string> = {
  baseball: "Baseball", football: "Football", basketball: "Basketball",
  hockey: "Hockey", soccer: "Soccer", golf: "Golf", tennis: "Tennis", motorsports: "Motorsports",
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 min-w-0 text-center">
      <div className="font-display text-2xl text-text-primary tracking-wide leading-none">{value}</div>
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-1.5">{label}</div>
    </div>
  );
}

export default function GlobalPassportView({ data }: { data: GlobalPassport }) {
  const { totals, cities, sports, topVenues, topAthletes, mapVenues } = data;
  const maxSportGames = Math.max(1, ...sports.map((s) => s.games));

  return (
    <div className="max-w-lg mx-auto pb-10">
      <PageHeader title="Admin · Global Passport" backHref="/admin" />

      {/* Headline numbers */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 rounded-2xl border border-border bg-bg-card px-2 py-4">
          <Stat value={totals.fans.toLocaleString()} label="Fans" />
          <Stat value={totals.games.toLocaleString()} label="Games" />
          <Stat value={totals.venues.toLocaleString()} label="Venues" />
          <Stat value={cities.toLocaleString()} label="Cities" />
        </div>
      </div>

      {/* Map of every visited venue */}
      <div className="px-4 mt-5">
        <MiniLabel className="mb-2">Everywhere fans have been</MiniLabel>
        <PassportMap venues={mapVenues.map((v) => ({ ...v }))} />
      </div>

      {/* Sport breakdown */}
      {sports.length > 0 && (
        <div className="px-4 mt-7">
          <MiniLabel className="mb-3">By sport</MiniLabel>
          <div className="space-y-2">
            {sports.map((s) => (
              <div key={s.sport} className="flex items-center gap-3">
                <SportIcon sport={s.sport} size={18} />
                <div className="w-20 text-xs text-text-secondary">{SPORT_LABEL[s.sport] || s.sport}</div>
                <div className="flex-1 h-2.5 rounded-full bg-bg-input overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.games / maxSportGames) * 100}%`,
                      background: "linear-gradient(90deg, var(--color-accent-brown), var(--color-accent))",
                    }}
                  />
                </div>
                <div className="w-14 text-right text-xs text-text-muted">{s.games.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top venues */}
      {topVenues.length > 0 && (
        <div className="mt-7">
          <MiniLabel className="mb-3 px-4">Top venues</MiniLabel>
          <div className="flex gap-3 overflow-x-auto px-4 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
            {topVenues.map((v) => (
              <Link
                key={v.venue_id}
                href={`/venue/${v.venue_id}`}
                className="flex flex-col items-center text-center w-20 flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-elevated flex items-center justify-center">
                  {v.photo_url ? (
                    <Image src={v.photo_url} alt={v.name} width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <SportIcon sport={v.sport} size={24} />
                  )}
                </div>
                <div className="text-[11px] text-text-primary font-medium mt-1.5 leading-tight line-clamp-2">{v.name}</div>
                <div className="text-[10px] text-text-muted">{v.games.toLocaleString()} {v.games === 1 ? "game" : "games"}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Most-seen players (across all fans) */}
      {topAthletes.length > 0 && (
        <div className="mt-7">
          <MiniLabel className="mb-3 px-4">Most-seen players</MiniLabel>
          <div className="flex gap-3 overflow-x-auto px-4 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
            {topAthletes.map((p) => (
              <div key={p.id} className="flex flex-col items-center text-center w-20 flex-shrink-0">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-elevated flex items-center justify-center">
                    {p.headshot_url ? (
                      <Image src={p.headshot_url} alt={p.name} width={64} height={64} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display text-base text-text-secondary">{initials(p.name)}</span>
                    )}
                  </div>
                  <span
                    className="absolute -bottom-0.5 -right-0.5 rounded-full bg-accent text-bg text-[10px] font-display leading-none px-1.5 py-0.5"
                    aria-label={`seen ${p.seen} times`}
                  >
                    {p.seen.toLocaleString()}×
                  </span>
                </div>
                <div className="text-[11px] text-text-primary font-medium mt-1.5 leading-tight line-clamp-2">{p.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
