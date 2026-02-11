"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { togglePhotoLike, type GalleryPhoto } from "@/lib/queries/event";
import VerifiedBadge from "@/components/VerifiedBadge";

type EventGalleryProps = {
  photos: GalleryPhoto[];
  currentUserId: string;
};

export default function EventGallery({ photos: initialPhotos, currentUserId }: EventGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);

  const handleLike = async (eventLogId: string) => {
    const photo = photos.find((p) => p.event_log_id === eventLogId);
    if (!photo) return;

    const wasLiked = photo.liked_by_me;

    // Optimistic update
    setPhotos((prev) =>
      prev.map((p) =>
        p.event_log_id === eventLogId
          ? {
              ...p,
              liked_by_me: !wasLiked,
              photo_like_count: wasLiked
                ? p.photo_like_count - 1
                : p.photo_like_count + 1,
            }
          : p
      )
    );

    const supabase = createClient();
    const result = await togglePhotoLike(supabase, currentUserId, eventLogId, wasLiked);

    if ("error" in result) {
      // Revert on error
      setPhotos((prev) =>
        prev.map((p) =>
          p.event_log_id === eventLogId
            ? {
                ...p,
                liked_by_me: wasLiked,
                photo_like_count: wasLiked
                  ? p.photo_like_count + 1
                  : p.photo_like_count - 1,
              }
            : p
        )
      );
    }
  };

  if (photos.length === 0) return null;

  return (
    <div className="space-y-3">
      {photos.map((photo) => (
        <div
          key={photo.event_log_id}
          className={`bg-bg-card rounded-xl border overflow-hidden ${
            photo.photo_is_verified
              ? "border-accent/30"
              : "border-border"
          }`}
        >
          {/* Photo image */}
          <div className="relative">
            <img
              src={photo.photo_url}
              alt={`Photo by ${photo.username}`}
              className="w-full h-[240px] object-cover"
            />
            {photo.photo_is_verified && (
              <div className="absolute top-2 left-2">
                <VerifiedBadge size="sm" />
              </div>
            )}
          </div>

          {/* Photo info */}
          <div className="px-3.5 py-2.5">
            <div className="flex items-center justify-between">
              {/* Photographer info */}
              <Link
                href={`/user/${photo.username}`}
                className="flex items-center gap-2 min-w-0"
              >
                <div className="w-6 h-6 rounded-full shrink-0 overflow-hidden">
                  {photo.avatar_url ? (
                    <img
                      src={photo.avatar_url}
                      alt={photo.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent text-[10px] font-display">
                      {(photo.display_name || photo.username || "?")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-xs text-text-secondary truncate">
                  @{photo.username}
                </span>
              </Link>

              {/* Like button */}
              <button
                onClick={() => handleLike(photo.event_log_id)}
                className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-1"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill={photo.liked_by_me ? "#F87171" : "transparent"}
                  stroke={photo.liked_by_me ? "#F87171" : "#5A5F72"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <span
                  className={`text-xs ${
                    photo.liked_by_me ? "text-red-400" : "text-text-muted"
                  }`}
                >
                  {photo.photo_like_count}
                </span>
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
