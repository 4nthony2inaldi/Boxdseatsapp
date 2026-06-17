"use client";

import { useState } from "react";
import Image from "next/image";
import ImageLightbox from "@/components/ImageLightbox";

type AvatarButtonProps = {
  src: string;
  alt: string;
  size: number;
};

/** Profile avatar that expands to a full-screen view when tapped. */
export default function AvatarButton({ src, alt, size }: AvatarButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="View profile photo"
        className="block h-full w-full cursor-zoom-in"
      >
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      </button>
      {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}
