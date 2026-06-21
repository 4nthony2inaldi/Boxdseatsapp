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
  // Baseline security headers for every response. Deliberately conservative:
  // no Content-Security-Policy or Permissions-Policy, since the iOS Capacitor
  // shell loads this site in a WKWebView and the in-app camera uses getUserMedia
  // — a strict policy there risks breaking the app. These three are safe.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
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
