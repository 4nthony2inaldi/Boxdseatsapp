"use client";

/* eslint-disable @next/next/no-img-element -- remote headshots with graceful onError fallback */
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { fetchRememberGuys, type RememberGuy, type RememberGuysResult } from "@/lib/queries/rememberGuys";

type Props = {
  userId: string;
  username: string;
  initial: RememberGuysResult;
};

// Rolling memory of recently-shown athlete ids (~3 pulls of 12) so a reshuffle
// pulls fresh faces. Seeded from the initial server batch, persisted per tab.
const MEMORY_CAP = 30;
const MEMORY_KEY = "rememberSomeGuys.seen";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function GuyCard({ guy, username, personal }: { guy: RememberGuy; username: string; personal: boolean }) {
  const [imgFailed, setImgFailed] = useState(false);
  // The athlete page is user-scoped ("seen by @username"): for an athlete the
  // user hasn't seen it renders an empty "0 times seen" page. Personal-mode
  // faces are athletes the user has actually seen, so they link there;
  // system/cold-start faces stay non-tappable (a plain div).
  const inner = (
    <>
      <div className="relative">
        <div className="w-14 h-14 rounded-full overflow-hidden bg-bg-elevated flex items-center justify-center">
          {guy.headshotUrl && !imgFailed ? (
            <img
              src={guy.headshotUrl}
              alt={guy.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="font-display text-sm text-text-secondary">{initials(guy.name)}</span>
          )}
        </div>
        {personal && guy.seenCount != null && (
          <span
            className="absolute -bottom-0.5 -right-0.5 rounded-full bg-accent text-bg text-[10px] font-display leading-none px-1.5 py-0.5"
            aria-label={`seen ${guy.seenCount} ${guy.seenCount === 1 ? "time" : "times"}`}
          >
            {guy.seenCount}×
          </span>
        )}
      </div>
      <div className="text-[10px] text-text-primary font-medium mt-1 leading-tight truncate w-full">
        {guy.name}
      </div>
    </>
  );

  if (!personal) {
    return <div className="flex flex-col items-center text-center w-[64px] shrink-0">{inner}</div>;
  }
  return (
    <Link
      href={`/u/${username}/athlete/${guy.id}`}
      className="flex flex-col items-center text-center w-[64px] shrink-0 active:opacity-80 transition-opacity"
    >
      {inner}
    </Link>
  );
}

export default function RememberSomeGuys({ userId, username, initial }: Props) {
  const [result, setResult] = useState<RememberGuysResult>(initial);
  const [shuffling, setShuffling] = useState(false);

  // Seed the rolling memory with the server batch so the first shuffle excludes
  // the faces already on screen.
  useEffect(() => {
    rememberIds(initial.guys.map((g) => g.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from the initial batch
  }, []);

  function loadMemory(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.sessionStorage.getItem(MEMORY_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  }

  function rememberIds(ids: string[]) {
    if (typeof window === "undefined") return;
    const next = [...loadMemory(), ...ids].slice(-MEMORY_CAP);
    try {
      window.sessionStorage.setItem(MEMORY_KEY, JSON.stringify(next));
    } catch {
      // sessionStorage can be unavailable (private mode); shuffle still works.
    }
  }

  async function shuffle() {
    if (shuffling) return;
    setShuffling(true);
    try {
      const exclude = loadMemory();
      const next = await fetchRememberGuys(createClient(), userId, exclude);
      if (next.guys.length > 0) {
        setResult(next);
        rememberIds(next.guys.map((g) => g.id));
      }
    } finally {
      setShuffling(false);
    }
  }

  const { mode, guys } = result;
  if (guys.length === 0) return null;

  return (
    // Sit just under the AppHeader (sticky top-0 z-50, ~60px tall + safe-area
    // inset). Below the header's z-50, with the same translucent/blur treatment
    // so feed content doesn't show through when pinned.
    <div
      className="sticky z-30 bg-bg/95 backdrop-blur-sm pt-2 pb-3 mb-3"
      style={{ top: "calc(env(safe-area-inset-top) + 60px)" }}
    >
      <div className="px-4 flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-display text-[13px] text-text-muted tracking-[2px] uppercase">
            Remember Some Guys
          </span>
          <button
            onClick={shuffle}
            disabled={shuffling}
            aria-label="Shuffle"
            className="p-1 -m-1 bg-transparent border-none cursor-pointer text-accent disabled:opacity-50"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={shuffling ? "animate-spin" : ""}
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
        {mode === "personal" && (
          <Link href={`/u/${username}/passport`} className="text-[11px] text-text-muted active:opacity-80">
            your passport →
          </Link>
        )}
      </div>

      <div
        className="pl-4 pr-4 flex gap-3 overflow-x-auto pb-1 scroll-fade-x"
        style={{ scrollbarWidth: "none" }}
      >
        {guys.map((guy) => (
          <GuyCard key={guy.id} guy={guy} username={username} personal={mode === "personal"} />
        ))}
      </div>
    </div>
  );
}
