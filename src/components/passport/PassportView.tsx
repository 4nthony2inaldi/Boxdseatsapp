import Image from "next/image";
import Link from "next/link";
import SportIcon from "@/components/SportIcon";
import ShareButton from "@/components/sharing/ShareButton";
import type { PassportData, PassportRing } from "@/lib/queries/passport";
import PassportMap from "./PassportMap";

const SPORT_LABEL: Record<string, string> = {
  baseball: "Baseball", football: "Football", basketball: "Basketball",
  hockey: "Hockey", soccer: "Soccer", golf: "Golf", tennis: "Tennis", motorsports: "Motorsports",
};

function Ring({ ring }: { ring: PassportRing }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  const pct = ring.total > 0 ? Math.min(1, ring.visited / ring.total) : 0;
  const done = ring.total > 0 && ring.visited >= ring.total;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative">
        <svg width="78" height="78" viewBox="0 0 78 78">
          <circle cx="39" cy="39" r={R} fill="none" stroke="#2A2D3A" strokeWidth="6" />
          <circle
            cx="39" cy="39" r={R} fill="none"
            stroke={done ? "#D4872C" : "#3CB878"} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
            transform="rotate(-90 39 39)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {ring.icon ? <SportIcon src={ring.icon} size={16} /> : null}
          <span className="text-[13px] font-display text-text-primary leading-none mt-0.5">
            {ring.visited}/{ring.total}
          </span>
        </div>
      </div>
      <div className="text-[11px] text-text-secondary mt-1.5 leading-tight max-w-[90px]">{ring.name}</div>
    </div>
  );
}

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="text-center flex-1 min-w-0">
      <div className="font-display text-2xl text-text-primary tracking-wide leading-none">{value}</div>
      {sub && <div className="text-[10px] text-accent mt-0.5">{sub}</div>}
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-1">{label}</div>
    </div>
  );
}

type Props = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  data: PassportData;
  editHref?: string;
  backHref: string;
};

export default function PassportView({ username, displayName, avatarUrl, data, editHref, backHref }: Props) {
  const { stats, venues, topVenues, rings, sports } = data;
  const maxSportGames = Math.max(1, ...sports.map((s) => s.games));
  const name = displayName || `@${username}`;

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <Link href={backHref} className="p-1 hover:opacity-80 transition-opacity">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <h1 className="font-display text-lg text-text-primary tracking-wide">Fan Passport</h1>
        {editHref && (
          <Link href={editHref} className="ml-auto text-xs text-accent hover:opacity-80">Edit</Link>
        )}
      </div>

      {/* Identity */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-bg-elevated flex items-center justify-center">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" width={48} height={48} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-lg text-accent">{name.charAt(name.startsWith("@") ? 1 : 0).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0">
          <div className="text-text-primary font-semibold truncate">{name}</div>
          <div className="text-xs text-text-muted">@{username}</div>
        </div>
      </div>

      {/* Big numbers */}
      <div className="px-4">
        <div className="flex gap-2 rounded-2xl border border-border bg-bg-card px-2 py-4">
          <Stat value={String(stats.games)} label="Games" />
          <Stat value={String(stats.venues)} label="Venues" />
          <Stat value={String(stats.cities)} label="Cities" />
          <Stat
            value={stats.winPct !== null ? `${stats.winPct}%` : "—"}
            sub={stats.wins + stats.losses > 0 ? `${stats.wins}–${stats.losses}` : undefined}
            label="Fan Win%"
          />
        </div>
      </div>

      {/* Map */}
      <div className="px-4 mt-5">
        <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-2">Where you&apos;ve been</div>
        <PassportMap venues={venues} />
      </div>

      {/* Bucketlist rings */}
      {rings.length > 0 && (
        <div className="px-4 mt-6">
          <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-3">Bucket List</div>
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            {rings.map((r) => <Ring key={r.list_id} ring={r} />)}
          </div>
        </div>
      )}

      {/* Top venues */}
      {topVenues.length > 0 && (
        <div className="mt-7">
          <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-3 px-4">Top venues</div>
          <div className="flex gap-3 overflow-x-auto px-4 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
            {topVenues.map((v) => (
              <div key={v.venue_id} className="flex flex-col items-center text-center w-20 flex-shrink-0">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-elevated flex items-center justify-center">
                  {v.photo_url ? (
                    <Image src={v.photo_url} alt="" width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <SportIcon sport={v.sport} size={24} />
                  )}
                </div>
                <div className="text-[11px] text-text-primary font-medium mt-1.5 leading-tight line-clamp-2">{v.name}</div>
                <div className="text-[10px] text-text-muted">{v.games} {v.games === 1 ? "game" : "games"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sport breakdown */}
      {sports.length > 0 && (
        <div className="px-4 mt-7">
          <div className="font-display text-[11px] text-text-muted tracking-[1.5px] uppercase mb-3">By sport</div>
          <div className="space-y-2">
            {sports.map((s) => (
              <div key={s.sport} className="flex items-center gap-3">
                <SportIcon sport={s.sport} size={18} />
                <div className="w-20 text-xs text-text-secondary">{SPORT_LABEL[s.sport] || s.sport}</div>
                <div className="flex-1 h-2.5 rounded-full bg-bg-input overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(s.games / maxSportGames) * 100}%`, background: "linear-gradient(90deg, var(--color-accent-brown), var(--color-accent))" }} />
                </div>
                <div className="w-10 text-right text-xs text-text-muted">{s.games}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share */}
      <div className="px-4 mt-8">
        <ShareButton
          url={`https://boxdseats.com/@${username}/passport`}
          title={`${name}'s Fan Passport on BoxdSeats`}
          text={`${stats.games} games · ${stats.venues} venues · ${stats.cities} cities`}
        />
      </div>
    </div>
  );
}
