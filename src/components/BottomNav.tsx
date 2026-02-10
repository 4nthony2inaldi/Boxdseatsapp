"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Feed", icon: FeedIcon },
  { href: "/explore", label: "Explore", icon: ExploreIcon },
  { href: "/log", label: "Log", icon: LogIcon, isCenter: true },
  { href: "/lists", label: "Lists", icon: ListsIcon },
  { href: "/profile", label: "Profile", icon: ProfileIcon },
];

function FeedIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4872C" : "#5A5F72"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11a9 9 0 0 1 9 9" />
      <path d="M4 4a16 16 0 0 1 16 16" />
      <circle cx="5" cy="19" r="1" fill={active ? "#D4872C" : "#5A5F72"} />
    </svg>
  );
}

function ExploreIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4872C" : "#5A5F72"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function LogIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={active ? "#0D0F14" : "#0D0F14"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ListsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4872C" : "#5A5F72"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "#D4872C" : "#5A5F72"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export default function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-bg-card">
      <div className="flex items-end justify-around px-2 pb-[env(safe-area-inset-bottom)] max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          if (tab.isCenter) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex flex-col items-center -mt-4"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                  style={{
                    background: "linear-gradient(135deg, #D4872C 0%, #E8A44E 100%)",
                    boxShadow: "0 4px 20px rgba(212, 135, 44, 0.4)",
                  }}
                >
                  <Icon active={active} />
                </div>
                <span className="font-display text-[10px] tracking-wider mt-1 text-accent">
                  {tab.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center py-2 px-3"
            >
              <Icon active={active} />
              <span
                className={`font-display text-[10px] tracking-wider mt-1 ${
                  active ? "text-accent" : "text-text-muted"
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
