"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * On the owner's own profile, backfill headshots for any favorited athletes that
 * are still missing one (chosen before lazy-fetch existed). Fire-and-forget; if
 * it filled any in, refresh so the new photos appear without a manual reload.
 */
export default function HeadshotBackfill() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // once per mount
    ran.current = true;
    let active = true;
    fetch("/api/headshot-backfill", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active && d && d.updated > 0) router.refresh();
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  return null;
}
