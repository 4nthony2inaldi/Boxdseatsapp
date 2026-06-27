"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Profile bio clamped to two lines with an inline "more" that sits right after
 * the ellipsis (so it never spills onto a third line). CSS line-clamp can't put
 * a button after its auto-ellipsis, so we measure the longest prefix that fits
 * two lines alongside "… more" and render that. "less" collapses it again.
 */
export default function ProfileBio({ bio }: { bio: string }) {
  const measureRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const compute = () => {
      if (!el.clientWidth) return;
      el.textContent = "M";
      const maxH = el.clientHeight * 2 + 1; // two lines
      el.textContent = bio;
      if (el.clientHeight <= maxH) {
        setTruncated(null);
        setReady(true);
        return;
      }
      // Largest prefix that still fits two lines once "… more" is appended.
      let lo = 0;
      let hi = bio.length;
      let best = 0;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        el.textContent = bio.slice(0, mid).trimEnd() + "… more";
        if (el.clientHeight <= maxH) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      setTruncated(bio.slice(0, best).trimEnd());
      setReady(true);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, [bio]);

  const showTruncated = ready && truncated !== null && !expanded;

  return (
    <div className="relative flex-1 min-w-0">
      {/* Hidden measurer — same width and typography as the visible bio. */}
      <div
        ref={measureRef}
        aria-hidden
        className="absolute inset-x-0 invisible text-xs leading-relaxed"
        style={{ pointerEvents: "none" }}
      />
      <p className={`text-xs text-text-secondary leading-relaxed ${!ready && !expanded ? "line-clamp-2" : ""}`}>
        {showTruncated ? (
          <>
            {truncated}…{" "}
            <button onClick={() => setExpanded(true)} className="text-accent active:opacity-70">
              more
            </button>
          </>
        ) : (
          <>
            {bio}
            {ready && truncated !== null && expanded && (
              <>
                {" "}
                <button onClick={() => setExpanded(false)} className="text-accent active:opacity-70">
                  less
                </button>
              </>
            )}
          </>
        )}
      </p>
    </div>
  );
}
