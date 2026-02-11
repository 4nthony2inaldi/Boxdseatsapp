import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://boxdseats.com"
  ),
  title: {
    default: "BoxdSeats",
    template: "%s | BoxdSeats",
  },
  description:
    "Your sports identity platform — log, track, and share your live event experiences.",
  applicationName: "BoxdSeats",
  openGraph: {
    type: "website",
    siteName: "BoxdSeats",
    title: "BoxdSeats",
    description:
      "Your sports identity platform — log, track, and share your live event experiences.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BoxdSeats",
    description:
      "Your sports identity platform — log, track, and share your live event experiences.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0D0F14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
