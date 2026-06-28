"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Backfill headshots for a profile's favorited athletes that are still missing
 * one (chosen before lazy-fetch existed). Runs on your own profile (no userId)
 * and when viewing someone else's (their userId) — headshots are global, so
 * filling one helps everyone. Fire-and-forget; refreshes if any filled in.
 */
export default function HeadshotBackfill({ userId }: { userId?: string }) {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // once per mount
    ran.current = true;
    let active = true;
    fetch("/api/headshot-backfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userId ? { userId } : {}),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && d.updated > 0) router.refresh();
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router, userId]);

  return null;
}
