import type { Metadata, Viewport } from "next";
import { Bebas_Neue, DM_Sans } from "next/font/google";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
