import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BoxdSeats",
    short_name: "BoxdSeats",
    description:
      "Your sports identity platform — log, track, and share your live event experiences.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0F14",
    theme_color: "#0D0F14",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
