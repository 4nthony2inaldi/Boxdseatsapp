import Image from "next/image";
import Link from "next/link";
import SportIcon from "@/components/SportIcon";
import ShareButton from "@/components/sharing/ShareButton";
import PageHeader from "@/components/PageHeader";
import MiniLabel from "@/components/MiniLabel";
import { getSportIconPath } from "@/lib/sportIcons";
import { initials } from "@/lib/formatters";
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
          <circle cx="39" cy="39" r={R} fill="none" stroke="var(--color-border)" strokeWidth="6" />
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

function Stat({ value, label, href }: { value: string; label: string; href?: string }) {
  const inner = (
    <>
      <div className="font-display text-2xl text-text-primary tracking-wide leading-none">{value}</div>
      <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-1.5">{label}</div>
    </>
  );
  return href ? (
    <Link href={href} className="flex-1 min-w-0 text-center hover:opacity-80 transition-opacity">{inner}</Link>
  ) : (
    <div className="flex-1 min-w-0 text-center">{inner}</div>
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
  const { stats, venues, topVenues, rings, sports, players, playersTotal, leaderboards, hidden, teams } = data;
  const show = (k: string) => !hidden.includes(k);
  const maxSportGames = Math.max(1, ...sports.map((s) => s.games));
  const name = displayName || `@${username}`;

  return (
    <div className="max-w-lg mx-auto pb-10">
      <PageHeader
        title="Fan Passport"
        backHref={backHref}
        right={editHref ? <Link href={editHref} className="text-xs text-accent hover:opacity-80">Edit</Link> : undefined}
      />

      {/* Identity */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-bg-elevated flex items-center justify-center">
          {avatarUrl ? (
            <Image src={avatarUrl} alt={name} width={48} height={48} className="w-full h-full object-cover" />
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
          <Stat value={String(stats.games)} label="Games" href={`/user/${username}/timeline`} />
          <Stat value={String(stats.venues)} label="Venues" href={`/user/${username}/venues`} />
          <Stat value={String(stats.cities)} label="Cities" />
          <Stat value={stats.winPct !== null ? `${stats.winPct}%` : "—"} label="Fan Win%" />
        </div>
      </div>

      {/* Teams — show all the user roots for; scroll horizontally past what fits */}
      {teams.length > 0 && (
        <div className="mt-5">
          <MiniLabel className="mb-2 px-4">Teams</MiniLabel>
          <div className="flex gap-3 overflow-x-auto px-4 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
            {teams.map((t) => (
              <Link
                key={t.id}
                href={`/team/${t.id}`}
                className="relative flex-shrink-0 hover:opacity-80 transition-opacity"
                title={t.name}
              >
                <div className="w-14 h-14 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden">
                  {t.logo_url ? (
                    <Image src={t.logo_url} alt={t.name} width={44} height={44} className="object-contain" />
                  ) : (
                    <span className="text-text-secondary text-xs font-semibold">{t.name.slice(0, 3).toUpperCase()}</span>
                  )}
                </div>
                {/* Sport badge — tells apart same-school picks that share a logo
                    (e.g. Pitt football vs Pitt basketball). */}
                {t.sport && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-bg flex items-center justify-center ring-2 ring-bg">
                    <SportIcon sport={t.sport} size={12} />
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Map */}
      {show("map") && (
      <div className="px-4 mt-5">
        <MiniLabel className="mb-2">Where you&apos;ve been</MiniLabel>
        <PassportMap venues={venues} />
      </div>
      )}

      {/* Bucketlist rings */}
      {show("rings") && rings.length > 0 && (
        <div className="px-4 mt-6">
          <MiniLabel className="mb-3">Bucket List</MiniLabel>
          <div className="grid grid-cols-3 gap-y-4 gap-x-2">
            {rings.map((r) => (
              <Link key={r.list_id} href={`/lists/${r.list_id}`} className="block hover:opacity-80 transition-opacity">
                <Ring ring={r} />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top venues */}
      {show("topVenues") && topVenues.length > 0 && (
        <div className="mt-7">
          <MiniLabel className="mb-3 px-4">Top venues</MiniLabel>
          <div className="flex gap-3 overflow-x-auto px-4 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
            {topVenues.map((v) => (
              <Link key={v.venue_id} href={`/venue/${v.venue_id}`} className="flex flex-col items-center text-center w-20 flex-shrink-0 hover:opacity-80 transition-opacity">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-bg-elevated flex items-center justify-center">
                  {v.photo_url ? (
                    <Image src={v.photo_url} alt={v.name} width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <SportIcon sport={v.sport} size={24} />
                  )}
                </div>
                <div className="text-[11px] text-text-primary font-medium mt-1.5 leading-tight line-clamp-2">{v.name}</div>
                <div className="text-[10px] text-text-muted">{v.games} {v.games === 1 ? "game" : "games"}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Sport breakdown */}
      {show("sports") && sports.length > 0 && (
        <div className="px-4 mt-7">
          <MiniLabel className="mb-3">By sport</MiniLabel>
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

      {/* Players you've seen */}
      {show("players") && players.length > 0 && (
        <div className="mt-7">
          <div className="flex items-baseline gap-2 mb-3 px-4">
            <MiniLabel>Players you&apos;ve seen</MiniLabel>
            <div className="text-[10px] text-text-muted">{playersTotal.toLocaleString()} total</div>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
            {players.map((p) => (
              <Link
                key={p.id}
                href={`/u/${username}/athlete/${p.id}`}
                className="flex flex-col items-center text-center w-20 flex-shrink-0 hover:opacity-80 transition-opacity"
              >
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
                    aria-label={`seen ${p.count} ${p.count === 1 ? "time" : "times"}`}
                  >
                    {p.count}×
                  </span>
                </div>
                <div className="text-[11px] text-text-primary font-medium mt-1.5 leading-tight line-clamp-2">{p.name}</div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboards: the best stat performances you've witnessed, per sport. */}
      {show("leaderboards") && leaderboards.length > 0 && (
        <div className="mt-7">
          {leaderboards.map((lb) => {
            const icon = getSportIconPath(lb.sport);
            return (
              <div key={lb.sport} className="mt-5 first:mt-0">
                <div className="flex items-center gap-1.5 mb-3 px-4">
                  {icon ? <SportIcon src={icon} size={14} /> : null}
                  <MiniLabel>{SPORT_LABEL[lb.sport] || lb.sport}</MiniLabel>
                </div>
                <div className="space-y-4">
                  {lb.stats.map((row) => (
                    <div key={row.key}>
                      <div className="text-[11px] text-text-secondary mb-2 px-4">{row.label}</div>
                      <div className="flex gap-3 overflow-x-auto px-4 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
                        {row.players.map((p) => (
                          <Link
                            key={p.id}
                            href={`/u/${username}/athlete/${p.id}`}
                            className="flex flex-col items-center text-center w-20 flex-shrink-0 hover:opacity-80 transition-opacity"
                          >
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
                                aria-label={`${p.value} ${row.short}`}
                              >
                                {p.value} {row.short}
                              </span>
                            </div>
                            <div className="text-[11px] text-text-primary font-medium mt-1.5 leading-tight line-clamp-2">{p.name}</div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
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
