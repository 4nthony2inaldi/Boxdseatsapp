import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BoxdSeats",
  description: "Your sports identity platform — log, track, and share your live event experiences.",
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
