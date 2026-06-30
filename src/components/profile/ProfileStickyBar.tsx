"use client";

/* eslint-disable @next/next/no-img-element -- small avatar with initial fallback */
import { useEffect, useRef, useState } from "react";

/**
 * Condensed, sticky profile bar: a shrunk avatar + the four KPIs that pins
 * beneath the AppHeader once you scroll past the full profile header.
 *
 * Driven by an IntersectionObserver on a sentinel placed right after the
 * expanded header (no per-frame scroll listener). The bar is position:fixed so
 * it reserves no layout space and never shifts the page; it sits just below the
 * AppHeader (whose height we measure at runtime, with a safe-area fallback) and
 * one z-layer under it.
 */

type Stat = { value: number; label: string };

export default function ProfileStickyBar({
  avatarUrl,
  initial,
  stats,
}: {
  avatarUrl: string | null;
  initial: string;
  stats: Stat[];
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);
  const [topPx, setTopPx] = useState<number | null>(null);

  // Pin flush under the sticky top chrome. That chrome differs by layout: in the
  // app it's the <header> itself; on public pages it's an outer sticky <div>
  // (get-app bar + header + safe area). So walk up from <header> to the nearest
  // sticky/fixed ancestor and use its bottom edge — robust to both.
  useEffect(() => {
    const measure = () => {
      let el: HTMLElement | null = document.querySelector("header");
      while (el) {
        const pos = getComputedStyle(el).position;
        if (pos === "sticky" || pos === "fixed") {
          setTopPx(Math.floor(el.getBoundingClientRect().bottom));
          return;
        }
        el = el.parentElement;
      }
      const h = document.querySelector("header")?.getBoundingClientRect().height;
      if (h) setTopPx(Math.floor(h));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Reveal once the sentinel (below the full header) passes under the AppHeader.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { rootMargin: `-${topPx ?? 56}px 0px 0px 0px`, threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [topPx]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      <div
        className="fixed inset-x-0 z-40 pointer-events-none"
        style={{
          // Tuck 16px UNDER the AppHeader (which sits at z-50 and covers the
          // overlap) and pad the content back down to the header's bottom, so a
          // few px of header-height mis-measurement can never leave a gap above.
          top: topPx != null ? `${topPx - 16}px` : "calc(env(safe-area-inset-top) + 40px)",
          opacity: condensed ? 1 : 0,
          transform: condensed ? "translateY(0)" : "translateY(-6px)",
          transition: "opacity 0.18s ease, transform 0.18s ease",
        }}
      >
        <div
          className={`max-w-lg mx-auto pt-4 bg-bg/95 backdrop-blur-sm border-b border-border ${
            condensed ? "pointer-events-auto" : ""
          }`}
        >
          <div className="px-4 h-14 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border shrink-0 bg-bg-elevated flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="font-display text-sm text-text-secondary">{initial}</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 flex-1 min-w-0">
              {stats.map((s) => (
                <div key={s.label} className="text-center leading-none">
                  <div className="font-display text-sm text-text-primary">{s.value}</div>
                  <div className="text-[9px] text-text-muted uppercase tracking-wide mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
