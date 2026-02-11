"use client";

import { useState, useRef } from "react";
import CameraCapture from "./CameraCapture";

export type PhotoData = {
  file: File | Blob;
  previewUrl: string;
  captureMethod: "camera" | "upload";
  capturedAt: string; // ISO timestamp
};

type PhotoSectionProps = {
  photo: PhotoData | null;
  onPhotoChange: (photo: PhotoData | null) => void;
  allowCamera: boolean; // true only when logging same-day events
};

export default function PhotoSection({
  photo,
  onPhotoChange,
  allowCamera,
}: PhotoSectionProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = (blob: Blob) => {
    const previewUrl = URL.createObjectURL(blob);
    onPhotoChange({
      file: blob,
      previewUrl,
      captureMethod: "camera",
      capturedAt: new Date().toISOString(),
    });
    setShowCamera(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    onPhotoChange({
      file,
      previewUrl,
      captureMethod: "upload",
      capturedAt: new Date().toISOString(),
    });
    setShowModeSelector(false);
  };

  const handleRemovePhoto = () => {
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    onPhotoChange(null);
  };

  const handleAddPhoto = () => {
    if (allowCamera) {
      setShowModeSelector(true);
    } else {
      // Only upload available for historical events
      fileInputRef.current?.click();
    }
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCameraCapture}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  return (
    <div className="mb-5">
      <label className="font-display text-[11px] text-text-muted tracking-[1.2px] uppercase block mb-2">
        Photo
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {photo ? (
        // Photo preview
        <div className="relative">
          <div className="relative rounded-[10px] overflow-hidden border border-border">
            <img
              src={photo.previewUrl}
              alt="Event photo"
              className="w-full h-[200px] object-cover"
            />
            {/* Capture method badge */}
            <div className="absolute top-2 left-2">
              {photo.captureMethod === "camera" ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-accent/80 text-white text-[10px] font-semibold backdrop-blur-sm">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  Camera
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-bg-elevated/80 text-text-secondary text-[10px] font-semibold backdrop-blur-sm">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  Upload
                </span>
              )}
            </div>
          </div>
          {/* Remove button */}
          <button
            onClick={handleRemovePhoto}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center cursor-pointer border-none backdrop-blur-sm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ) : showModeSelector ? (
        // Mode selector: Camera or Upload
        <div className="flex gap-3">
          <button
            onClick={() => setShowCamera(true)}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-[10px] border-2 border-dashed border-accent/40 bg-accent/5 cursor-pointer hover:border-accent/60 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4872C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-xs text-accent font-semibold">Camera</span>
            <span className="text-[9px] text-accent/70">Eligible for verified</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-[10px] border-2 border-dashed border-border cursor-pointer hover:border-accent/30 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5A5F72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-xs text-text-secondary font-semibold">Upload</span>
            <span className="text-[9px] text-text-muted">From camera roll</span>
          </button>

          <button
            onClick={() => setShowModeSelector(false)}
            className="absolute -mt-7 right-0 text-[11px] text-text-muted cursor-pointer bg-transparent border-none hover:text-text-secondary"
          >
            Cancel
          </button>
        </div>
      ) : (
        // Empty state: Add photo button
        <button
          onClick={handleAddPhoto}
          className="w-full h-[100px] rounded-[10px] border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent/30 transition-colors bg-transparent"
        >
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F72" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-[13px] text-text-muted">+ Add photo</span>
          </div>
        </button>
      )}
    </div>
  );
}
