import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />
      <main className="flex-1 pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
