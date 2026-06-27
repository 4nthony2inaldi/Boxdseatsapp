"use client";

import { useEffect } from "react";

/**
 * Forces the window to the top when this mounts. Next's App Router scroll reset
 * is unreliable for streamed pages with a loading.tsx — navigating to a profile
 * from a scrolled feed could land partway down. Dropping this at the top of the
 * page guarantees it opens at the top. Runs in rAF so it wins any late scroll
 * restoration on the same frame.
 */
export default function ScrollToTop() {
  useEffect(() => {
    const id = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(id);
  }, []);
  return null;
}
