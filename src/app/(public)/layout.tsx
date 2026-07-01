import Link from "next/link";
import { LogoWithWordmark } from "@/components/Logo";
import GetAppBar from "@/components/GetAppBar";
import RouteScrollTop from "@/components/RouteScrollTop";
import { createClient } from "@/lib/supabase/server";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public pages (shared profiles, /@user, /e/id, fan passport) also render
  // inside the native app for logged-in users. Match AppHeader (sticky, same
  // logo size, safe-area inset) and drop the Log in / Sign up CTA when there's
  // a session — it only makes sense for logged-out visitors.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <RouteScrollTop />
      {/* Pinned together: the get-the-app bar sits above the brand header so a
          shared link always leads with a way into the app. The background +
          safe-area padding live on the wrapper so the status-bar/notch strip is
          opaque and scrolled content can't bleed through it. */}
      <div
        className="sticky top-0 z-50 bg-bg/95 backdrop-blur-sm"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <GetAppBar />
        <header className="border-b border-border">
          <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
            <Link href="/" aria-label="BoxdSeats home" className="flex items-center">
              <LogoWithWordmark size={36} />
            </Link>
            {!user && (
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/login"
                  className="px-3 py-1.5 rounded-lg text-text-secondary hover:text-text-primary transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-1.5 rounded-lg bg-accent text-bg font-display tracking-wider uppercase text-xs hover:opacity-90 transition-opacity"
                >
                  Sign up
                </Link>
              </nav>
            )}
          </div>
        </header>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
