"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/native/photoScan";

function Chevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

function Row({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 active:opacity-70 transition-opacity">
      {icon}
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-primary font-medium">{title}</div>
        <div className="text-xs text-text-muted">{sub}</div>
      </div>
      <Chevron />
    </Link>
  );
}

/**
 * Timeline nudge to round out logged games: add photos (native-only, needs the
 * on-device scan) and set a rooting side (any platform — fills win/loss into the
 * fan record). One card so the two prompts don't stack as competing banners.
 */
export default function FinishGamesCard({
  photolessCount,
  rootlessCount,
}: {
  photolessCount: number;
  rootlessCount: number;
}) {
  const [native, setNative] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (isNativeApp()) setNative(true);
  }, []);

  const showPhotos = native && photolessCount > 0;
  const showRooting = rootlessCount > 0;
  if (!showPhotos && !showRooting) return null;

  return (
    <div className="mx-4 mb-4 rounded-xl border border-accent/30 bg-accent/[0.06] overflow-hidden divide-y divide-accent/15">
      <div className="px-4 pt-3 pb-2 font-display text-[11px] tracking-[1.5px] uppercase text-accent/80">
        Finish your games
      </div>
      {showRooting && (
        <Row
          href="/log/rooting"
          icon={<FlagIcon />}
          title="Set who you rooted for"
          sub={`${rootlessCount} ${rootlessCount === 1 ? "game has" : "games have"} no team — pick a side to fill in your record.`}
        />
      )}
      {showPhotos && (
        <Row
          href="/log/backfill"
          icon={<PhotoIcon />}
          title="Add photos to your games"
          sub={`${photolessCount} ${photolessCount === 1 ? "game has" : "games have"} no photo — match them from your camera roll.`}
        />
      )}
    </div>
  );
}
