import Image from "next/image";
import Link from "next/link";
import SportIcon from "@/components/SportIcon";
import type { ComparisonData, CompareGame, CompareVenue } from "@/lib/queries/compare";
import TagTogetherButton from "./TagTogetherButton";
import PageHeader from "@/components/PageHeader";
import MiniLabel from "@/components/MiniLabel";
import { formatShortDate } from "@/lib/formatters";

type Person = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

type Props = {
  me: Person;
  them: Person;
  data: ComparisonData;
  backHref: string;
};

function Avatar({ person, size = 40 }: { person: Person; size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0 bg-bg-elevated flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      {person.avatarUrl ? (
        <Image src={person.avatarUrl} alt={person.displayName} width={size} height={size} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display text-accent" style={{ fontSize: size * 0.42 }}>
          {person.displayName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <MiniLabel className="mb-2">{children}</MiniLabel>;
}

function GameRow({ game, themName, themId }: { game: CompareGame; themName: string; themId?: string }) {
  const dateStr = formatShortDate(game.date);
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <SportIcon sport={game.sport} size={18} />
      <div className="min-w-0 flex-1">
        <div className="text-sm text-text-primary font-medium truncate">{game.title}</div>
        <div className="text-[11px] text-text-muted truncate">
          {game.venueName ? `${game.venueName} · ` : ""}{dateStr}
        </div>
      </div>
      {game.kind === "both_there" && game.myLogId && themId ? (
        <TagTogetherButton myLogId={game.myLogId} targetUserId={themId} targetDisplayName={themName} />
      ) : null}
    </div>
  );
}

function VenueChips({ venues }: { venues: CompareVenue[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 scroll-fade-x" style={{ scrollbarWidth: "none" }}>
      {venues.map((v) => (
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
          <div className="text-[10px] text-text-muted">{v.city}</div>
        </Link>
      ))}
    </div>
  );
}

export default function CompareView({ me, them, data, backHref }: Props) {
  const { together, venues, fandom, stats } = data;
  const firstName = (n: string) => n.split(" ")[0];
  const themFirst = firstName(them.displayName);
  const meFirst = firstName(me.displayName);

  const hasTogether = together.logged.length > 0 || together.bothThere.length > 0;
  const hasFandom =
    fandom.sharedTeams.length > 0 || fandom.rivalries.length > 0 || fandom.sharedAthletes.length > 0 || !!fandom.sharedSport;

  return (
    <div className="max-w-lg mx-auto pb-12">
      <PageHeader title={`You & ${themFirst}`} backHref={backHref} />

      {/* Identity strip */}
      <div className="flex items-center justify-center gap-4 px-4 pt-5 pb-4">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar person={me} size={56} />
          <span className="text-xs text-text-secondary">You</span>
        </div>
        <span className="font-display text-text-muted text-sm">&amp;</span>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar person={them} size={56} />
          <span className="text-xs text-text-secondary truncate max-w-[100px]">{themFirst}</span>
        </div>
      </div>

      {/* Section 1 — Games together (keystone) */}
      <div className="px-4 mt-2">
        <SectionLabel>Games you&apos;ve been to together</SectionLabel>
        {together.logged.length > 0 && (
          <div className="rounded-xl border border-border bg-bg-card divide-y divide-border overflow-hidden">
            {together.logged.map((g) => (
              <GameRow key={g.key} game={g} themName={them.displayName} />
            ))}
          </div>
        )}

        {together.bothThere.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-text-secondary mb-2">
              You were both at {together.bothThere.length === 1 ? "this game" : "these games"} — tag each other to link them.
            </div>
            <div className="rounded-xl border border-accent/25 bg-accent/[0.04] divide-y divide-border overflow-hidden">
              {together.bothThere.map((g) => (
                <GameRow key={g.key} game={g} themName={them.displayName} themId={them.id} />
              ))}
            </div>
          </div>
        )}

        {!hasTogether && (
          <div className="rounded-xl border border-border bg-bg-card px-4 py-6 text-center">
            <p className="text-sm text-text-muted">No shared games yet.</p>
            <p className="text-xs text-text-muted mt-1">Tag {themFirst} when you log a game you attended together.</p>
          </div>
        )}
      </div>

      {/* Section 2 — Venue Venn */}
      <div className="px-4 mt-7">
        <SectionLabel>Venues</SectionLabel>
        <div className="flex gap-2 rounded-2xl border border-border bg-bg-card px-2 py-3 mb-4">
          <div className="flex-1 text-center">
            <div className="font-display text-2xl text-win leading-none">{venues.both.length}</div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-1.5">Both</div>
          </div>
          <div className="flex-1 text-center">
            <div className="font-display text-2xl text-text-primary leading-none">{venues.onlyMine.length}</div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-1.5">Only you</div>
          </div>
          <div className="flex-1 text-center">
            <div className="font-display text-2xl text-text-primary leading-none">{venues.onlyTheirs.length}</div>
            <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-1.5">Only {themFirst}</div>
          </div>
        </div>

        {venues.both.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-text-secondary mb-2">You&apos;ve both been here</div>
            <VenueChips venues={venues.both} />
          </div>
        )}
        {venues.onlyTheirs.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-text-secondary mb-2">{themFirst} has been, you haven&apos;t</div>
            <VenueChips venues={venues.onlyTheirs} />
          </div>
        )}
        {venues.onlyMine.length > 0 && (
          <div className="mb-1">
            <div className="text-xs text-text-secondary mb-2">Bragging rights — you have, {themFirst} hasn&apos;t</div>
            <VenueChips venues={venues.onlyMine} />
          </div>
        )}
      </div>

      {/* Section 3 — Fandom */}
      {hasFandom && (
        <div className="px-4 mt-7">
          <SectionLabel>Fandom</SectionLabel>

          {fandom.sharedTeams.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-text-secondary mb-2">Teams you both root for</div>
              <div className="flex flex-wrap gap-2">
                {fandom.sharedTeams.map((t) => (
                  <Link key={t.id} href={`/team/${t.id}`} className="flex items-center gap-2 rounded-full border border-border bg-bg-card pl-1.5 pr-3 py-1 hover:opacity-80 transition-opacity">
                    <span className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden">
                      {t.logo_url ? (
                        <Image src={t.logo_url} alt="" width={24} height={24} className="object-contain" />
                      ) : (
                        <span className="text-[9px] text-text-secondary font-semibold">{t.name.slice(0, 3).toUpperCase()}</span>
                      )}
                    </span>
                    <span className="text-xs text-text-primary font-medium">{t.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {fandom.rivalries.map((r, i) => (
            <div key={i} className="mb-3 rounded-xl border border-border bg-bg-card px-3 py-3">
              <div className="text-[10px] text-text-muted uppercase tracking-wider mb-2">{r.league} · a house divided</div>
              <div className="flex items-center justify-between">
                <Link href={`/team/${r.mine.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80">
                  <span className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                    {r.mine.logo_url ? <Image src={r.mine.logo_url} alt="" width={26} height={26} className="object-contain" /> : <span className="text-[9px] text-text-secondary font-semibold">{r.mine.name.slice(0, 3).toUpperCase()}</span>}
                  </span>
                  <span className="text-sm text-text-primary font-medium truncate">{r.mine.name}</span>
                </Link>
                <span className="font-display text-xs text-accent px-2 flex-shrink-0">VS</span>
                <Link href={`/team/${r.theirs.id}`} className="flex items-center gap-2 min-w-0 justify-end hover:opacity-80">
                  <span className="text-sm text-text-primary font-medium truncate">{r.theirs.name}</span>
                  <span className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden flex-shrink-0">
                    {r.theirs.logo_url ? <Image src={r.theirs.logo_url} alt="" width={26} height={26} className="object-contain" /> : <span className="text-[9px] text-text-secondary font-semibold">{r.theirs.name.slice(0, 3).toUpperCase()}</span>}
                  </span>
                </Link>
              </div>
            </div>
          ))}

          {fandom.sharedAthletes.length > 0 && (
            <div className="mb-2 mt-1">
              <div className="text-xs text-text-secondary mb-2">Athletes you both follow</div>
              <div className="flex flex-wrap gap-2">
                {fandom.sharedAthletes.map((a) => (
                  <span key={a.id} className="flex items-center gap-2 rounded-full border border-border bg-bg-card pl-1.5 pr-3 py-1">
                    <span className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden">
                      {a.headshot_url ? <Image src={a.headshot_url} alt={a.name} width={28} height={28} className="object-cover w-full h-full" /> : null}
                    </span>
                    <span className="text-xs text-text-primary font-medium">{a.name}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {fandom.sharedSport && (
            <div className="text-xs text-text-secondary flex items-center gap-2 mt-1">
              <SportIcon sport={fandom.sharedSport} size={16} />
              You&apos;re both {fandom.sharedSport} fans first.
            </div>
          )}
        </div>
      )}

      {/* Section 4 — Tale of the tape */}
      <div className="px-4 mt-7">
        <SectionLabel>Tale of the tape</SectionLabel>
        <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
          <div className="flex items-center px-4 py-2 border-b border-border">
            <span className="flex-1 text-right text-xs text-text-secondary font-medium">{meFirst}</span>
            <span className="w-24 text-center text-[10px] text-text-muted uppercase tracking-wider" />
            <span className="flex-1 text-left text-xs text-text-secondary font-medium">{themFirst}</span>
          </div>
          {stats.map((s) => (
            <div key={s.label} className="flex items-center px-4 py-2.5 border-b border-border last:border-b-0">
              <span className={`flex-1 text-right font-display text-lg ${s.leader === "mine" ? "text-accent" : "text-text-primary"}`}>{s.mine}</span>
              <span className="w-24 text-center text-[10px] text-text-muted uppercase tracking-wider">{s.label}</span>
              <span className={`flex-1 text-left font-display text-lg ${s.leader === "theirs" ? "text-accent" : "text-text-primary"}`}>{s.theirs}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
