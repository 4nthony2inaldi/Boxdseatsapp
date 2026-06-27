import type { Metadata, Viewport } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import "./globals.css";
import DeepLinkHandler from "@/components/native/DeepLinkHandler";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-next",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-body-next",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.boxdseats.com"
  ),
  title: {
    default: "BoxdSeats",
    template: "%s | BoxdSeats",
  },
  description:
    "Your sports identity platform — log, track, and share your live event experiences.",
  applicationName: "BoxdSeats",
  appleWebApp: {
    capable: true,
    title: "BoxdSeats",
    statusBarStyle: "black-translucent",
  },
  // Smart App Banner: iOS Safari shows a native "BoxdSeats — Open / Get" bar.
  // "Open" launches the app when installed; otherwise it links to the App Store.
  // Ignored inside the app's own webview, so it only appears to web visitors.
  itunes: {
    appId: "6781299327",
  },
  openGraph: {
    type: "website",
    siteName: "BoxdSeats",
    title: "BoxdSeats",
    description:
      "Your sports identity platform — log, track, and share your live event experiences.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "BoxdSeats",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BoxdSeats",
    description:
      "Your sports identity platform — log, track, and share your live event experiences.",
    images: ["/opengraph-image"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow pinch-zoom (WCAG 1.4.4 / App Store accessibility). The 16px input
  // font rule already prevents iOS focus-zoom, so no need to lock scaling.
  viewportFit: "cover",
  themeColor: "#0D0F14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body className="antialiased">
        <DeepLinkHandler />
        {children}
      </body>
    </html>
  );
}
