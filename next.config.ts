import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseHostname = supabaseUrl
  ? new URL(supabaseUrl).hostname
  : "";

const externalImageHosts = [
  // ESPN CDN: team logos and athlete headshots stored on our records
  { protocol: "https" as const, hostname: "a.espncdn.com" },
  // Wikipedia/Wikimedia Commons: venue photography
  { protocol: "https" as const, hostname: "upload.wikimedia.org" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      ...externalImageHosts,
    ],
  },
};

export default nextConfig;
