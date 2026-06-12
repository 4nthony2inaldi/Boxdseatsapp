"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ActivityMonth } from "@/lib/queries/profile";
import SectionLabel from "./SectionLabel";

type ActivityChartProps = {
  months: ActivityMonth[];
  total: number;
  /** Own profile: bar taps open that month on /timeline */
  linkToTimeline?: boolean;
};

const BAR_PX = 30; // per-bar footprint (width + gap) used for window math

export default function ActivityChart({ months, total, linkToTimeline = false }: ActivityChartProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Y-axis normalizes to the max within the visible window
  const [winMax, setWinMax] = useState(1);
  // Year(s) currently in view, shown as a floating indicator
  const [winYears, setWinYears] = useState("");

  const recompute = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const first = Math.max(0, Math.floor(el.scrollLeft / BAR_PX));
    const visible = Math.ceil(el.clientWidth / BAR_PX) + 1;
    const slice = months.slice(first, first + visible);
    if (slice.length) {
      const y1 = slice[0].year;
      const y2 = slice[slice.length - 1].year;
      setWinYears(y1 === y2 ? String(y1) : `${y1}–${y2}`);
    }
    setWinMax(Math.max(1, ...slice.map((m) => m.count)));
  }, [months]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth; // start at the present
    // defer the first window computation out of the effect body
    const id = requestAnimationFrame(recompute);
    return () => cancelAnimationFrame(id);
  }, [recompute]);

  const raf = useRef(0);
  function onScroll() {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(recompute);
  }

  return (
    <div className="px-4 mb-5">
      <div className="flex justify-between items-center mb-2.5">
        <SectionLabel>Activity</SectionLabel>
        <div className="text-[11px] text-text-secondary">
          {total} {total === 1 ? "event" : "events"} all time
        </div>
      </div>
      <div className="bg-bg-card rounded-xl border border-border px-3 pt-3.5 pb-2 relative">
        {winYears && (
          <div className="absolute top-2 right-3 font-display text-[10px] text-text-muted tracking-[1.5px]">
            {winYears}
          </div>
        )}
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="flex items-end gap-1.5 h-24 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {months.map((m, i) => {
            const isCurrentMonth = i === months.length - 1;
            const barHeight = m.count > 0 ? `${Math.max(4, (m.count / winMax) * 50)}px` : "4px";

            const bar = (
              <>
                <div className="text-[10px] text-text-muted font-display h-3.5">
                  {m.count > 0 ? m.count : ""}
                </div>
                <div
                  className="w-full rounded-sm min-h-1 transition-[height] duration-200"
                  style={{
                    height: barHeight,
                    background: isCurrentMonth
                      ? "var(--color-accent)"
                      : "linear-gradient(180deg, rgba(212, 135, 44, 0.53), rgba(123, 91, 58, 0.53))",
                  }}
                />
                <div className="text-[8px] text-text-muted font-display tracking-wider uppercase">
                  {m.month}
                </div>
              </>
            );

            if (!linkToTimeline || m.count === 0) {
              return (
                <div key={m.ym} className="w-[24px] shrink-0 flex flex-col items-center gap-1">
                  {bar}
                </div>
              );
            }
            return (
              <button
                key={m.ym}
                onClick={() => router.push(`/timeline?month=${m.ym}`)}
                className="w-[24px] shrink-0 flex flex-col items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                aria-label={`View ${m.month} ${m.year} events`}
              >
                {bar}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
