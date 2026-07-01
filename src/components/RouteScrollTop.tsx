"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Layout-level scroll reset: sends the window to the top on every route change,
 * so a new page never opens partway down (Next's built-in scroll reset is
 * unreliable for streamed pages with a loading.tsx). Placed once in the app
 * layout, it replaces the per-page ScrollToTop sprinkling.
 *
 * Runs in rAF so it wins any late scroll restoration on the same frame. Skips
 * when the URL carries a hash so in-page anchor targets still win.
 */
export default function RouteScrollTop() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined" || window.location.hash) return;
    const id = requestAnimationFrame(() => window.scrollTo(0, 0));
    return () => cancelAnimationFrame(id);
  }, [pathname]);
  return null;
}
