import { SupabaseClient } from "@supabase/supabase-js";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const TARGET_SIZE = 400; // 400x400px
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/**
 * Validate an image file before processing.
 * Returns an error string if invalid, null if valid.
 */
export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Please upload a JPG, PNG, or WebP image.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Image must be under 5MB.";
  }
  return null;
}

/**
 * Resize and crop an image file to a square (400x400) JPEG.
 * Uses Canvas API for client-side processing.
 * Returns a Blob ready for upload.
 */
export function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Determine crop region (center square)
      const minSide = Math.min(img.width, img.height);
      const sx = (img.width - minSide) / 2;
      const sy = (img.height - minSide) / 2;

      // Create canvas at target size
      const canvas = document.createElement("canvas");
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      // Draw cropped and resized image
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, TARGET_SIZE, TARGET_SIZE);

      // Export as JPEG (good balance of quality/size)
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
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Upload a user's avatar to Supabase Storage and update the profile.
 * Overwrites any existing avatar for the user.
 * Returns the public URL of the uploaded avatar.
 */
export async function uploadAvatar(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<{ url: string } | { error: string }> {
  // Validate
  const validationError = validateImageFile(file);
  if (validationError) return { error: validationError };

  // Resize
  let blob: Blob;
  try {
    blob = await resizeImage(file);
  } catch {
    return { error: "Failed to process image. Please try a different file." };
  }

  // Upload to Supabase Storage
  const filePath = `${userId}/avatar.jpg`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, blob, {
      contentType: "image/jpeg",
      upsert: true, // Overwrite existing
    });

  if (uploadError) {
    return { error: "Failed to upload image. Please try again." };
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  // Append cache-busting param so browser refreshes the image
  const publicUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // Update profile
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId);

  if (updateError) {
    return { error: "Image uploaded but failed to update profile." };
  }

  return { url: publicUrl };
}
