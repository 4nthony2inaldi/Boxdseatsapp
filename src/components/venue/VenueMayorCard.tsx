import Image from "next/image";
import Link from "next/link";
import type { VenueMayor } from "@/lib/queries/venue";

/**
 * The venue "mayor" — a Foursquare-style card crowning the single public fan
 * with the most logged games at this venue. Taps through to their profile. If
 * the viewer is ranked here too, a small line shows their standing (and calls
 * out when the viewer is the one wearing the crown).
 */

function Crown({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 8l3.5 3L12 4l5.5 7L21 8l-1.5 10h-15L3 8zm2.2 12h13.6a1 1 0 0 1 0 2H5.2a1 1 0 0 1 0-2z" />
    </svg>
  );
}

export default function VenueMayorCard({ data }: { data: VenueMayor }) {
  const { mayor, runnerUp, me } = data;
  if (!mayor) return null;

  const name = mayor.display_name || `@${mayor.username}`;
  const viewerIsMayor = me != null && me.rank === 1;
  const runnerUpName = runnerUp ? runnerUp.display_name || `@${runnerUp.username}` : null;

  return (
    <Link
      href={`/user/${mayor.username}`}
      className="block rounded-xl border border-accent/40 bg-gradient-to-br from-accent/15 to-bg-card px-4 py-3.5 active:opacity-80 transition-opacity"
    >
      <div className="flex items-center gap-1.5 mb-2.5 text-accent">
        <Crown />
        <span className="font-display text-[11px] uppercase tracking-[1.5px]">Mayor</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-accent/50">
          {mayor.avatar_url ? (
            <Image
              src={mayor.avatar_url}
              alt={name}
              width={44}
              height={44}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-accent text-base font-display bg-accent/20">
              {name.charAt(name.startsWith("@") ? 1 : 0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-text-primary font-medium truncate">{name}</div>
          <div className="text-xs text-text-muted truncate">@{mayor.username}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-display text-xl text-text-primary tabular-nums leading-none">
            {mayor.games.toLocaleString()}
          </div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wider mt-0.5">
            {mayor.games === 1 ? "Visit" : "Visits"}
          </div>
        </div>
      </div>
      {(runnerUpName || me != null) && (
        <div className="mt-2.5 pt-2.5 border-t border-border space-y-1 text-[11px] text-text-muted">
          {runnerUpName && (
            <div className="truncate">
              Next: {runnerUpName} · {runnerUp!.games.toLocaleString()} {runnerUp!.games === 1 ? "visit" : "visits"}
            </div>
          )}
          {me != null && (
            <div>
              {viewerIsMayor
                ? "You hold the crown here."
                : `You're #${me.rank} here with ${me.games.toLocaleString()} ${me.games === 1 ? "visit" : "visits"}.`}
            </div>
          )}
        </div>
      )}
    </Link>
  );
}
