"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type CameraCaptureProps = {
  onCapture: (blob: Blob) => void;
  onClose: () => void;
};

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [starting, setStarting] = useState(true);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    setStarting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStarting(false);
    } catch (err) {
      setStarting(false);
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setError("Camera access denied. Please allow camera access in your browser settings.");
      } else if (err instanceof DOMException && err.name === "NotFoundError") {
        setError("No camera found on this device.");
      } else {
        setError("Could not start camera. Please try again.");
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCaptured(dataUrl);

    // Stop camera while reviewing
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const handleRetake = () => {
    setCaptured(null);
    startCamera(facingMode);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(blob);
        }
      },
      "image/jpeg",
      0.9
    );
  };

  const handleFlipCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    setCaptured(null);
    startCamera(next);
  };

  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#C83C2C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <p className="text-white text-center mt-4 text-sm">{error}</p>
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2.5 bg-bg-elevated rounded-lg text-white text-sm cursor-pointer border border-border"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        {captured ? (
          <img
            src={captured}
            alt="Captured"
            className="w-full h-full object-contain"
          />
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70">
                <div className="text-white text-sm">Starting camera...</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="bg-black py-6 px-4">
        {captured ? (
          // Review mode: Retake / Confirm
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={handleRetake}
              className="flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              <div className="w-14 h-14 rounded-full border-2 border-white/30 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </div>
              <span className="text-white text-[11px]">Retake</span>
            </button>

            <button
              onClick={handleConfirm}
              className="flex flex-col items-center gap-1 cursor-pointer bg-transparent border-none"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #D4872C, #7B5B3A)" }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <span className="text-white text-[11px]">Use Photo</span>
            </button>
          </div>
        ) : (
          // Capture mode: Close / Shutter / Flip
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center cursor-pointer bg-transparent border-none"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Shutter button */}
            <button
              onClick={handleCapture}
              disabled={starting}
              className="cursor-pointer bg-transparent border-none p-0 disabled:opacity-50"
            >
              <div className="w-[72px] h-[72px] rounded-full border-4 border-white p-1">
                <div className="w-full h-full rounded-full bg-white" />
              </div>
            </button>

            {/* Flip camera */}
            <button
              onClick={handleFlipCamera}
              className="w-12 h-12 flex items-center justify-center cursor-pointer bg-transparent border-none"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
