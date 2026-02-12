"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Calls `onLoadMore` when the sentinel element is near the viewport bottom.
 * Returns a ref to attach to the sentinel element.
 */
export function useInfiniteScroll(
  onLoadMore: () => void,
  { enabled = true, rootMargin = "200px" }: { enabled?: boolean; rootMargin?: string } = {}
) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const callbackRef = useRef(onLoadMore);
  callbackRef.current = onLoadMore;

  const setSentinel = useCallback((node: HTMLDivElement | null) => {
    sentinelRef.current = node;
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callbackRef.current();
        }
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, rootMargin]);

  return setSentinel;
}
