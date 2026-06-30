"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Pull-to-refresh for server-rendered pages: drag down from the top past the
 * threshold to re-fetch via router.refresh().
 *
 * Why the manual (non-React) touch listeners: the gesture has to call
 * preventDefault() on touchmove to stop the browser's own scroll/overscroll
 * bounce from fighting the pull. React attaches touch listeners passively, so
 * preventDefault there is a no-op — hence addEventListener with passive:false.
 *
 * Feel: the content follows the finger 1:1 (no transition while dragging) with
 * a resistance curve so it never runs away; on release it snaps back with a
 * single eased transition. router.refresh() runs inside a transition so the
 * spinner tracks the real server re-render instead of a guessed timeout.
 */
export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [offset, setOffset] = useState(0); // visual pull distance, px
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Refs mirror state for the listeners (attached once) to read without stale
  // closures.
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const refreshingRef = useRef(false);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const MAX = 80; // visual cap
  const TRIGGER = 64; // finger travel that fires a refresh
  const REFRESH_REST = 44; // gap held open while the spinner runs
  // Resisted offset that corresponds to TRIGGER finger travel; the same value
  // gates the visual "ready" state and the release-to-refresh check.
  const TRIGGER_OFFSET = MAX * (1 - Math.exp(-TRIGGER / MAX));
  const ready = offset >= TRIGGER_OFFSET;

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  // Spinner clears once the refresh transition actually settles (not a guess).
  useEffect(() => {
    if (!refreshing || isPending) return;
    if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    const id = requestAnimationFrame(() => {
      setRefreshing(false);
      setDragging(false);
      setOffset(0);
      offsetRef.current = 0;
    });
    return () => cancelAnimationFrame(id);
  }, [refreshing, isPending]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (refreshingRef.current || window.scrollY > 0) {
        startY.current = null;
        return;
      }
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      // Only own the gesture while pulling DOWN and still pinned to the top.
      if (dy <= 0 || window.scrollY > 0) {
        if (offsetRef.current !== 0) {
          setDragging(false);
          setOffset(0);
          offsetRef.current = 0;
        }
        startY.current = null;
        return;
      }
      // Stop native scroll/overscroll-bounce from fighting the pull.
      e.preventDefault();
      // Resistance: asymptotic toward MAX so it tracks the finger early and
      // stiffens as you pull, instead of a hard linear cap.
      const next = MAX * (1 - Math.exp(-dy / MAX));
      setDragging(true);
      setOffset(next);
      offsetRef.current = next;
    };

    const onEnd = () => {
      if (startY.current === null) return;
      startY.current = null;
      if (offsetRef.current >= MAX * (1 - Math.exp(-TRIGGER / MAX))) {
        setDragging(false);
        setRefreshing(true);
        setOffset(REFRESH_REST);
        offsetRef.current = REFRESH_REST;
        startTransition(() => {
          router.refresh();
        });
        // Safety net so an offline / never-settling transition can't pin it.
        if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
        fallbackTimer.current = setTimeout(() => {
          setRefreshing(false);
          setOffset(0);
          offsetRef.current = 0;
        }, 8000);
      } else {
        setDragging(false);
        setOffset(0);
        offsetRef.current = 0;
      }
    };

    // passive:false on move is what lets preventDefault() actually work.
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs/setters; attach once
  }, []);

  const spinnerOpacity = refreshing ? 1 : Math.min(offset / REFRESH_REST, 1);
  const spinnerScale = refreshing ? 1 : 0.6 + 0.4 * Math.min(offset / TRIGGER, 1);
  const snap = "transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div ref={containerRef} className="relative" style={{ overscrollBehaviorY: "contain" }}>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex justify-center"
        style={{
          transform: `translateY(${offset - REFRESH_REST}px)`,
          transition: dragging ? "none" : snap,
          opacity: spinnerOpacity,
        }}
      >
        <div
          className={`mt-2 h-5 w-5 rounded-full border-2 border-accent border-t-transparent ${
            refreshing ? "animate-spin" : ""
          }`}
          style={{
            transform: refreshing
              ? undefined
              : `rotate(${offset * 3}deg) scale(${spinnerScale})`,
            opacity: ready || refreshing ? 1 : 0.7,
          }}
        />
      </div>
      <div
        style={{
          // Only apply a transform while actually pulling/refreshing. At rest
          // it's `none`, so we never establish a containing block that could
          // re-anchor a sticky/fixed descendant (the feed's pinned strip).
          transform: offset > 0 || refreshing ? `translateY(${offset}px)` : undefined,
          transition: dragging ? "none" : snap,
          willChange: dragging || refreshing ? "transform" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
