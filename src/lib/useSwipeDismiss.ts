import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Swipe-down-to-dismiss for bottom sheets. Spread `handleProps` onto the drag
 * area (the grabber/header), apply `offset` as a translateY, and disable the
 * transition while `dragging` so the sheet tracks the finger. If the user drags
 * past the threshold and releases, `onDismiss` fires; otherwise it snaps back.
 *
 * The grabber handle is a universal "drag me down" affordance, so any sheet that
 * shows one should actually be swipe-dismissable.
 */
export function useSwipeDismiss(onDismiss: () => void, threshold = 90) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);

  const onPointerDown = (e: ReactPointerEvent) => {
    startY.current = e.clientY;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (startY.current == null) return;
    const dy = e.clientY - startY.current;
    setOffset(dy > 0 ? dy : 0); // downward only
  };
  const end = () => {
    if (startY.current == null) return;
    const dy = offset;
    startY.current = null;
    setDragging(false);
    setOffset(0);
    if (dy > threshold) onDismiss();
  };

  return {
    offset,
    dragging,
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
      // Keep the drag from also scrolling/refreshing the page.
      style: { touchAction: "none" as const },
    },
  };
}
