"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { uploadAvatar, validateImageFile } from "@/lib/avatar";

type AvatarUploadProps = {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string | null;
  username: string;
  size?: number; // px, default 80
  onUploadComplete?: (newUrl: string) => void;
};

export default function AvatarUpload({
  userId,
  currentAvatarUrl,
  displayName,
  username,
  size = 80,
  onUploadComplete,
}: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState(currentAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initial = (displayName || username || "?").charAt(0).toUpperCase();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Quick client-side validation
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const result = await uploadAvatar(supabase, userId, file);

    setUploading(false);

    if ("error" in result) {
      setError(result.error);
    } else {
      setAvatarUrl(result.url);
      onUploadComplete?.(result.url);
    }

    // Reset file input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="relative group cursor-pointer bg-transparent border-none p-0 disabled:cursor-wait"
        type="button"
      >
        <div
          className="rounded-full overflow-hidden border-2 border-border"
          style={{ width: size, height: size }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName || username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(135deg, #D4872C 0%, #7B5B3A 100%)",
              }}
            >
              <span
                className="font-display text-white"
                style={{ fontSize: size * 0.4 }}
              >
                {initial}
              </span>
            </div>
          )}
        </div>

        {/* Upload overlay */}
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ width: size, height: size }}
        >
          {uploading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <p className="text-[11px] text-text-muted text-center mt-2">
        {uploading ? "Uploading..." : "Tap to change photo"}
      </p>

      {error && (
        <p className="text-loss text-xs text-center mt-1">{error}</p>
      )}
    </div>
  );
}
