import type { Metadata } from "next";
import MiniLabel from "@/components/MiniLabel";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchAthleteForUser } from "@/lib/queries/athlete";
import SectionLabel from "@/components/profile/SectionLabel";
import OutcomeBadge from "@/components/profile/OutcomeBadge";
import StarRating from "@/components/profile/StarRating";
import SportIcon from "@/components/SportIcon";
import PassportMap from "@/components/passport/PassportMap";
import { formatStatLine, aggregatePlayerStats, type StatLine } from "@/lib/statLine";
import { formatDate } from "@/lib/formatters";

type Props = { params: Promise<{ username: string; id: string }> };

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username, id } = await params;
  const supabase = await createClient();
  const { data: ath } = await supabase.from("athletes").select("name").eq("id", id).maybeSingle();
  const name = ath?.name || "Player";
  return {
    title: `${name} — seen by @${username} | BoxdSeats`,
    robots: { index: false, follow: false },
  };
}

export default async function UserAthletePage({ params }: Props) {
  const { username, id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, is_private")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 text-center">
        <p className="text-text-muted text-sm">Profile not found.</p>
      </div>
    );
  }

  const isOwner = user?.id === profile.id;

  // Mirror the passport's privacy gate: private profiles are visible only to the
  // owner and active followers.
  if (profile.is_private && !isOwner) {
    let following = false;
    if (user) {
      const { data: rel } = await supabase
        .from("follows")
        .select("status")
        .eq("follower_id", user.id)
        .eq("following_id", profile.id)
        .maybeSingle();
      following = rel?.status === "active";
    }
    if (!following) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center px-4 text-center">
          <p className="text-text-muted text-sm">This passport is private.</p>
        </div>
      );
    }
  }

  const athlete = await fetchAthleteForUser(supabase, profile.id, id);
  if (!athlete) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 text-center">
        <p className="text-text-muted text-sm">Player not found.</p>
      </div>
    );
  }

  const who = isOwner ? "You" : profile.display_name || `@${profile.username}`;
  const teamTotal = athlete.teams.reduce((s, t) => s + t.count, 0);
  const venueWord = athlete.mapVenues.length === 1 ? "venue" : "venues";
  const aggStats = aggregatePlayerStats(
    athlete.sport,
    athlete.games.map((g) => g.statLine).filter((s): s is StatLine => !!s),
  );

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-lg mx-auto px-4 pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 py-3">
          <Link href={`/u/${username}/passport`} className="p-1 -ml-1 hover:opacity-80 transition-opacity" aria-label="Back to passport">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <span className="text-xs text-text-muted">{who === "You" ? "Your passport" : `${who}'s passport`}</span>
        </div>

        {/* Identity on the left, a map of where you saw them on the right. */}
        <div className="flex gap-4 pt-2 pb-1">
          <div className="w-[40%] shrink-0 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-bg-elevated flex items-center justify-center">
              {athlete.headshotUrl ? (
                <Image src={athlete.headshotUrl} alt={athlete.name} width={80} height={80} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-2xl text-text-secondary">{initials(athlete.name)}</span>
              )}
            </div>
            <h1 className="font-display text-xl text-text-primary tracking-wide mt-2.5 leading-tight">{athlete.name}</h1>
            {athlete.sport && (
              <div className="flex items-center gap-1.5 mt-1">
                {athlete.icon && <SportIcon src={athlete.icon} size={14} />}
                <span className="text-xs text-text-secondary capitalize">{athlete.sport}</span>
              </div>
            )}
            <div className="mt-4">
              <div className="font-display text-3xl text-text-primary tracking-wide leading-none">{athlete.seenCount}</div>
              <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-1.5">
                {athlete.seenCount === 1 ? "Time seen" : "Times seen"}
              </div>
            </div>
            {athlete.isIndividual && athlete.bestFinish != null && (
              <div className="mt-3 text-xs text-text-muted">
                Best finish <span className="text-text-secondary">{ordinal(athlete.bestFinish)}</span>
                {athlete.victories > 0 && <> · {athlete.victories} {athlete.victories === 1 ? "win" : "wins"} seen</>}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0 flex flex-col">
            <MiniLabel className="mb-2">{isOwner ? "Where you saw" : "Where seen"}</MiniLabel>
            {athlete.mapVenues.length > 0 ? (
              <>
                <div className="flex-1 min-h-0">
                  <PassportMap venues={athlete.mapVenues} fill />
                </div>
                <div className="text-[10px] text-text-muted mt-1.5">
                  {athlete.mapVenues.length} {venueWord}
                </div>
              </>
            ) : (
              <div className="flex-1 min-h-0 rounded-2xl border border-border bg-bg-card flex items-center justify-center text-center px-4 text-xs text-text-muted">
                No mapped venues for these games yet.
              </div>
            )}
          </div>
        </div>

        {/* Aggregate stat line across the games you saw them in. */}
        {aggStats.length > 0 && (
          <div className="mt-6">
            <MiniLabel className="mb-2">{isOwner ? "In games you saw" : "In these games"}</MiniLabel>
            <div className="flex gap-2 rounded-2xl border border-border bg-bg-card px-2 py-4">
              {aggStats.map((s) => (
                <div key={s.label} className="flex-1 min-w-0 text-center">
                  <div className="font-display text-xl text-text-primary tracking-wide leading-none">{s.value}</div>
                  <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-1.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team split — the teams the athlete was on across the games you saw,
            by share of those games (just the team name when it's always one). */}
        {teamTotal > 0 && athlete.teams.length > 0 && (
          <div className="mt-7">
            <SectionLabel>Seen with</SectionLabel>
            <div className="space-y-2.5">
              {athlete.teams.map((t) => {
                const pct = Math.round((t.count / teamTotal) * 100);
                return (
                  <Link
                    key={t.id}
                    href={`/team/${t.id}`}
                    className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-7 h-7 rounded-full bg-bg-elevated flex items-center justify-center overflow-hidden shrink-0">
                      {t.logoUrl ? (
                        <Image src={t.logoUrl} alt={t.name} width={24} height={24} className="object-contain" />
                      ) : (
                        <span className="text-[9px] font-semibold text-text-secondary">{(t.name || "?").slice(0, 3).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="w-24 text-xs text-text-secondary truncate">{t.name || "Unknown"}</div>
                    <div className="flex-1 h-2.5 rounded-full bg-bg-input overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--color-accent-brown), var(--color-accent))" }}
                      />
                    </div>
                    <div className="w-16 text-right text-xs text-text-muted tabular-nums">
                      {t.count} · {pct}%
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Games */}
        <div className="mt-7">
          <SectionLabel>{isOwner ? "Games you saw them in" : "Games seen in"}</SectionLabel>
          <div className="space-y-2">
            {athlete.games.map((g) => {
              const hasScore = g.homeScore != null && g.awayScore != null;
              const isMatch = g.template === "match" || (!!g.homeAbbr && !!g.awayAbbr);
              const stat = formatStatLine(g.sport, g.statLine);
              return (
                <Link
                  key={g.eventId}
                  href={`/event/${g.eventId}`}
                  className="block bg-bg-card rounded-xl border border-border px-4 py-3 hover:bg-bg-elevated/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <SportIcon src={g.icon} size={20} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-text-primary font-medium truncate">
                        {isMatch ? (
                          hasScore
                            ? `${g.awayAbbr} ${g.awayScore} – ${g.homeAbbr} ${g.homeScore}`
                            : `${g.awayAbbr} @ ${g.homeAbbr}`
                        ) : (
                          g.tournamentName || g.leagueName || "Event"
                        )}
                      </div>
                      <div className="text-[11px] text-text-muted truncate">
                        {formatDate(g.eventDate)}
                        {g.venueName ? ` · ${g.venueName}` : ""}
                        {g.city ? `, ${g.city}` : ""}
                      </div>
                      {stat && (
                        <div className="text-[11px] text-accent font-medium mt-0.5 truncate">{stat}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {athlete.isIndividual && g.finishPosition != null && (
                        <span className={`font-display text-[11px] tracking-wider ${g.finishPosition === 1 ? "text-accent" : "text-text-muted"}`}>
                          {ordinal(g.finishPosition)}
                        </span>
                      )}
                      {g.userRating ? <StarRating rating={g.userRating} size={11} /> : null}
                      <OutcomeBadge outcome={g.userOutcome} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
