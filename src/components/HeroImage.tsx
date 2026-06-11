"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Hero image that disappears gracefully if the remote file fails to load,
 * letting whatever sits behind it (gradient) show through instead of
 * browser broken-image chrome.
 */
export default function HeroImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={176}
      quality={75}
      sizes="(max-width: 640px) 100vw, 640px"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
