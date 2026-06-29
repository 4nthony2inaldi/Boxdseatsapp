"use client";

import { useEffect, useRef, useState } from "react";
import type { MapBubble } from "@/lib/passportMap";

const MAX_SCALE = 8;
const TAP_SLOP = 6; // px of movement still counted as a tap, not a drag

type View = { scale: number; tx: number; ty: number };

/**
 * Pan/zoom wrapper around the pre-projected passport map. The land path and
 * bubble coordinates are computed server-side (in PassportMap) so d3-geo and the
 * world atlas never ship to the client — this component only applies a
 * translate+scale transform driven by pinch / wheel / drag.
 *
 * The land outline lives inside the scaled <g>; bubbles are drawn as an overlay
 * with positions computed from the same transform but constant radius, so they
 * stay pin-sized (and tappable) as you zoom in to separate clustered venues
 * rather than ballooning into blobs.
 */
export default function PassportMapInteractive({
  landPath,
  bubbles,
  w,
  h,
  fill = false,
}: {
  landPath: string;
  bubbles: MapBubble[];
  w: number;
  h: number;
  fill?: boolean;
}) {
  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;

  const svgRef = useRef<SVGSVGElement | null>(null);
  // Active pointers (id -> last client position), for pinch + pan.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchPrevDist = useRef<number | null>(null);
  const gestureStart = useRef<{ x: number; y: number } | null>(null);
  // Set true once a gesture moves past the tap slop, so the trailing click on a
  // bubble link is suppressed (a pan/pinch shouldn't navigate).
  const dragged = useRef(false);

  function clamp(v: View): View {
    const scale = Math.min(MAX_SCALE, Math.max(1, v.scale));
    // Keep the map filling the frame: never pan past an edge.
    const tx = Math.min(0, Math.max(w * (1 - scale), v.tx));
    const ty = Math.min(0, Math.max(h * (1 - scale), v.ty));
    return { scale, tx, ty };
  }

  /** Screen px -> viewBox unit scale factors (separate axes for fill/slice). */
  function unitScale() {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { sx: 1, sy: 1, rect: null };
    return { sx: w / rect.width, sy: h / rect.height, rect };
  }

  /** Zoom by `factor` around a focal client point, keeping it fixed on screen. */
  function zoomAround(clientX: number, clientY: number, factor: number) {
    const { sx, sy, rect } = unitScale();
    if (!rect) return;
    const cur = viewRef.current;
    const focalX = (clientX - rect.left) * sx;
    const focalY = (clientY - rect.top) * sy;
    const newScale = Math.min(MAX_SCALE, Math.max(1, cur.scale * factor));
    // Content point under the focal stays put: t = focal - newScale * pContent.
    const px = (focalX - cur.tx) / cur.scale;
    const py = (focalY - cur.ty) / cur.scale;
    setView(clamp({ scale: newScale, tx: focalX - newScale * px, ty: focalY - newScale * py }));
  }

  // Wheel must be a non-passive listener to preventDefault (page-scroll hijack).
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAround(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    (e.currentTarget as SVGSVGElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gestureStart.current = { x: e.clientX, y: e.clientY };
    dragged.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchPrevDist.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    const prev = pointers.current.get(e.pointerId)!;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const { sx, sy, rect } = unitScale();
    if (!rect) return;

    if (gestureStart.current) {
      const moved = Math.hypot(e.clientX - gestureStart.current.x, e.clientY - gestureStart.current.y);
      if (moved > TAP_SLOP) dragged.current = true;
    }

    if (pointers.current.size >= 2) {
      // Pinch: scale around the two-finger midpoint.
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;
      if (pinchPrevDist.current) {
        dragged.current = true;
        const cur = viewRef.current;
        const focalX = (midX - rect.left) * sx;
        const focalY = (midY - rect.top) * sy;
        const newScale = Math.min(MAX_SCALE, Math.max(1, cur.scale * (dist / pinchPrevDist.current)));
        const px = (focalX - cur.tx) / cur.scale;
        const py = (focalY - cur.ty) / cur.scale;
        setView(clamp({ scale: newScale, tx: focalX - newScale * px, ty: focalY - newScale * py }));
      }
      pinchPrevDist.current = dist;
      return;
    }

    // Single-pointer pan.
    const cur = viewRef.current;
    setView(clamp({ scale: cur.scale, tx: cur.tx + (e.clientX - prev.x) * sx, ty: cur.ty + (e.clientY - prev.y) * sy }));
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchPrevDist.current = null;
  }

  const { scale, tx, ty } = view;

  return (
    <div className={`relative rounded-2xl border border-border bg-bg-card overflow-hidden ${fill ? "h-full" : ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={fill ? "100%" : undefined}
        preserveAspectRatio={fill ? "xMidYMid slice" : undefined}
        className={`block ${fill ? "w-full h-full" : ""}`}
        style={{ background: "#0F1620", touchAction: "none", cursor: scale > 1 ? "grab" : "default" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <g transform={`translate(${tx} ${ty}) scale(${scale})`}>
          <path d={landPath} fill="#1C2530" stroke="#2A3340" strokeWidth={0.5} vectorEffect="non-scaling-stroke" />
        </g>
        {/* Bubbles overlaid at constant size so they decluster instead of
            ballooning. Positions follow the same transform as the land. */}
        {bubbles.map((b) => (
          <a
            key={b.id}
            href={`/venue/${b.id}`}
            aria-label={b.name}
            style={{ cursor: "pointer" }}
            onClick={(e) => {
              if (dragged.current) e.preventDefault();
            }}
          >
            <circle
              cx={tx + scale * b.cx}
              cy={ty + scale * b.cy}
              r={b.r}
              fill={b.fill}
              fillOpacity={0.55}
              stroke={b.fill}
              strokeWidth={1}
            />
          </a>
        ))}
      </svg>

      {scale > 1 && (
        <button
          type="button"
          onClick={() => setView({ scale: 1, tx: 0, ty: 0 })}
          className="absolute top-2 right-2 rounded-lg bg-black/55 backdrop-blur-sm border border-white/15 px-2.5 py-1 text-xs text-white/90 hover:bg-black/70 transition-colors"
          aria-label="Reset map zoom"
        >
          Reset
        </button>
      )}
    </div>
  );
}
