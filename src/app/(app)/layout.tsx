import type { Metadata } from "next";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import Toaster from "@/components/Toaster";
import PushRegistrar from "@/components/native/PushRegistrar";

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
      <AppHeader />
      <main className="flex-1 pb-28">{children}</main>
      <BottomNav />
      <Toaster />
      <PushRegistrar />
    </div>
  );
}

