import Link from "next/link";
import { LogoWithWordmark } from "@/components/Logo";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Lightweight header so logged-out visitors on /@user or /e/id
          always have a way into the app. */}
      <header className="border-b border-border bg-bg/90 backdrop-blur-sm">
        <div className="max-w-lg mx-auto flex items-center justify-between px-4 py-3">
          <Link href="/" aria-label="BoxdSeats home" className="flex items-center">
            <LogoWithWordmark size={26} />
          </Link>
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
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
