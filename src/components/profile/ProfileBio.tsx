"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Profile bio clamped to two lines with a "more"/"less" toggle. A max-length bio
 * (160 chars) can otherwise run 5-6 lines and push the Big Four / activity down.
 * The "more" affordance only appears when the text actually overflows two lines.
 */
export default function ProfileBio({ bio }: { bio: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measured while clamped: hidden overflow means it needs a "more".
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [bio]);

  return (
    <div className="flex-1 min-w-0">
      <p
        ref={ref}
        className={`text-xs text-text-secondary leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
      >
        {bio}
      </p>
      {(overflows || expanded) && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-accent mt-0.5 active:opacity-70"
        >
          {expanded ? "less" : "more"}
        </button>
      )}
    </div>
  );
}
