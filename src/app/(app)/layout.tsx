import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import RouteScrollTop from "@/components/RouteScrollTop";
import Toaster from "@/components/Toaster";
import PushRegistrar from "@/components/native/PushRegistrar";
import PushOptIn from "@/components/native/PushOptIn";
import AppPromoBanner from "@/components/AppPromoBanner";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <RouteScrollTop />
      <AppHeader />
      <AppPromoBanner />
      <main className="flex-1 pb-28">{children}</main>
      <BottomNav />
      <Toaster />
      <PushRegistrar />
      <PushOptIn />
    </div>
  );
}

