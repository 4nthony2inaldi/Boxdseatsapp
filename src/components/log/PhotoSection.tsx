"use client";

/* eslint-disable @next/next/no-img-element -- next/image cannot optimize blob: URLs / OG ImageResponse markup */
import { useState, useRef } from "react";
import CameraCapture from "./CameraCapture";
import PhotoCropper from "@/components/PhotoCropper";

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
  // Uncropped source kept around so the crop can be re-adjusted
  const [original, setOriginal] = useState<{
    file: File | Blob;
    previewUrl: string;
    captureMethod: "camera" | "upload";
    capturedAt: string;
  } | null>(null);
  const [cropping, setCropping] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = (blob: Blob) => {
    const previewUrl = URL.createObjectURL(blob);
    setOriginal({
      file: blob,
      previewUrl,
      captureMethod: "camera",
      capturedAt: new Date().toISOString(),
    });
    setShowCamera(false);
    setCropping(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setOriginal({
      file,
      previewUrl,
      captureMethod: "upload",
      capturedAt: new Date().toISOString(),
    });
    setShowModeSelector(false);
    setCropping(true);
    // allow re-selecting the same file later
    e.target.value = "";
  };

  const handleCropApply = (cropped: Blob) => {
    if (!original) return;
    if (photo?.previewUrl && photo.previewUrl !== original.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    onPhotoChange({
      file: cropped,
      previewUrl: URL.createObjectURL(cropped),
      captureMethod: original.captureMethod,
      capturedAt: original.capturedAt,
    });
    setCropping(false);
  };

  const handleCropSkip = () => {
    if (!original) return;
    if (photo?.previewUrl && photo.previewUrl !== original.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    onPhotoChange({ ...original });
    setCropping(false);
  };

  const handleCropCancel = () => {
    // First-time crop cancelled and no photo yet: discard the selection
    if (!photo && original) {
      URL.revokeObjectURL(original.previewUrl);
      setOriginal(null);
    }
    setCropping(false);
  };

  const handleRemovePhoto = () => {
    if (photo?.previewUrl) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    if (original && original.previewUrl !== photo?.previewUrl) {
      URL.revokeObjectURL(original.previewUrl);
    }
    setOriginal(null);
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

  if (cropping && original) {
    return (
      <PhotoCropper
        imageUrl={original.previewUrl}
        onApply={handleCropApply}
        onSkip={handleCropSkip}
        onCancel={handleCropCancel}
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
          <div className="relative rounded-lg overflow-hidden border border-border">
            <img
              src={photo.previewUrl}
              alt="Event photo"
              className="w-full aspect-video object-cover"
            />
            {/* Adjust crop */}
            {original && (
              <button
                onClick={() => setCropping(true)}
                aria-label="Adjust crop"
                className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-semibold backdrop-blur-sm cursor-pointer border-none hover:bg-black/75"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                  <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                </svg>
                Adjust crop
              </button>
            )}
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
            aria-label="Remove photo"
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
            aria-label="Take photo with camera"
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border-2 border-dashed border-accent/40 bg-accent/5 cursor-pointer hover:border-accent/60 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="text-xs text-accent font-semibold">Camera</span>
            <span className="text-[10px] text-accent/70">Eligible for verified</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload photo from camera roll"
            className="flex-1 flex flex-col items-center gap-2 py-4 rounded-lg border-2 border-dashed border-border cursor-pointer hover:border-accent/30 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-xs text-text-secondary font-semibold">Upload</span>
            <span className="text-[10px] text-text-muted">From camera roll</span>
          </button>

          <button
            onClick={() => setShowModeSelector(false)}
            aria-label="Cancel"
            className="absolute -mt-7 right-0 text-[11px] text-text-muted cursor-pointer bg-transparent border-none hover:text-text-secondary"
          >
            Cancel
          </button>
        </div>
      ) : (
        // Empty state: Add photo button
        <button
          onClick={handleAddPhoto}
          aria-label="Add photo"
          className="w-full h-[100px] rounded-lg border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent/30 transition-colors bg-transparent"
        >
          <div className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
