"use client";

import { useState, useCallback, useEffect } from "react";
import Cropper, { type Area } from "react-easy-crop";

type PhotoCropperProps = {
  /** Object URL of the source image */
  imageUrl: string;
  onApply: (cropped: Blob) => void;
  /** Keep the uncropped original */
  onSkip: () => void;
  onCancel: () => void;
  /** Crop frame ratio. Default 16:9, matching timeline/event cards. */
  aspect?: number;
  /** "round" shows a circular frame (avatars); output is still a square JPEG. */
  cropShape?: "rect" | "round";
};

const DEFAULT_ASPECT = 16 / 9;

async function cropToBlob(imageUrl: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = document.createElement("img");
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Failed to load image"));
    el.src = imageUrl;
  });

  // Cap output width to keep uploads small (matches resizePhoto's budget)
  const outWidth = Math.min(area.width, 1600);
  const outHeight = Math.round(outWidth * (area.height / area.width));

  const canvas = document.createElement("canvas");
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    outWidth,
    outHeight
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/jpeg",
      0.88
    );
  });
}

export default function PhotoCropper({
  imageUrl,
  onApply,
  onSkip,
  onCancel,
  aspect = DEFAULT_ASPECT,
  cropShape = "rect",
}: PhotoCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  // Escape behaves like Cancel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const handleApply = async () => {
    if (!areaPixels || working) return;
    setWorking(true);
    setError(null);
    try {
      const blob = await cropToBlob(imageUrl, areaPixels);
      onApply(blob);
    } catch {
      setError("Couldn't crop the photo. You can use the full photo instead.");
      setWorking(false);
    }
  };

  return (
    // h-dvh (not inset-0) so the footer stays above mobile Safari's toolbar;
    // z-[60] so the z-50 bottom nav can't cover the Apply button
    <div
      className="fixed inset-x-0 top-0 h-dvh z-[60] bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Adjust crop"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onCancel}
          className="text-sm text-white/70 hover:text-white bg-transparent border-none cursor-pointer"
        >
          Cancel
        </button>
        <span className="font-display text-sm text-white tracking-[1.5px] uppercase">
          Adjust Crop
        </span>
        <button
          onClick={onSkip}
          className="text-sm text-white/70 hover:text-white bg-transparent border-none cursor-pointer"
        >
          Use full photo
        </button>
      </div>

      {/* Crop area — drag to position, pinch or slide to zoom */}
      <div className="relative flex-1">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          showGrid={cropShape === "rect"}
        />
      </div>

      {/* Controls */}
      <div className="px-6 pt-4 pb-[max(env(safe-area-inset-bottom),1rem)] shrink-0 space-y-4">
        <div className="flex items-center gap-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <input
            type="range"
            min={1}
            max={4}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-[#D4872C]"
            aria-label="Zoom"
          />
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        <button
          onClick={handleApply}
          disabled={working || !areaPixels}
          className="w-full py-3.5 rounded-xl text-white font-display text-lg tracking-[2px] cursor-pointer border-none disabled:opacity-50"
          style={{
            background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-brown))",
          }}
        >
          {working ? "CROPPING..." : "APPLY CROP"}
        </button>
      </div>
    </div>
  );
}
