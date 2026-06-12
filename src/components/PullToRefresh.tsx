"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Minimal pull-to-refresh for server-rendered pages: drag down from the top
 * of the page past the threshold to re-fetch via router.refresh().
 */
export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const THRESHOLD = 70;

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY <= 0 && !refreshing) startY.current = e.touches[0].clientY;
    else startY.current = null;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy * 0.4, 90));
    else setPull(0);
  }

  function onTouchEnd() {
    if (pull >= THRESHOLD * 0.4 * 1) {
      setRefreshing(true);
      router.refresh();
      // router.refresh() has no completion signal; settle after a beat
      setTimeout(() => {
        setRefreshing(false);
        setPull(0);
      }, 1200);
    } else {
      setPull(0);
    }
    startY.current = null;
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex justify-center overflow-hidden transition-[height]"
        style={{ height: refreshing ? 40 : pull }}
      >
        <div
          className={`mt-2 w-5 h-5 border-2 border-accent border-t-transparent rounded-full ${
            refreshing ? "animate-spin" : ""
          }`}
          style={{ opacity: refreshing ? 1 : Math.min(pull / 28, 1), transform: `rotate(${pull * 4}deg)` }}
        />
      </div>
      {children}
    </div>
  );
}
