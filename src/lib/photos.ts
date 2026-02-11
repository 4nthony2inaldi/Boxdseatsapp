import { SupabaseClient } from "@supabase/supabase-js";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 1200;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validate an image file before processing.
 */
export function validatePhotoFile(file: File | Blob): string | null {
  if (file instanceof File && !ACCEPTED_TYPES.includes(file.type)) {
    return "Please upload a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Image must be under 10MB.";
  }
  return null;
}

/**
 * Resize an image to fit within TARGET_WIDTH x TARGET_HEIGHT while preserving aspect ratio.
 * Returns JPEG blob at 85% quality.
 */
export function resizePhoto(source: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let w = img.width;
      let h = img.height;

      // Only downscale, never upscale
      if (w > TARGET_WIDTH || h > TARGET_HEIGHT) {
        const ratio = Math.min(TARGET_WIDTH / w, TARGET_HEIGHT / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create image blob"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(source);
  });
}

/**
 * Upload an event photo to Supabase Storage.
 * Path: event-photos/{userId}/{eventLogId}.jpg
 */
export async function uploadEventPhoto(
  supabase: SupabaseClient,
  userId: string,
  eventLogId: string,
  source: File | Blob
): Promise<{ url: string } | { error: string }> {
  // Validate
  const validationError = validatePhotoFile(source);
  if (validationError) return { error: validationError };

  // Resize
  let blob: Blob;
  try {
    blob = await resizePhoto(source);
  } catch {
    return { error: "Failed to process image. Please try a different file." };
  }

  // Upload
  const filePath = `${userId}/${eventLogId}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("event-photos")
    .upload(filePath, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    return { error: "Failed to upload photo. Please try again." };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("event-photos")
    .getPublicUrl(filePath);

  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  return { url: publicUrl };
}

/**
 * Update event_log with photo data after upload.
 */
export async function updateEventLogPhoto(
  supabase: SupabaseClient,
  eventLogId: string,
  userId: string,
  photoUrl: string,
  captureMethod: "camera" | "upload",
  capturedAt: string, // ISO timestamp
  isVerified: boolean
): Promise<{ success: boolean } | { error: string }> {
  const { error } = await supabase
    .from("event_logs")
    .update({
      photo_url: photoUrl,
      photo_capture_method: captureMethod,
      photo_captured_at: capturedAt,
      photo_is_verified: isVerified,
    })
    .eq("id", eventLogId)
    .eq("user_id", userId);

  if (error) {
    return { error: "Failed to save photo metadata." };
  }

  return { success: true };
}

/**
 * Determine if a photo qualifies as verified.
 * Verified = captured via camera AND within the event window
 * (3 hours before event start through 3 hours after event end).
 *
 * For simplicity, since we don't have exact start/end times for most events,
 * we use: event_date 00:00:00 minus 3 hours through event_date 23:59:59 plus 3 hours.
 * This gives a window from 9 PM the day before to 3 AM two days after.
 */
export function isPhotoVerified(
  captureMethod: "camera" | "upload",
  capturedAt: Date,
  eventDate: string // YYYY-MM-DD
): boolean {
  if (captureMethod !== "camera") return false;

  const eventStart = new Date(eventDate + "T00:00:00");
  const windowStart = new Date(eventStart.getTime() - 3 * 60 * 60 * 1000); // 3 hours before
  const eventEnd = new Date(eventDate + "T23:59:59");
  const windowEnd = new Date(eventEnd.getTime() + 3 * 60 * 60 * 1000); // 3 hours after

  return capturedAt >= windowStart && capturedAt <= windowEnd;
}

/**
 * Check if the selected date is today (for determining camera availability).
 * Camera is only available when logging events on the same day.
 */
export function isToday(dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return dateStr === todayStr;
}
